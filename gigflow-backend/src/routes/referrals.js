const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/referrals');
const auth = require('../middleware/auth');

// Specific routes MUST come before :id routes
router.get('/mine', auth, ctrl.myReferrals);
router.get('/requests/mine', auth, ctrl.myRequests);
router.get('/', ctrl.listReferrals);
router.post('/', auth, ctrl.createReferral);
router.get('/:id/requests', auth, ctrl.getReferralRequests);
router.post('/:id/request', auth, ctrl.requestReferral);
router.put('/requests/:requestId', auth, ctrl.respondToRequest);
router.delete('/:id', auth, ctrl.deleteReferral);

module.exports = router;
