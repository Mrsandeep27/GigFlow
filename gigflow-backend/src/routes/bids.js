const express = require('express');
const router = express.Router();
const bidsController = require('../controllers/bids');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.get('/mine', authMiddleware, bidsController.getMyBids);
router.get('/gig/:gigId', authMiddleware, bidsController.getBidsForGig);

router.post('/', authMiddleware, [
  body('gigId').isInt({ min: 1 }).withMessage('Valid gig ID required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('delivery_days').optional().isInt({ min: 1 }),
], validate, bidsController.createBid);

router.put('/:bidId/accept', authMiddleware, bidsController.acceptBid);
router.put('/:bidId/reject', authMiddleware, bidsController.rejectBid);
router.put('/:bidId/withdraw', authMiddleware, bidsController.withdrawBid);

module.exports = router;
