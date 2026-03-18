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

// Specific routes MUST come before :id
router.get('/categories', gigsController.getCategories);
router.get('/mine', authMiddleware, gigsController.getMyGigs);
router.get('/', gigsController.getAllGigs);
router.get('/:id', gigsController.getGigById);

router.post('/', authMiddleware, [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 5000 }),
  body('job_type').optional().isIn(['full_time', 'part_time', 'contract', 'freelance', 'internship', 'gig']),
  body('budget_min').optional().isNumeric(),
  body('budget_max').optional().isNumeric(),
], validate, gigsController.createGig);

router.put('/:id', authMiddleware, [
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().notEmpty().isLength({ max: 5000 }),
  body('status').optional().isIn(['open', 'closed', 'in_progress', 'completed']),
], validate, gigsController.updateGig);

router.delete('/:id', authMiddleware, gigsController.deleteGig);

module.exports = router;
