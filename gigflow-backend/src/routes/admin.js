const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(auth, requireRole('admin'));

router.get('/stats', ctrl.getStats);
router.get('/users', ctrl.listUsers);
router.put('/users/:id', ctrl.updateUser);
router.delete('/gigs/:id', ctrl.deleteGig);
router.get('/reports', ctrl.listReports);
router.put('/reports/:id', ctrl.resolveReport);

module.exports = router;
