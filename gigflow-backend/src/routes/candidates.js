const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/candidates');
const auth = require('../middleware/auth');

router.get('/', ctrl.discoverCandidates);
router.put('/discoverable', auth, ctrl.setDiscoverable);
router.get('/recommendations', auth, ctrl.getRecommendations);
router.post('/company', auth, ctrl.upsertCompany);
router.get('/company/:userId', ctrl.getCompany);
router.post('/report', auth, ctrl.reportFraud);
router.get('/salary-insights/:gigId', ctrl.salaryInsights);

module.exports = router;
