const express = require('express');
const router = express.Router();
const savedGigsController = require('../controllers/savedGigs');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, savedGigsController.getSavedGigs);
router.post('/', authMiddleware, savedGigsController.saveGig);
router.get('/check/:gigId', authMiddleware, savedGigsController.checkSaved);
router.delete('/:gigId', authMiddleware, savedGigsController.unsaveGig);

module.exports = router;
