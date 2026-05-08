const db = require('../config/database');
const activityService = require('../services/activity.service');
const matchingService = require('../services/matching.service');

const getLostItems = async (req, res) => {
  try {
    const { category_id, category, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    const catFilter = category_id || category;
    if (catFilter) {
      conditions.push('li.category_id = ?');
      params.push(catFilter);
    }
    if (status) {
      conditions.push('li.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(li.item_name LIKE ? OR li.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM lost_items li ${whereClause}`
    ).get(...params);

    const items = db.prepare(
      `SELECT li.*, u.full_name as reporter_name, c.category_name
       FROM lost_items li
       LEFT JOIN users u ON li.user_id = u.id
       LEFT JOIN categories c ON li.category_id = c.id
       ${whereClause}
       ORDER BY li.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), parseInt(offset));

    res.json({
      items,
      total: countRow.count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get lost items error:', error);
    res.status(500).json({ message: 'Failed to fetch lost items.' });
  }
};

const createLostItem = async (req, res) => {
  try {
    const { category_id, item_name, description, location, date_lost, campus_id, department_id, contact_info } = req.body;
    const image = req.file ? req.file.filename : null;

    const createTxn = db.transaction(() => {
      const result = db.prepare(
        `INSERT INTO lost_items (user_id, category_id, item_name, description, image, location, date_lost, campus_id, department_id, contact_info)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(req.user.id, category_id, item_name, description, image, location, date_lost, campus_id || null, department_id || null, contact_info || null);

      const newItem = db.prepare('SELECT * FROM lost_items WHERE id = ?').get(result.lastInsertRowid);
      activityService.log(req.user.id, `Reported lost item: ${item_name}`, 'lost_item', newItem.id);

      return newItem;
    });

    const newItem = createTxn();

    const matches = matchingService.findMatches(newItem, 'lost');
    if (matches.length > 0) {
      matchingService.saveAndNotifyMatches(newItem, matches, 'lost');
    }

    res.status(201).json({ message: 'Lost item reported successfully', item: newItem, matchesFound: matches.length });
  } catch (error) {
    console.error('Create lost item error:', error);
    res.status(500).json({ message: 'Failed to report lost item.' });
  }
};

const getLostItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = db.prepare(
      `SELECT li.*, u.full_name as reporter_name, u.email as reporter_email, c.category_name
       FROM lost_items li
       LEFT JOIN users u ON li.user_id = u.id
       LEFT JOIN categories c ON li.category_id = c.id
       WHERE li.id = ?`
    ).get(id);

    if (!item) {
      return res.status(404).json({ message: 'Lost item not found.' });
    }

    res.json(item);
  } catch (error) {
    console.error('Get lost item by id error:', error);
    res.status(500).json({ message: 'Failed to fetch lost item.' });
  }
};

const updateLostItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, item_name, description, location, date_lost, status, contact_info } = req.body;
    const image = req.file ? req.file.filename : undefined;

    const existing = db.prepare('SELECT * FROM lost_items WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Lost item not found.' });
    }

    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this item.' });
    }

    const updateTxn = db.transaction(() => {
      const fields = [];
      const params = [];

      if (category_id) { fields.push('category_id = ?'); params.push(category_id); }
      if (item_name) { fields.push('item_name = ?'); params.push(item_name); }
      if (description) { fields.push('description = ?'); params.push(description); }
      if (location) { fields.push('location = ?'); params.push(location); }
      if (date_lost) { fields.push('date_lost = ?'); params.push(date_lost); }
      if (status) { fields.push('status = ?'); params.push(status); }
      if (contact_info) { fields.push('contact_info = ?'); params.push(contact_info); }
      if (image) { fields.push('image = ?'); params.push(image); }
      fields.push('updated_at = datetime(?)');
      params.push(new Date().toISOString());

      params.push(id);
      db.prepare(`UPDATE lost_items SET ${fields.join(', ')} WHERE id = ?`).run(...params);

      const updated = db.prepare('SELECT * FROM lost_items WHERE id = ?').get(id);
      activityService.log(req.user.id, `Updated lost item: ${updated.item_name}`, 'lost_item', id);

      return updated;
    });

    const item = updateTxn();
    res.json({ message: 'Lost item updated', item });
  } catch (error) {
    console.error('Update lost item error:', error);
    res.status(500).json({ message: 'Failed to update lost item.' });
  }
};

