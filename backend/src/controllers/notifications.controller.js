const notificationService = require('../services/notification.service');

const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const notifications = notificationService.getUserNotifications(req.user.id, parseInt(limit), parseInt(offset));
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = notificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Failed to fetch unread count.' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    notificationService.markAsRead(id, req.user.id);
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read.' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    notificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read.' });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
