const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviews');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.get('/user/:userId', reviewsController.getReviewsForUser);
router.get('/gig/:gigId', reviewsController.getReviewsForGig);

router.post('/', authMiddleware, [
  body('gig_id').isInt({ min: 1 }).withMessage('Valid gig ID required'),
  body('reviewed_id').notEmpty().withMessage('Reviewed user ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('comment').optional().trim(),
], validate, reviewsController.createReview);

module.exports = router;
