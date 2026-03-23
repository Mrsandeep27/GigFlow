const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/upload');
const auth = require('../middleware/auth');

router.post('/avatar', auth, ctrl.uploadAvatar);
router.post('/portfolio', auth, ctrl.uploadPortfolio);

module.exports = router;
