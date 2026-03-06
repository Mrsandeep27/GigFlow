const pool = require('../config/db');

// Get all bids for a gig
exports.getBidsForGig = async (req, res) => {
  try {
    const { gigId } = req.params;

    // Only gig owner can see all bids
    const gigCheck = await pool.query('SELECT created_by FROM gigs WHERE id = $1', [gigId]);
    if (gigCheck.rows.length === 0) return res.status(404).json({ message: 'Gig not found' });

    const result = await pool.query(
      `SELECT b.id, b.amount, b.message, b.status, b.delivery_days, b.created_at,
              u.id AS bidder_id, u.name AS bidder_name, u.avatar_url AS bidder_avatar,
              u.rating AS bidder_rating, u.total_reviews AS bidder_reviews
       FROM bids b
       JOIN users u ON b.bidder_id = u.id
       WHERE b.gig_id = $1
       ORDER BY b.created_at DESC`,
      [gigId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get bids error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create bid
exports.createBid = async (req, res) => {
  try {
    const { gigId, amount, message, delivery_days } = req.body;
    const userId = req.user.id;

    // Only workers can bid
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can place bids' });
    }

    const gigResult = await pool.query(
      'SELECT id, created_by, status FROM gigs WHERE id = $1',
      [gigId]
    );
    if (gigResult.rows.length === 0) return res.status(404).json({ message: 'Gig not found' });

    const gig = gigResult.rows[0];
    if (gig.status !== 'open') return res.status(400).json({ message: 'Gig is not open for bids' });
    if (gig.created_by === userId) return res.status(400).json({ message: 'Cannot bid on your own gig' });

    const existing = await pool.query(
      'SELECT id FROM bids WHERE gig_id = $1 AND bidder_id = $2',
      [gigId, userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'You have already bid on this gig' });
    }

    const result = await pool.query(
      'INSERT INTO bids (gig_id, bidder_id, amount, message, delivery_days) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [gigId, userId, amount, message, delivery_days || null]
    );

    res.status(201).json({
      message: 'Bid placed successfully',
      bidId: result.rows[0].id,
    });
  } catch (error) {
    console.error('Create bid error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept bid
exports.acceptBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.user.id;

    const bidResult = await pool.query(
      'SELECT b.*, g.created_by, g.status AS gig_status FROM bids b JOIN gigs g ON b.gig_id = g.id WHERE b.id = $1',
      [bidId]
    );
    if (bidResult.rows.length === 0) return res.status(404).json({ message: 'Bid not found' });

    const bid = bidResult.rows[0];
    if (bid.created_by !== userId) return res.status(403).json({ message: 'Not authorized' });
    if (bid.status !== 'pending') return res.status(400).json({ message: `Bid is already ${bid.status}` });

    // Accept this bid, reject all others, update gig status
    await pool.query('UPDATE bids SET status = $1 WHERE id = $2', ['accepted', bidId]);
    await pool.query(
      'UPDATE bids SET status = $1 WHERE gig_id = $2 AND id != $3 AND status = $4',
      ['rejected', bid.gig_id, bidId, 'pending']
    );
    await pool.query(
      'UPDATE gigs SET status = $1, assigned_to = $2 WHERE id = $3',
      ['in_progress', bid.bidder_id, bid.gig_id]
    );

    res.json({ message: 'Bid accepted successfully' });
  } catch (error) {
    console.error('Accept bid error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject bid
exports.rejectBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.user.id;

    const bidResult = await pool.query(
      'SELECT b.*, g.created_by FROM bids b JOIN gigs g ON b.gig_id = g.id WHERE b.id = $1',
      [bidId]
    );
    if (bidResult.rows.length === 0) return res.status(404).json({ message: 'Bid not found' });

    const bid = bidResult.rows[0];
    if (bid.created_by !== userId) return res.status(403).json({ message: 'Not authorized' });
    if (bid.status !== 'pending') return res.status(400).json({ message: `Bid is already ${bid.status}` });

    await pool.query('UPDATE bids SET status = $1 WHERE id = $2', ['rejected', bidId]);
    res.json({ message: 'Bid rejected successfully' });
  } catch (error) {
    console.error('Reject bid error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get my bids (worker)
exports.getMyBids = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.amount, b.message, b.status, b.delivery_days, b.created_at,
              g.id AS gig_id, g.title AS gig_title, g.city AS gig_city,
              g.budget_min, g.budget_max, g.status AS gig_status,
              u.name AS employer_name
       FROM bids b
       JOIN gigs g ON b.gig_id = g.id
       JOIN users u ON g.created_by = u.id
       WHERE b.bidder_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get my bids error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Withdraw bid
exports.withdrawBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id, status FROM bids WHERE id = $1 AND bidder_id = $2',
      [bidId, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Bid not found' });
    if (result.rows[0].status !== 'pending') {
      return res.status(400).json({ message: 'Can only withdraw pending bids' });
    }

    await pool.query('UPDATE bids SET status = $1 WHERE id = $2', ['withdrawn', bidId]);
    res.json({ message: 'Bid withdrawn successfully' });
  } catch (error) {
    console.error('Withdraw bid error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
