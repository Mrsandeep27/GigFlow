const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tests');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.createTest);
router.get('/my-submissions', auth, ctrl.mySubmissions);
router.get('/gig/:gigId', ctrl.getTestForGig);
router.post('/:testId/submit', auth, ctrl.submitTest);
router.get('/:testId/results', auth, ctrl.getResults);

module.exports = router;
