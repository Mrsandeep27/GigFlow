const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/portfolio');
const auth = require('../middleware/auth');

router.get('/:userId', ctrl.getUserPortfolio);
router.post('/', auth, ctrl.addItem);
router.put('/:id', auth, ctrl.updateItem);
router.delete('/:id', auth, ctrl.deleteItem);

module.exports = router;
