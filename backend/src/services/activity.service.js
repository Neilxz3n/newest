const pool = require('../config/database');

class ActivityService {
  async log(userId, activity, entityType = null, entityId = null, ipAddress = null) {
    await pool.query(
      `INSERT INTO activity_logs (user_id, activity, entity_type, entity_id, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, activity, entityType, entityId, ipAddress]
    );
  }

  async getRecentActivities(limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT al.*, u.full_name, u.role
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async getUserActivities(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }
}

module.exports = new ActivityService();
