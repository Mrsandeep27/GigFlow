const pool = require('../config/db');

// Get saved gigs
exports.getSavedGigs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.title, g.description, g.job_type, g.status,
              g.budget_min, g.budget_max, g.budget_type, g.currency,
              g.city, g.state, g.is_remote, g.skills_required,
              g.total_bids, g.created_at,
              c.name AS category_name,
              u.name AS creator_name,
              sg.created_at AS saved_at
       FROM saved_gigs sg
       JOIN gigs g ON sg.gig_id = g.id
       JOIN users u ON g.created_by = u.id
       LEFT JOIN categories c ON g.category_id = c.id
       WHERE sg.user_id = $1
       ORDER BY sg.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get saved gigs error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Save a gig
exports.saveGig = async (req, res) => {
  try {
    const { gig_id } = req.body;
    const userId = req.user.id;

    const existing = await pool.query(
      'SELECT id FROM saved_gigs WHERE user_id = $1 AND gig_id = $2',
      [userId, gig_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Already saved' });
    }

    await pool.query(
      'INSERT INTO saved_gigs (user_id, gig_id) VALUES ($1, $2)',
      [userId, gig_id]
    );
    res.status(201).json({ message: 'Job saved' });
  } catch (error) {
    console.error('Save gig error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unsave a gig
exports.unsaveGig = async (req, res) => {
  try {
    const { gigId } = req.params;
    await pool.query(
      'DELETE FROM saved_gigs WHERE user_id = $1 AND gig_id = $2',
      [req.user.id, gigId]
    );
    res.json({ message: 'Removed from saved' });
  } catch (error) {
    console.error('Unsave gig error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if a gig is saved
exports.checkSaved = async (req, res) => {
  try {
    const { gigId } = req.params;
    const result = await pool.query(
      'SELECT id FROM saved_gigs WHERE user_id = $1 AND gig_id = $2',
      [req.user.id, gigId]
    );
    res.json({ saved: result.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
