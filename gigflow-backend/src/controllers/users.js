const pool = require('../config/db');

// List workers (for Find Talent page)
exports.getWorkers = async (req, res) => {
  try {
    const { search, skill, min_rate, max_rate, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ["u.role = 'worker'", 'u.is_active = true'];
    let idx = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.bio ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (skill) {
      conditions.push(`EXISTS (SELECT 1 FROM user_skills us2 WHERE us2.user_id = u.id AND us2.skill ILIKE $${idx})`);
      params.push(`%${skill}%`);
      idx++;
    }
    if (min_rate) { conditions.push(`u.hourly_rate >= $${idx++}`); params.push(min_rate); }
    if (max_rate) { conditions.push(`u.hourly_rate <= $${idx++}`); params.push(max_rate); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [usersResult, countResult] = await Promise.all([
      pool.query(
        `SELECT u.id, u.name, u.bio, u.avatar_url, u.city, u.state,
                u.hourly_rate, u.rating, u.total_reviews, u.total_jobs_completed,
                u.is_verified, u.created_at,
                COALESCE(array_agg(us.skill ORDER BY us.skill) FILTER (WHERE us.skill IS NOT NULL), '{}') AS skills
         FROM users u
         LEFT JOIN user_skills us ON us.user_id = u.id
         ${where}
         GROUP BY u.id
         ORDER BY u.rating DESC NULLS LAST, u.total_jobs_completed DESC NULLS LAST
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM users u ${where}`, params),
    ]);

    res.json({
      workers: usersResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get workers error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single worker profile
exports.getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.name, u.bio, u.avatar_url, u.city, u.state,
              u.hourly_rate, u.rating, u.total_reviews, u.total_jobs_completed,
              u.is_verified, u.created_at,
              COALESCE(array_agg(DISTINCT us.skill) FILTER (WHERE us.skill IS NOT NULL), '{}') AS skills
       FROM users u
       LEFT JOIN user_skills us ON us.user_id = u.id
       WHERE u.id = $1 AND u.role = 'worker' AND u.is_active = true
       GROUP BY u.id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Worker not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get worker error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
