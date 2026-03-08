const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/resume');
const auth = require('../middleware/auth');

router.post('/analyze', auth, ctrl.analyze);
router.get('/history', auth, ctrl.history);
router.get('/latest', auth, ctrl.latest);

module.exports = router;
