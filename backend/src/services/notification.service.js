const db = require('../config/database');

class NotificationService {
  constructor() {
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  createNotification(userId, title, message, type, referenceId, referenceType) {
    const result = db.prepare(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, title, message, type, referenceId || null, referenceType || null);

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);

    if (this.io) {
      this.io.to(`user_${userId}`).emit('notification', notification);
    }

    return notification;
  }

  getUserNotifications(userId, limit, offset) {
    return db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, limit || 20, offset || 0);
  }

  getUnreadCount(userId) {
    const row = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(userId);
    return row.count;
  }

  markAsRead(notificationId, userId) {
    db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).run(notificationId, userId);
  }

  markAllAsRead(userId) {
    db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).run(userId);
  }
}

module.exports = new NotificationService();
