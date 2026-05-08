const db = require('../config/database');
const activityService = require('../services/activity.service');

const getDashboardStats = async (req, res) => {
  try {
    const lostItemsRows = db.prepare(
      'SELECT status, COUNT(*) as count FROM lost_items GROUP BY status'
    ).all();
    const foundItemsRows = db.prepare(
      'SELECT status, COUNT(*) as count FROM found_items GROUP BY status'
    ).all();
    const claimsRows = db.prepare(
      'SELECT status, COUNT(*) as count FROM claims GROUP BY status'
    ).all();
    const usersRow = db.prepare(
      'SELECT COUNT(*) as total FROM users WHERE is_active = 1'
    ).get();

    const lostItems = {};
    lostItemsRows.forEach(row => { lostItems[row.status] = row.count; });

    const foundItems = {};
    foundItemsRows.forEach(row => { foundItems[row.status] = row.count; });

    const claims = {};
    claimsRows.forEach(row => { claims[row.status] = row.count; });

    const totalLost = Object.values(lostItems).reduce((a, b) => a + b, 0);
    const totalFound = Object.values(foundItems).reduce((a, b) => a + b, 0);
    const totalClaimed = (lostItems.claimed || 0) + (foundItems.claimed || 0);
    const pendingClaims = claims.pending || 0;

    const recentActivities = db.prepare(
      `SELECT al.*, u.full_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 10`
    ).all();

    res.json({
      totalLost,
      totalFound,
      totalClaimed,
      pendingClaims,
      totalUsers: usersRow.total,
      recentActivities,
      lostItems,
      foundItems,
      claims,
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

    if (role) {
      conditions.push('u.role = ?');
      params.push(role);
    }
    if (search) {
      conditions.push('(u.full_name LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM users u ${whereClause}`
    ).get(...params);

    const users = db.prepare(
      `SELECT u.id, u.full_name, u.email, u.role, u.student_id, u.phone, u.is_active, u.created_at,
              d.name as department_name, c.campus_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN campuses c ON u.campus_id = c.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), parseInt(offset));

    res.json({
      users,
      total: countRow.count,
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

    const result = db.prepare(
      'UPDATE users SET role = ?, updated_at = datetime(?) WHERE id = ?'
    ).run(role, new Date().toISOString(), id);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = db.prepare('SELECT id, full_name, email, role FROM users WHERE id = ?').get(id);
    activityService.log(req.user.id, `Updated user #${id} role to ${role}`, 'user', parseInt(id));

    res.json({ message: 'User role updated', user });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role.' });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const countRow = db.prepare('SELECT COUNT(*) as count FROM activity_logs').get();
    const logs = db.prepare(
      `SELECT al.*, u.full_name, u.role
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(parseInt(limit), parseInt(offset));

    res.json({
      logs,
      total: countRow.count,
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

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM email_logs ${whereClause}`
    ).get(...params);

    const logs = db.prepare(
      `SELECT * FROM email_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), parseInt(offset));

    res.json({
      logs,
      total: countRow.count,
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
    const announcements = db.prepare(
      `SELECT a.*, u.full_name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC`
    ).all();

    res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements.' });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, campus_id, expires_at } = req.body;

    const result = db.prepare(
      `INSERT INTO announcements (title, content, priority, created_by, campus_id, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(title, content, priority || 'normal', req.user.id, campus_id || null, expires_at || null);

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
    activityService.log(req.user.id, `Created announcement: ${title}`, 'announcement', announcement.id);

    res.status(201).json({ message: 'Announcement created', announcement });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Failed to create announcement.' });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM announcements WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    activityService.log(req.user.id, `Deleted announcement #${id}`, 'announcement', parseInt(id));

    res.json({ message: 'Announcement deleted.' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Failed to delete announcement.' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY category_name ASC').all();
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories.' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { category_name, icon } = req.body;

    const existing = db.prepare('SELECT id FROM categories WHERE category_name = ?').get(category_name);
    if (existing) {
      return res.status(400).json({ message: 'Category already exists.' });
    }

    const result = db.prepare(
      'INSERT INTO categories (category_name, icon) VALUES (?, ?)'
    ).run(category_name, icon || null);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    activityService.log(req.user.id, `Created category: ${category_name}`, 'category', category.id);

    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
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