const getFoundItems = async (req, res) => {
  try {
    const { category_id, category, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    const catFilter = category_id || category;
    if (catFilter) {
      conditions.push('fi.category_id = ?');
      params.push(catFilter);
    }
    if (status) {
      conditions.push('fi.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(fi.item_name LIKE ? OR fi.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM found_items fi ${whereClause}`
    ).get(...params);

    const items = db.prepare(
      `SELECT fi.*, u.full_name as reporter_name, c.category_name
       FROM found_items fi
       LEFT JOIN users u ON fi.user_id = u.id
       LEFT JOIN categories c ON fi.category_id = c.id
       ${whereClause}
       ORDER BY fi.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), parseInt(offset));

    res.json({
      items,
      total: countRow.count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get found items error:', error);
    res.status(500).json({ message: 'Failed to fetch found items.' });
  }
};

const createFoundItem = async (req, res) => {
  try {
    const { category_id, item_name, description, location, pickup_location, date_found, campus_id, department_id, verification_notes } = req.body;
    const image = req.file ? req.file.filename : null;

    const createTxn = db.transaction(() => {
      const result = db.prepare(
        `INSERT INTO found_items (user_id, category_id, item_name, description, image, location, pickup_location, date_found, campus_id, department_id, verification_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(req.user.id, category_id, item_name, description, image, location, pickup_location || null, date_found, campus_id || null, department_id || null, verification_notes || null);

      const newItem = db.prepare('SELECT * FROM found_items WHERE id = ?').get(result.lastInsertRowid);
      activityService.log(req.user.id, `Reported found item: ${item_name}`, 'found_item', newItem.id);

      return newItem;
    });

    const newItem = createTxn();

    const matches = matchingService.findMatches(newItem, 'found');
    if (matches.length > 0) {
      matchingService.saveAndNotifyMatches(newItem, matches, 'found');
    }

    res.status(201).json({ message: 'Found item reported successfully', item: newItem, matchesFound: matches.length });
  } catch (error) {
    console.error('Create found item error:', error);
    res.status(500).json({ message: 'Failed to report found item.' });
  }
};

const getFoundItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = db.prepare(
      `SELECT fi.*, u.full_name as reporter_name, u.email as reporter_email, c.category_name
       FROM found_items fi
       LEFT JOIN users u ON fi.user_id = u.id
       LEFT JOIN categories c ON fi.category_id = c.id
       WHERE fi.id = ?`
    ).get(id);

    if (!item) {
      return res.status(404).json({ message: 'Found item not found.' });
    }

    res.json(item);
  } catch (error) {
    console.error('Get found item by id error:', error);
    res.status(500).json({ message: 'Failed to fetch found item.' });
  }
};

const updateFoundItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, item_name, description, location, pickup_location, date_found, status, verification_notes } = req.body;
    const image = req.file ? req.file.filename : undefined;

    const existing = db.prepare('SELECT * FROM found_items WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Found item not found.' });
    }

    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this item.' });
    }

    const updateTxn = db.transaction(() => {
      const fields = [];
      const params = [];

      if (category_id) { fields.push('category_id = ?'); params.push(category_id); }
      if (item_name) { fields.push('item_name = ?'); params.push(item_name); }
      if (description) { fields.push('description = ?'); params.push(description); }
      if (location) { fields.push('location = ?'); params.push(location); }
      if (pickup_location) { fields.push('pickup_location = ?'); params.push(pickup_location); }
      if (date_found) { fields.push('date_found = ?'); params.push(date_found); }
      if (status) { fields.push('status = ?'); params.push(status); }
      if (verification_notes) { fields.push('verification_notes = ?'); params.push(verification_notes); }
      if (image) { fields.push('image = ?'); params.push(image); }
      fields.push('updated_at = datetime(?)');
      params.push(new Date().toISOString());

      params.push(id);
      db.prepare(`UPDATE found_items SET ${fields.join(', ')} WHERE id = ?`).run(...params);

      const updated = db.prepare('SELECT * FROM found_items WHERE id = ?').get(id);
      activityService.log(req.user.id, `Updated found item: ${updated.item_name}`, 'found_item', id);

      return updated;
    });

    const item = updateTxn();
    res.json({ message: 'Found item updated', item });
  } catch (error) {
    console.error('Update found item error:', error);
    res.status(500).json({ message: 'Failed to update found item.' });
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
