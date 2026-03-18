const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/candidates');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

router.get('/', auth, ctrl.discoverCandidates);
router.put('/discoverable', auth, requireRole('worker'), ctrl.setDiscoverable);
router.get('/recommendations', auth, requireRole('worker'), ctrl.getRecommendations);
router.post('/company', auth, requireRole('employer'), ctrl.upsertCompany);
router.get('/company/:userId', ctrl.getCompany);
router.post('/report', auth, ctrl.reportFraud);
router.get('/salary-insights/:gigId', auth, ctrl.salaryInsights);

module.exports = router;
