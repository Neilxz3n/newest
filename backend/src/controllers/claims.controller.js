const pool = require('../config/database');
const activityService = require('../services/activity.service');
const notificationService = require('../services/notification.service');
const emailService = require('../services/email.service');

const createClaim = async (req, res) => {
  const client = await pool.connect();
  try {
    const { lost_item_id, found_item_id, proof } = req.body;

    if (!lost_item_id && !found_item_id) {
      return res.status(400).json({ message: 'Either lost_item_id or found_item_id is required.' });
    }

    await client.query('BEGIN');

    const existingClaim = await client.query(
      `SELECT id FROM claims WHERE claimant_id = $1 AND status = 'pending'
       AND (lost_item_id = $2 OR found_item_id = $3)`,
      [req.user.id, lost_item_id || null, found_item_id || null]
    );

    if (existingClaim.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'You already have a pending claim for this item.' });
    }

    const result = await client.query(
      `INSERT INTO claims (claimant_id, lost_item_id, found_item_id, proof)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, lost_item_id || null, found_item_id || null, proof]
    );

    const claim = result.rows[0];
    await activityService.log(req.user.id, 'Submitted a claim', 'claim', claim.id);

    await client.query('COMMIT');

    res.status(201).json({ message: 'Claim submitted successfully', claim });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create claim error:', error);
    res.status(500).json({ message: 'Failed to submit claim.' });
  } finally {
    client.release();
  }
};

const getClaims = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (req.user.role !== 'admin') {
      conditions.push(`c.claimant_id = $${paramIndex++}`);
      params.push(req.user.id);
    }

    if (status) {
      conditions.push(`c.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM claims c ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT c.*, u.full_name as claimant_name, u.email as claimant_email,
              li.item_name as lost_item_name, fi.item_name as found_item_name
       FROM claims c
       LEFT JOIN users u ON c.claimant_id = u.id
       LEFT JOIN lost_items li ON c.lost_item_id = li.id
       LEFT JOIN found_items fi ON c.found_item_id = fi.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    res.json({
      claims: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ message: 'Failed to fetch claims.' });
  }
};

const getClaimById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, u.full_name as claimant_name, u.email as claimant_email,
              li.item_name as lost_item_name, li.description as lost_item_description,
              fi.item_name as found_item_name, fi.description as found_item_description
       FROM claims c
       LEFT JOIN users u ON c.claimant_id = u.id
       LEFT JOIN lost_items li ON c.lost_item_id = li.id
       LEFT JOIN found_items fi ON c.found_item_id = fi.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    const claim = result.rows[0];
    if (req.user.role !== 'admin' && claim.claimant_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(claim);
  } catch (error) {
    console.error('Get claim by id error:', error);
    res.status(500).json({ message: 'Failed to fetch claim.' });
  }
};

const approveClaim = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    await client.query('BEGIN');

    const claimResult = await client.query(
      `SELECT c.*, u.full_name as claimant_name, u.email as claimant_email,
              li.item_name as lost_item_name, fi.item_name as found_item_name,
              fi.pickup_location
       FROM claims c
       LEFT JOIN users u ON c.claimant_id = u.id
       LEFT JOIN lost_items li ON c.lost_item_id = li.id
       LEFT JOIN found_items fi ON c.found_item_id = fi.id
       WHERE c.id = $1`,
      [id]
    );

    if (claimResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Claim not found.' });
    }

    const claim = claimResult.rows[0];
    if (claim.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Claim has already been processed.' });
    }

    await client.query(
      `UPDATE claims SET status = 'approved', approved_by = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3`,
      [req.user.id, admin_notes || null, id]
    );

    if (claim.lost_item_id) {
      await client.query(
        `UPDATE lost_items SET status = 'claimed', updated_at = NOW() WHERE id = $1`,
        [claim.lost_item_id]
      );
    }
    if (claim.found_item_id) {
      await client.query(
        `UPDATE found_items SET status = 'claimed', updated_at = NOW() WHERE id = $1`,
        [claim.found_item_id]
      );
    }

    await notificationService.createNotification(
      claim.claimant_id,
      'Claim Approved!',
      `Your claim for "${claim.lost_item_name || claim.found_item_name}" has been approved.`,
      'claim_approved',
      claim.id,
      'claim'
    );

    await activityService.log(req.user.id, `Approved claim #${id}`, 'claim', parseInt(id));

    await client.query('COMMIT');

    const itemName = claim.lost_item_name || claim.found_item_name;
    const emailHtml = emailService.getClaimApprovedTemplate({
      userName: claim.claimant_name,
      itemName: itemName,
      pickupLocation: claim.pickup_location,
    });
    await emailService.sendEmail(claim.claimant_email, 'Your Claim Has Been Approved!', emailHtml);

    res.json({ message: 'Claim approved successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve claim error:', error);
    res.status(500).json({ message: 'Failed to approve claim.' });
  } finally {
    client.release();
  }
};

const rejectClaim = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    await client.query('BEGIN');

    const claimResult = await client.query(
      `SELECT c.*, u.full_name as claimant_name, u.email as claimant_email,
              li.item_name as lost_item_name, fi.item_name as found_item_name
       FROM claims c
       LEFT JOIN users u ON c.claimant_id = u.id
       LEFT JOIN lost_items li ON c.lost_item_id = li.id
       LEFT JOIN found_items fi ON c.found_item_id = fi.id
       WHERE c.id = $1`,
      [id]
    );

    if (claimResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Claim not found.' });
    }

    const claim = claimResult.rows[0];
    if (claim.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Claim has already been processed.' });
    }

    await client.query(
      `UPDATE claims SET status = 'rejected', approved_by = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3`,
      [req.user.id, admin_notes || null, id]
    );

    await notificationService.createNotification(
      claim.claimant_id,
      'Claim Rejected',
      `Your claim for "${claim.lost_item_name || claim.found_item_name}" has been rejected.`,
      'claim_rejected',
      claim.id,
      'claim'
    );

    await activityService.log(req.user.id, `Rejected claim #${id}`, 'claim', parseInt(id));

    await client.query('COMMIT');

    const itemName = claim.lost_item_name || claim.found_item_name;
    const emailHtml = emailService.getClaimRejectedTemplate({
      userName: claim.claimant_name,
      itemName: itemName,
      reason: admin_notes,
    });
    await emailService.sendEmail(claim.claimant_email, 'Claim Update - Not Approved', emailHtml);

    res.json({ message: 'Claim rejected.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reject claim error:', error);
    res.status(500).json({ message: 'Failed to reject claim.' });
  } finally {
    client.release();
  }
};

module.exports = { createClaim, getClaims, getClaimById, approveClaim, rejectClaim };
