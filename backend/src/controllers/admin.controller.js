const pool = require('../config/database');
const activityService = require('../services/activity.service');

const getDashboardStats = async (req, res) => {
  try {
    const lostItemsResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM lost_items GROUP BY status`
    );
    const foundItemsResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM found_items GROUP BY status`
    );
    const claimsResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM claims GROUP BY status`
    );
    const usersResult = await pool.query(
      `SELECT COUNT(*) as total FROM users WHERE is_active = true`
    );

    const lostItems = {};
    lostItemsResult.rows.forEach(row => { lostItems[row.status] = parseInt(row.count); });

    const foundItems = {};
    foundItemsResult.rows.forEach(row => { foundItems[row.status] = parseInt(row.count); });

    const claims = {};
    claimsResult.rows.forEach(row => { claims[row.status] = parseInt(row.count); });

    res.json({
      lostItems,
      foundItems,
      claims,
      totalUsers: parseInt(usersResult.rows[0].total),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats.' });
  }
};

const getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (role) {
      conditions.push(`u.role = $${paramIndex++}`);
      params.push(role);
    }
    if (search) {
      conditions.push(`(u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.student_id, u.phone, u.is_active, u.created_at,
              d.name as department_name, c.campus_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN campuses c ON u.campus_id = c.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['student', 'faculty', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, email, role`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await activityService.log(req.user.id, `Updated user #${id} role to ${role}`, 'user', parseInt(id));

    res.json({ message: 'User role updated', user: result.rows[0] });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role.' });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM activity_logs');
    const result = await pool.query(
      `SELECT al.*, u.full_name, u.role
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs.' });
  }
};

const getEmailLogs = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM email_logs ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM email_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get email logs error:', error);
    res.status(500).json({ message: 'Failed to fetch email logs.' });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements.' });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, campus_id, expires_at } = req.body;
    const result = await pool.query(
      `INSERT INTO announcements (title, content, priority, created_by, campus_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, content, priority || 'normal', req.user.id, campus_id || null, expires_at || null]
    );

    await activityService.log(req.user.id, `Created announcement: ${title}`, 'announcement', result.rows[0].id);

    res.status(201).json({ message: 'Announcement created', announcement: result.rows[0] });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Failed to create announcement.' });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    await activityService.log(req.user.id, `Deleted announcement #${id}`, 'announcement', parseInt(id));

    res.json({ message: 'Announcement deleted.' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Failed to delete announcement.' });
  }
};

const getCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY category_name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories.' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { category_name, icon } = req.body;
    const result = await pool.query(
      `INSERT INTO categories (category_name, icon) VALUES ($1, $2) RETURNING *`,
      [category_name, icon || null]
    );

    await activityService.log(req.user.id, `Created category: ${category_name}`, 'category', result.rows[0].id);

    res.status(201).json({ message: 'Category created', category: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Category already exists.' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Failed to create category.' });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserRole,
  getActivityLogs,
  getEmailLogs,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getCategories,
  createCategory,
};
