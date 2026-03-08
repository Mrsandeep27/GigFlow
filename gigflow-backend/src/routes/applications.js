const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/applications');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.apply);
router.get('/mine', auth, ctrl.myApplications);
router.get('/skill-match/:gigId', auth, ctrl.skillMatch);
router.get('/gig/:gigId', auth, ctrl.gigApplications);
router.get('/:id', auth, ctrl.getApplication);
router.put('/:id/status', auth, ctrl.updateStatus);
router.delete('/:id', auth, ctrl.withdraw);

module.exports = router;
