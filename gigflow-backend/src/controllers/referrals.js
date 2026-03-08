const pool = require('../config/db');

// GET /api/referrals — List all active referrals
exports.listReferrals = async (req, res) => {
  try {
    const { search, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['r.is_active = true', 'r.referral_count < r.max_referrals'];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(r.company_name ILIKE $${idx} OR r.position ILIKE $${idx} OR r.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [rows, countRes] = await Promise.all([
      pool.query(
        `SELECT r.id, r.company_name, r.position, r.description, r.is_active,
                r.max_referrals, r.referral_count, r.expires_at, r.created_at,
                u.id AS referrer_id, u.name AS referrer_name,
                u.avatar_url AS referrer_avatar, u.city AS referrer_city,
                g.id AS gig_id, g.title AS gig_title
         FROM referrals r
         JOIN users u ON r.referrer_id = u.id
         LEFT JOIN gigs g ON r.gig_id = g.id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM referrals r ${where}`, params),
    ]);

    res.json({
      referrals: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countRes.rows[0].count / parseInt(limit)),
    });
  } catch (error) {
    console.error('List referrals error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/referrals — Create referral opportunity
exports.createReferral = async (req, res) => {
  try {
    const { gig_id, company_name, position, description, max_referrals, expires_at } = req.body;
    const userId = req.user.id;

    if (!company_name || !position) {
      return res.status(400).json({ message: 'Company name and position are required' });
    }

    const result = await pool.query(
      `INSERT INTO referrals (gig_id, referrer_id, company_name, position, description, max_referrals, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [gig_id || null, userId, company_name, position, description || null,
       max_referrals || 5, expires_at || null]
    );

    res.status(201).json({ message: 'Referral posted', referralId: result.rows[0].id });
  } catch (error) {
    console.error('Create referral error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/referrals/mine — My posted referrals
exports.myReferrals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM referral_requests rr WHERE rr.referral_id = r.id) AS total_requests,
              (SELECT COUNT(*) FROM referral_requests rr WHERE rr.referral_id = r.id AND rr.status = 'approved') AS approved_count
       FROM referrals r
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/referrals/requests/mine — My referral requests
exports.myRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rr.id, rr.status, rr.message, rr.response_message, rr.created_at,
              r.company_name, r.position, r.description,
              u.name AS referrer_name, u.avatar_url AS referrer_avatar
       FROM referral_requests rr
       JOIN referrals r ON rr.referral_id = r.id
       JOIN users u ON r.referrer_id = u.id
       WHERE rr.requester_id = $1
       ORDER BY rr.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/referrals/:id/requests — Get requests for a referral (referrer only)
exports.getReferralRequests = async (req, res) => {
  try {
    const { id } = req.params;

    const refCheck = await pool.query('SELECT referrer_id FROM referrals WHERE id = $1', [id]);
    if (refCheck.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    if (refCheck.rows[0].referrer_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const result = await pool.query(
      `SELECT rr.id, rr.status, rr.message, rr.linkedin_url, rr.resume_url,
              rr.response_message, rr.created_at,
              u.id AS requester_id, u.name AS requester_name,
              u.avatar_url, u.bio, u.rating, u.skills,
              ARRAY(SELECT skill FROM user_skills WHERE user_id = u.id) AS user_skills
       FROM referral_requests rr
       JOIN users u ON rr.requester_id = u.id
       WHERE rr.referral_id = $1
       ORDER BY rr.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/referrals/:id/request — Request a referral
exports.requestReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, linkedin_url, resume_url } = req.body;
    const userId = req.user.id;

    const refRes = await pool.query(
      'SELECT * FROM referrals WHERE id = $1 AND is_active = true',
      [id]
    );
    if (refRes.rows.length === 0) return res.status(404).json({ message: 'Referral not found or inactive' });

    const ref = refRes.rows[0];
    if (ref.referrer_id === userId) return res.status(400).json({ message: 'Cannot request your own referral' });
    if (ref.referral_count >= ref.max_referrals) {
      return res.status(400).json({ message: 'This referral has reached its maximum capacity' });
    }

    const existing = await pool.query(
      'SELECT id FROM referral_requests WHERE referral_id = $1 AND requester_id = $2',
      [id, userId]
    );
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Already requested this referral' });

    const result = await pool.query(
      `INSERT INTO referral_requests (referral_id, requester_id, message, linkedin_url, resume_url)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [id, userId, message || null, linkedin_url || null, resume_url || null]
    );

    // Notify referrer
    try {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
        [ref.referrer_id, 'referral_request', 'New Referral Request',
         `Someone requested a referral for ${ref.position} at ${ref.company_name}`,
         JSON.stringify({ referral_id: id })]
      );
    } catch (_) {}

    res.status(201).json({ message: 'Referral request submitted', requestId: result.rows[0].id });
  } catch (error) {
    console.error('Request referral error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/referrals/requests/:requestId — Approve or reject request
exports.respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, response_message } = req.body;
    const userId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const reqRes = await pool.query(
      `SELECT rr.*, r.referrer_id, r.company_name, r.position, r.referral_count, r.max_referrals
       FROM referral_requests rr
       JOIN referrals r ON rr.referral_id = r.id
       WHERE rr.id = $1`,
      [requestId]
    );
    if (reqRes.rows.length === 0) return res.status(404).json({ message: 'Request not found' });

    const req_ = reqRes.rows[0];
    if (req_.referrer_id !== userId) return res.status(403).json({ message: 'Not authorized' });

    if (status === 'approved' && req_.referral_count >= req_.max_referrals) {
      return res.status(400).json({ message: 'Referral capacity full' });
    }

    await pool.query(
      `UPDATE referral_requests SET status=$1, response_message=$2, updated_at=NOW() WHERE id=$3`,
      [status, response_message || null, requestId]
    );

    if (status === 'approved') {
      await pool.query('UPDATE referrals SET referral_count = referral_count + 1 WHERE id = $1', [req_.referral_id]);
    }

    // Notify requester
    try {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
        [req_.requester_id, `referral_${status}`,
         status === 'approved' ? '🎉 Referral Approved!' : 'Referral Update',
         status === 'approved'
           ? `Your referral request for ${req_.position} at ${req_.company_name} was approved!`
           : `Your referral request for ${req_.position} at ${req_.company_name} was not approved.`,
         JSON.stringify({ referral_id: req_.referral_id })]
      );
    } catch (_) {}

    res.json({ message: `Request ${status}` });
  } catch (error) {
    console.error('Respond referral error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/referrals/:id — Delete referral
exports.deleteReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT referrer_id FROM referrals WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    if (check.rows[0].referrer_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await pool.query('DELETE FROM referrals WHERE id = $1', [id]);
    res.json({ message: 'Referral deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
