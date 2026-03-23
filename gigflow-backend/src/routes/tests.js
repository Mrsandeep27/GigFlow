const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tests');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

router.get('/', auth, ctrl.listTests);
router.post('/', auth, requireRole('employer'), ctrl.createTest);
router.get('/my-submissions', auth, requireRole('worker'), ctrl.mySubmissions);
router.get('/gig/:gigId', ctrl.getTestForGig);
router.post('/:testId/submit', auth, requireRole('worker'), ctrl.submitTest);
router.get('/:testId/results', auth, requireRole('employer'), ctrl.getResults);

module.exports = router;
