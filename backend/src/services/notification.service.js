const pool = require('../config/database');

class NotificationService {
  constructor() {
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  async createNotification(userId, title, message, type, referenceId, referenceType) {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, title, message, type, referenceId || null, referenceType || null]
    );

    if (this.io) {
      this.io.to(`user_${userId}`).emit('notification', result.rows[0]);
    }

    return result.rows[0];
  }

  async getUserNotifications(userId, limit, offset) {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit || 20, offset || 0]
    );
    return result.rows;
  }

  async getUnreadCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  async markAsRead(notificationId, userId) {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  }

  async markAllAsRead(userId) {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  }
}

module.exports = new NotificationService();
