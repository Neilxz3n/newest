const express = require('express');
const { authenticate } = require('../middleware/auth');
const notificationsController = require('../controllers/notifications.controller');

const router = express.Router();

router.get('/', authenticate, notificationsController.getNotifications);
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);
router.put('/:id/read', authenticate, notificationsController.markAsRead);
router.put('/read-all', authenticate, notificationsController.markAllAsRead);

module.exports = router;
