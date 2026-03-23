const pool = require('../config/db');

// GET /api/admin/stats — Dashboard stats
exports.getStats = async (req, res) => {
  try {
    const [users, gigs, bids, reports] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM users'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'open\') as open FROM gigs'),
      pool.query('SELECT COUNT(*) as total FROM bids'),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'pending') as pending
                  FROM fraud_reports`).catch(() => ({ rows: [{ total: 0, pending: 0 }] })),
    ]);
    res.json({
      users: { total: +users.rows[0].total, active: +users.rows[0].active },
      gigs: { total: +gigs.rows[0].total, open: +gigs.rows[0].open },
      bids: { total: +bids.rows[0].total },
      reports: { total: +reports.rows[0].total, pending: +reports.rows[0].pending },
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/users — List all users with pagination
exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (role) { conditions.push(`u.role = $${idx++}`); params.push(role); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [usersResult, countResult] = await Promise.all([
      pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_verified, u.is_email_verified,
                u.city, u.rating, u.total_jobs_completed, u.created_at
         FROM users u ${where}
         ORDER BY u.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM users u ${where}`, params),
    ]);

    res.json({
      users: usersResult.rows,
      total: +countResult.rows[0].count,
      page: +page,
      totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit)),
    });
  } catch (err) {
    console.error('Admin list users error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/users/:id — Update user (ban, verify, change role)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, is_verified, role } = req.body;

    const fields = [];
    const params = [];
    let idx = 1;

    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(is_active); }
    if (is_verified !== undefined) { fields.push(`is_verified = $${idx++}`); params.push(is_verified); }
    if (role && ['worker', 'employer', 'admin'].includes(role)) {
      fields.push(`role = $${idx++}`); params.push(role);
    }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

    params.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('Admin update user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/gigs/:id — Remove a gig
exports.deleteGig = async (req, res) => {
  try {
    await pool.query('DELETE FROM gigs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Gig deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/reports — List fraud reports
exports.listReports = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fr.*, u.name AS reporter_name, u.email AS reporter_email,
              g.title AS gig_title, e.name AS employer_name
       FROM fraud_reports fr
       JOIN users u ON fr.reported_by = u.id
       LEFT JOIN gigs g ON fr.gig_id = g.id
       LEFT JOIN users e ON fr.employer_id = e.id
       ORDER BY fr.created_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    // Table might not exist
    res.json([]);
  }
};

// PUT /api/admin/reports/:id — Resolve a report
exports.resolveReport = async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    await pool.query(
      'UPDATE fraud_reports SET status = $1, admin_notes = $2 WHERE id = $3',
      [status || 'resolved', admin_notes || null, req.params.id]
    );
    res.json({ message: 'Report updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
