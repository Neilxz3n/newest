const db = require('../config/database');

class ActivityService {
  log(userId, activity, entityType = null, entityId = null, ipAddress = null) {
    db.prepare(
      `INSERT INTO activity_logs (user_id, activity, entity_type, entity_id, ip_address)
       VALUES (?, ?, ?, ?, ?)`
    ).run(userId, activity, entityType, entityId, ipAddress);
  }

  getRecentActivities(limit = 20, offset = 0) {
    return db.prepare(
      `SELECT al.*, u.full_name, u.role
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`
    ).all(limit, offset);
  }

  getUserActivities(userId, limit = 20, offset = 0) {
    return db.prepare(
      'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, limit, offset);
  }
}

module.exports = new ActivityService();
