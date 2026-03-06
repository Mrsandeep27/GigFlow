const express = require('express');
const router = express.Router();
const gigsController = require('../controllers/gigs');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.get('/', gigsController.getAllGigs);
router.get('/categories', gigsController.getCategories);
router.get('/mine', authMiddleware, gigsController.getMyGigs);
router.get('/:id', gigsController.getGigById);

router.post('/', authMiddleware, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('job_type').optional().isIn(['full_time', 'part_time', 'contract', 'freelance', 'internship', 'gig']),
  body('budget_min').optional().isNumeric(),
  body('budget_max').optional().isNumeric(),
], validate, gigsController.createGig);

router.put('/:id', authMiddleware, [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
], validate, gigsController.updateGig);

router.delete('/:id', authMiddleware, gigsController.deleteGig);

module.exports = router;
