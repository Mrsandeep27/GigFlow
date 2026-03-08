const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chat');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.listConversations);
router.get('/unread', auth, ctrl.unreadCount);
router.post('/', auth, ctrl.startConversation);
router.get('/:id/messages', auth, ctrl.getMessages);
router.post('/:id/messages', auth, ctrl.sendMessage);

module.exports = router;
