const pool = require('../config/db');

// Create a review (verify gig participation)
exports.createReview = async (req, res) => {
  try {
    const { gig_id, reviewed_id, rating, comment } = req.body;
    const reviewer_id = req.user.id;

    if (reviewer_id === reviewed_id) {
      return res.status(400).json({ message: 'Cannot review yourself' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Verify gig exists and is completed
    const gigCheck = await pool.query(
      'SELECT id, created_by, assigned_to, status FROM gigs WHERE id = $1',
      [gig_id]
    );
    if (gigCheck.rows.length === 0) return res.status(404).json({ message: 'Gig not found' });
    const gig = gigCheck.rows[0];

    // Verify reviewer participated in this gig
    const isEmployer = gig.created_by === reviewer_id;
    const isWorker = gig.assigned_to === reviewer_id;
    const hadBid = !isEmployer && !isWorker;

    if (hadBid) {
      // Check if reviewer had an accepted bid or application
      const participation = await pool.query(
        `SELECT id FROM bids WHERE gig_id = $1 AND bidder_id = $2 AND status = 'accepted'
         UNION ALL
         SELECT id FROM applications WHERE gig_id = $1 AND applicant_id = $2 AND status IN ('offer', 'shortlisted')`,
        [gig_id, reviewer_id]
      );
      if (participation.rows.length === 0) {
        return res.status(403).json({ message: 'You can only review gigs you participated in' });
      }
    }

    // Verify reviewing the right person
    if (isEmployer && reviewed_id !== gig.assigned_to) {
      return res.status(400).json({ message: 'You can only review the assigned worker' });
    }
    if (isWorker && reviewed_id !== gig.created_by) {
      return res.status(400).json({ message: 'You can only review the employer' });
    }

    const existing = await pool.query(
      'SELECT id FROM reviews WHERE gig_id = $1 AND reviewer_id = $2',
      [gig_id, reviewer_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this gig' });
    }

    await pool.query(
      `INSERT INTO reviews (gig_id, reviewer_id, reviewed_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [gig_id, reviewer_id, reviewed_id, rating, comment || null]
    );

    // Recalculate reviewed user's average rating
    const ratingRes = await pool.query(
      'SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS total FROM reviews WHERE reviewed_id = $1',
      [reviewed_id]
    );
    await pool.query(
      'UPDATE users SET rating = $1, total_reviews = $2 WHERE id = $3',
      [ratingRes.rows[0].avg_rating, parseInt(ratingRes.rows[0].total), reviewed_id]
    );

    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error('Create review error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get reviews for a user
exports.getReviewsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name AS reviewer_name, u.avatar_url AS reviewer_avatar,
              g.title AS gig_title, g.id AS gig_id
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       JOIN gigs g ON r.gig_id = g.id
       WHERE r.reviewed_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get reviews error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get reviews for a gig
exports.getReviewsForGig = async (req, res) => {
  try {
    const { gigId } = req.params;
    const result = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.gig_id = $1
       ORDER BY r.created_at DESC`,
      [gigId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get gig reviews error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
