const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payments');
const auth = require('../middleware/auth');

router.post('/create-order', auth, ctrl.createOrder);
router.post('/verify', auth, ctrl.verifyPayment);
router.post('/release', auth, ctrl.releasePayment);
router.get('/mine', auth, ctrl.myPayments);

module.exports = router;
