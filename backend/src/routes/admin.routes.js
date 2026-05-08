const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.get('/activity-logs', adminController.getActivityLogs);
router.get('/email-logs', adminController.getEmailLogs);
router.get('/announcements', adminController.getAnnouncements);
router.post('/announcements', adminController.createAnnouncement);
router.delete('/announcements/:id', adminController.deleteAnnouncement);
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);

module.exports = router;
