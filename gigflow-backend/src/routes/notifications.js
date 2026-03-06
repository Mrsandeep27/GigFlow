const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, notificationsController.getNotifications);
router.put('/read-all', authMiddleware, notificationsController.markAllRead);
router.put('/:id/read', authMiddleware, notificationsController.markRead);

module.exports = router;
