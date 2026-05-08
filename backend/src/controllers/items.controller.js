const pool = require('../config/database');
const activityService = require('../services/activity.service');
const matchingService = require('../services/matching.service');

const getLostItems = async (req, res) => {
  try {
    const { category_id, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (category_id) {
      conditions.push(`li.category_id = $${paramIndex++}`);
      params.push(category_id);
    }
    if (status) {
      conditions.push(`li.status = $${paramIndex++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(li.item_name ILIKE $${paramIndex} OR li.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM lost_items li ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT li.*, u.full_name as reporter_name, c.category_name
       FROM lost_items li
       LEFT JOIN users u ON li.user_id = u.id
       LEFT JOIN categories c ON li.category_id = c.id
       ${whereClause}
       ORDER BY li.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    res.json({
      items: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get lost items error:', error);
    res.status(500).json({ message: 'Failed to fetch lost items.' });
  }
};

const createLostItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const { category_id, item_name, description, location, date_lost, campus_id, department_id, contact_info } = req.body;
    const image = req.file ? req.file.filename : null;

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO lost_items (user_id, category_id, item_name, description, image, location, date_lost, campus_id, department_id, contact_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, category_id, item_name, description, image, location, date_lost, campus_id || null, department_id || null, contact_info || null]
    );

    const newItem = result.rows[0];
    await activityService.log(req.user.id, `Reported lost item: ${item_name}`, 'lost_item', newItem.id);

    await client.query('COMMIT');

    const matches = await matchingService.findMatches(newItem, 'lost');
    if (matches.length > 0) {
      await matchingService.saveAndNotifyMatches(newItem, matches, 'lost');
    }

    res.status(201).json({ message: 'Lost item reported successfully', item: newItem, matchesFound: matches.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create lost item error:', error);
    res.status(500).json({ message: 'Failed to report lost item.' });
  } finally {
    client.release();
  }
};

const getLostItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT li.*, u.full_name as reporter_name, u.email as reporter_email, c.category_name
       FROM lost_items li
       LEFT JOIN users u ON li.user_id = u.id
       LEFT JOIN categories c ON li.category_id = c.id
       WHERE li.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lost item not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get lost item by id error:', error);
    res.status(500).json({ message: 'Failed to fetch lost item.' });
  }
};

const updateLostItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { category_id, item_name, description, location, date_lost, status, contact_info } = req.body;
    const image = req.file ? req.file.filename : undefined;

    const existing = await client.query('SELECT * FROM lost_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Lost item not found.' });
    }

    if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this item.' });
    }

    await client.query('BEGIN');

    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (category_id) { fields.push(`category_id = $${paramIndex++}`); params.push(category_id); }
    if (item_name) { fields.push(`item_name = $${paramIndex++}`); params.push(item_name); }
    if (description) { fields.push(`description = $${paramIndex++}`); params.push(description); }
    if (location) { fields.push(`location = $${paramIndex++}`); params.push(location); }
    if (date_lost) { fields.push(`date_lost = $${paramIndex++}`); params.push(date_lost); }
    if (status) { fields.push(`status = $${paramIndex++}`); params.push(status); }
    if (contact_info) { fields.push(`contact_info = $${paramIndex++}`); params.push(contact_info); }
    if (image) { fields.push(`image = $${paramIndex++}`); params.push(image); }
    fields.push(`updated_at = NOW()`);

    params.push(id);
    const result = await client.query(
      `UPDATE lost_items SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    await activityService.log(req.user.id, `Updated lost item: ${result.rows[0].item_name}`, 'lost_item', id);
    await client.query('COMMIT');

    res.json({ message: 'Lost item updated', item: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update lost item error:', error);
    res.status(500).json({ message: 'Failed to update lost item.' });
  } finally {
    client.release();
  }
};

const getFoundItems = async (req, res) => {
  try {
    const { category_id, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (category_id) {
      conditions.push(`fi.category_id = $${paramIndex++}`);
      params.push(category_id);
    }
    if (status) {
      conditions.push(`fi.status = $${paramIndex++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(fi.item_name ILIKE $${paramIndex} OR fi.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM found_items fi ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT fi.*, u.full_name as reporter_name, c.category_name
       FROM found_items fi
       LEFT JOIN users u ON fi.user_id = u.id
       LEFT JOIN categories c ON fi.category_id = c.id
       ${whereClause}
       ORDER BY fi.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    res.json({
      items: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get found items error:', error);
    res.status(500).json({ message: 'Failed to fetch found items.' });
  }
};

const createFoundItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const { category_id, item_name, description, location, pickup_location, date_found, campus_id, department_id, verification_notes } = req.body;
    const image = req.file ? req.file.filename : null;

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO found_items (user_id, category_id, item_name, description, image, location, pickup_location, date_found, campus_id, department_id, verification_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.user.id, category_id, item_name, description, image, location, pickup_location || null, date_found, campus_id || null, department_id || null, verification_notes || null]
    );

    const newItem = result.rows[0];
    await activityService.log(req.user.id, `Reported found item: ${item_name}`, 'found_item', newItem.id);

    await client.query('COMMIT');

    const matches = await matchingService.findMatches(newItem, 'found');
    if (matches.length > 0) {
      await matchingService.saveAndNotifyMatches(newItem, matches, 'found');
    }

    res.status(201).json({ message: 'Found item reported successfully', item: newItem, matchesFound: matches.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create found item error:', error);
    res.status(500).json({ message: 'Failed to report found item.' });
  } finally {
    client.release();
  }
};

const getFoundItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT fi.*, u.full_name as reporter_name, u.email as reporter_email, c.category_name
       FROM found_items fi
       LEFT JOIN users u ON fi.user_id = u.id
       LEFT JOIN categories c ON fi.category_id = c.id
       WHERE fi.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Found item not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get found item by id error:', error);
    res.status(500).json({ message: 'Failed to fetch found item.' });
  }
};

const updateFoundItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { category_id, item_name, description, location, pickup_location, date_found, status, verification_notes } = req.body;
    const image = req.file ? req.file.filename : undefined;

    const existing = await client.query('SELECT * FROM found_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Found item not found.' });
    }

    if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this item.' });
    }

    await client.query('BEGIN');

    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (category_id) { fields.push(`category_id = $${paramIndex++}`); params.push(category_id); }
    if (item_name) { fields.push(`item_name = $${paramIndex++}`); params.push(item_name); }
    if (description) { fields.push(`description = $${paramIndex++}`); params.push(description); }
    if (location) { fields.push(`location = $${paramIndex++}`); params.push(location); }
    if (pickup_location) { fields.push(`pickup_location = $${paramIndex++}`); params.push(pickup_location); }
    if (date_found) { fields.push(`date_found = $${paramIndex++}`); params.push(date_found); }
    if (status) { fields.push(`status = $${paramIndex++}`); params.push(status); }
    if (verification_notes) { fields.push(`verification_notes = $${paramIndex++}`); params.push(verification_notes); }
    if (image) { fields.push(`image = $${paramIndex++}`); params.push(image); }
    fields.push(`updated_at = NOW()`);

    params.push(id);
    const result = await client.query(
      `UPDATE found_items SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    await activityService.log(req.user.id, `Updated found item: ${result.rows[0].item_name}`, 'found_item', id);
    await client.query('COMMIT');

    res.json({ message: 'Found item updated', item: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update found item error:', error);
    res.status(500).json({ message: 'Failed to update found item.' });
  } finally {
    client.release();
  }
};

module.exports = {
  getLostItems,
  createLostItem,
  getLostItemById,
  updateLostItem,
  getFoundItems,
  createFoundItem,
  getFoundItemById,
  updateFoundItem,
};
