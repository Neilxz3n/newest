const db = require('../config/database');
const activityService = require('../services/activity.service');
const notificationService = require('../services/notification.service');
const emailService = require('../services/email.service');

const createClaim = async (req, res) => {
  try {
    const { lost_item_id, found_item_id, proof } = req.body;

    if (!lost_item_id && !found_item_id) {
      return res.status(400).json({ message: 'Either lost_item_id or found_item_id is required.' });
    }

    const createTxn = db.transaction(() => {
      const existingClaim = db.prepare(
        `SELECT id FROM claims WHERE claimant_id = ? AND status = 'pending'
         AND (lost_item_id = ? OR found_item_id = ?)`
      ).get(req.user.id, lost_item_id || null, found_item_id || null);

      if (existingClaim) {
        return { error: 'You already have a pending claim for this item.' };
      }

      const result = db.prepare(
        `INSERT INTO claims (claimant_id, lost_item_id, found_item_id, proof)
         VALUES (?, ?, ?, ?)`
      ).run(req.user.id, lost_item_id || null, found_item_id || null, proof);

      const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(result.lastInsertRowid);
      activityService.log(req.user.id, 'Submitted a claim', 'claim', claim.id);

      return { claim };
    });

    const result = createTxn();

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    res.status(201).json({ message: 'Claim submitted successfully', claim: result.claim });
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ message: 'Failed to submit claim.' });
  }
};

const getClaims = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (req.user.role !== 'admin') {
      conditions.push('c.claimant_id = ?');
      params.push(req.user.id);
    }

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM claims c ${whereClause}`
    ).get(...params);

    const claims = db.prepare(
      `SELECT c.*, u.full_name as claimant_name, u.email as claimant_email,
              li.item_name as lost_item_name, fi.item_name as found_item_name
       FROM claims c
       LEFT JOIN users u ON c.claimant_id = u.id
       LEFT JOIN lost_items li ON c.lost_item_id = li.id
       LEFT JOIN found_items fi ON c.found_item_id = fi.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), parseInt(offset));

    res.json({
      claims,
      total: countRow.count,
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

    const claim = db.prepare(
      `SELECT c.*, u.full_name as claimant_name, u.email as claimant_email,
              li.item_name as lost_item_name, li.description as lost_item_description,
              fi.item_name as found_item_name, fi.description as found_item_description
       FROM claims c
       LEFT JOIN users u ON c.claimant_id = u.id
       LEFT JOIN lost_items li ON c.lost_item_id = li.id
       LEFT JOIN found_items fi ON c.found_item_id = fi.id
       WHERE c.id = ?`
    ).get(id);

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

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
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const approveTxn = db.transaction(() => {
      const claim = db.prepare(
        `SELECT c.*, u.full_name as claimant_name, u.email as claimant_email,
                li.item_name as lost_item_name, fi.item_name as found_item_name,
                fi.pickup_location
         FROM claims c
         LEFT JOIN users u ON c.claimant_id = u.id
         LEFT JOIN lost_items li ON c.lost_item_id = li.id
         LEFT JOIN found_items fi ON c.found_item_id = fi.id
         WHERE c.id = ?`
      ).get(id);

      if (!claim) {
        return { error: 'Claim not found.', status: 404 };
      }

      if (claim.status !== 'pending') {
        return { error: 'Claim has already been processed.', status: 400 };
      }

      db.prepare(
        `UPDATE claims SET status = 'approved', approved_by = ?, admin_notes = ?, updated_at = datetime(?) WHERE id = ?`
      ).run(req.user.id, admin_notes || null, new Date().toISOString(), id);

      if (claim.lost_item_id) {
        db.prepare(
          `UPDATE lost_items SET status = 'claimed', updated_at = datetime(?) WHERE id = ?`
        ).run(new Date().toISOString(), claim.lost_item_id);
      }
      if (claim.found_item_id) {
        db.prepare(
          `UPDATE found_items SET status = 'claimed', updated_at = datetime(?) WHERE id = ?`
        ).run(new Date().toISOString(), claim.found_item_id);
      }

      notificationService.createNotification(
        claim.claimant_id,
        'Claim Approved!',
        `Your claim for "${claim.lost_item_name || claim.found_item_name}" has been approved.`,
        'claim_approved',
        claim.id,
        'claim'
      );

      activityService.log(req.user.id, `Approved claim #${id}`, 'claim', parseInt(id));

      return { claim };
    });

    const result = approveTxn();

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    const { claim } = result;
    const itemName = claim.lost_item_name || claim.found_item_name;
    const emailHtml = emailService.getClaimApprovedTemplate({
      userName: claim.claimant_name,
      itemName: itemName,
      pickupLocation: claim.pickup_location,
    });
    await emailService.sendEmail(claim.claimant_email, 'Your Claim Has Been Approved!', emailHtml);

    res.json({ message: 'Claim approved successfully.' });
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({ message: 'Failed to approve claim.' });
  }
};

const rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const rejectTxn = db.transaction(() => {
      const claim = db.prepare(
        `SELECT c.*, u.full_name as claimant_name, u.email as claimant_email,
                li.item_name as lost_item_name, fi.item_name as found_item_name
         FROM claims c
         LEFT JOIN users u ON c.claimant_id = u.id
         LEFT JOIN lost_items li ON c.lost_item_id = li.id
         LEFT JOIN found_items fi ON c.found_item_id = fi.id
         WHERE c.id = ?`
      ).get(id);

      if (!claim) {
        return { error: 'Claim not found.', status: 404 };
      }

      if (claim.status !== 'pending') {
        return { error: 'Claim has already been processed.', status: 400 };
      }

      db.prepare(
        `UPDATE claims SET status = 'rejected', approved_by = ?, admin_notes = ?, updated_at = datetime(?) WHERE id = ?`
      ).run(req.user.id, admin_notes || null, new Date().toISOString(), id);

      notificationService.createNotification(
        claim.claimant_id,
        'Claim Rejected',
        `Your claim for "${claim.lost_item_name || claim.found_item_name}" has been rejected.`,
        'claim_rejected',
        claim.id,
        'claim'
      );

      activityService.log(req.user.id, `Rejected claim #${id}`, 'claim', parseInt(id));

      return { claim };
    });

    const result = rejectTxn();

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    const { claim } = result;
    const itemName = claim.lost_item_name || claim.found_item_name;
    const emailHtml = emailService.getClaimRejectedTemplate({
      userName: claim.claimant_name,
      itemName: itemName,
      reason: admin_notes,
    });
    await emailService.sendEmail(claim.claimant_email, 'Claim Update - Not Approved', emailHtml);

    res.json({ message: 'Claim rejected.' });
  } catch (error) {
    console.error('Reject claim error:', error);
    res.status(500).json({ message: 'Failed to reject claim.' });
  }
};

module.exports = { createClaim, getClaims, getClaimById, approveClaim, rejectClaim };
