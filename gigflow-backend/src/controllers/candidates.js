const pool = require('../config/db');

// GET /api/candidates — Reverse marketplace: discover candidates (Feature Bonus)
exports.discoverCandidates = async (req, res) => {
  try {
    const { search, skill, min_salary, max_salary, city, experience, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ["u.is_discoverable = true", "u.is_active = true", "u.role = 'worker'"];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.bio ILIKE $${idx} OR u.profile_headline ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (skill) {
      conditions.push(`EXISTS (SELECT 1 FROM user_skills us WHERE us.user_id = u.id AND us.skill ILIKE $${idx})`);
      params.push(`%${skill}%`);
      idx++;
    }
    if (min_salary) {
      conditions.push(`u.desired_salary_min >= $${idx++}`);
      params.push(min_salary);
    }
    if (max_salary) {
      conditions.push(`u.desired_salary_max <= $${idx++}`);
      params.push(max_salary);
    }
    if (city) {
      conditions.push(`u.city ILIKE $${idx++}`);
      params.push(`%${city}%`);
    }
    if (experience) {
      conditions.push(`u.years_experience >= $${idx++}`);
      params.push(experience);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [usersRes, countRes] = await Promise.all([
      pool.query(
        `SELECT u.id, u.name, u.bio, u.profile_headline, u.avatar_url,
                u.city, u.state, u.hourly_rate, u.rating, u.total_reviews,
                u.total_jobs_completed, u.is_verified, u.years_experience,
                u.desired_salary_min, u.desired_salary_max,
                u.github_url, u.linkedin_url, u.website_url,
                u.created_at,
                ARRAY(SELECT skill FROM user_skills WHERE user_id = u.id) AS skills
         FROM users u
         ${where}
         ORDER BY u.rating DESC NULLS LAST, u.total_jobs_completed DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM users u ${where}`, params),
    ]);

    res.json({
      candidates: usersRes.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countRes.rows[0].count / parseInt(limit)),
    });
  } catch (error) {
    console.error('Discover candidates error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/candidates/discoverable — Toggle discoverability
exports.setDiscoverable = async (req, res) => {
  try {
    const { is_discoverable, profile_headline, desired_salary_min, desired_salary_max,
            years_experience, github_url, linkedin_url, website_url } = req.body;

    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can set discoverability' });
    }

    await pool.query(
      `UPDATE users SET
         is_discoverable=$1, profile_headline=$2, desired_salary_min=$3,
         desired_salary_max=$4, years_experience=$5, github_url=$6,
         linkedin_url=$7, website_url=$8, updated_at=NOW()
       WHERE id=$9`,
      [is_discoverable ?? true, profile_headline || null,
       desired_salary_min || null, desired_salary_max || null,
       years_experience || null, github_url || null,
       linkedin_url || null, website_url || null, req.user.id]
    );

    res.json({ message: 'Profile discoverability updated' });
  } catch (error) {
    console.error('Set discoverable error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/candidates/company — Create/update company profile (Feature 3)
exports.upsertCompany = async (req, res) => {
  try {
    const { company_name, company_size, industry, website, linkedin_url, description, logo_url } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can create company profiles' });
    }

    await pool.query(
      `INSERT INTO company_profiles (user_id, company_name, company_size, industry, website, linkedin_url, description, logo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id) DO UPDATE SET
         company_name=$2, company_size=$3, industry=$4, website=$5,
         linkedin_url=$6, description=$7, logo_url=$8, updated_at=NOW()`,
      [userId, company_name, company_size || null, industry || null,
       website || null, linkedin_url || null, description || null, logo_url || null]
    );

    res.json({ message: 'Company profile saved' });
  } catch (error) {
    console.error('Upsert company error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/candidates/company/:userId — Get company profile
exports.getCompany = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM company_profiles WHERE user_id = $1',
      [req.params.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Company profile not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/candidates/report — Report a fake job (Feature 3)
exports.reportFraud = async (req, res) => {
  try {
    const { gig_id, employer_id, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    await pool.query(
      `INSERT INTO fraud_reports (reported_by, gig_id, employer_id, reason)
       VALUES ($1,$2,$3,$4)`,
      [req.user.id, gig_id || null, employer_id || null, reason.trim()]
    );

    // Auto-flag gig if 3+ reports
    if (gig_id) {
      const countRes = await pool.query(
        'SELECT COUNT(*) FROM fraud_reports WHERE gig_id = $1',
        [gig_id]
      );
      if (parseInt(countRes.rows[0].count) >= 3) {
        await pool.query('UPDATE gigs SET is_fake_flagged = true WHERE id = $1', [gig_id]);
      }
    }

    res.json({ message: 'Report submitted. Our team will review it.' });
  } catch (error) {
    console.error('Report fraud error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/candidates/salary-insights/:gigId — Salary transparency (Feature 7)
exports.salaryInsights = async (req, res) => {
  try {
    const { gigId } = req.params;

    const gigRes = await pool.query(
      `SELECT g.title, g.salary_min, g.salary_max, g.budget_min, g.budget_max,
              g.category_id, g.interview_difficulty,
              g.company_name, g.company_verified,
              cp.avg_rating AS company_avg_rating,
              cp.avg_interview_difficulty AS company_avg_difficulty
       FROM gigs g
       LEFT JOIN company_profiles cp ON cp.user_id = g.created_by
       WHERE g.id = $1`,
      [gigId]
    );

    if (gigRes.rows.length === 0) return res.status(404).json({ message: 'Job not found' });
    const gig = gigRes.rows[0];

    // Get market average salary for similar roles
    const marketRes = await pool.query(
      `SELECT avg_salary, min_salary, max_salary, experience_level
       FROM salary_benchmarks
       WHERE category_id = $1 OR job_title ILIKE '%developer%'
       ORDER BY updated_at DESC LIMIT 3`,
      [gig.category_id || 0]
    );

    const salaryMin = gig.salary_min || gig.budget_min;
    const salaryMax = gig.salary_max || gig.budget_max;

    res.json({
      salary_range: { min: salaryMin, max: salaryMax },
      market_benchmarks: marketRes.rows,
      interview_difficulty: gig.interview_difficulty,
      company_info: {
        name: gig.company_name,
        verified: gig.company_verified,
        avg_rating: gig.company_avg_rating,
        avg_interview_difficulty: gig.company_avg_difficulty,
      },
    });
  } catch (error) {
    console.error('Salary insights error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/candidates/recommendations — Smart job recommendations (Feature 8)
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'Only workers get recommendations' });
    }

    // Get user skills, location, past applications
    const [userRes, skillsRes, appsRes] = await Promise.all([
      pool.query('SELECT city, state, years_experience, desired_salary_min FROM users WHERE id = $1', [userId]),
      pool.query('SELECT skill FROM user_skills WHERE user_id = $1', [userId]),
      pool.query(
        'SELECT gig_id FROM applications WHERE applicant_id = $1 ORDER BY created_at DESC LIMIT 20',
        [userId]
      ),
    ]);

    const user = userRes.rows[0];
    const skills = skillsRes.rows.map(r => r.skill.toLowerCase());
    const appliedGigIds = appsRes.rows.map(r => r.gig_id);

    if (skills.length === 0) {
      return res.json({ jobs: [], message: 'Add skills to your profile to get personalized recommendations' });
    }

    // Build skill match query
    const skillConditions = skills.map((_, i) => `g.skills_required::text ILIKE $${i + 1}`);
    const skillParams = skills.map(s => `%${s}%`);

    const excludeIds = appliedGigIds.length > 0
      ? `AND g.id NOT IN (${appliedGigIds.join(',')})`
      : '';

    const query = `
      SELECT g.id, g.title, g.description, g.job_type, g.salary_min, g.salary_max,
             g.budget_min, g.budget_max, g.city, g.is_remote, g.skills_required,
             g.company_name, g.company_verified, g.has_skill_test, g.created_at,
             c.name AS category_name,
             u.name AS creator_name,
             (
               SELECT COUNT(*) FROM user_skills us
               WHERE us.user_id = $${skillParams.length + 1}
               AND g.skills_required::text ILIKE '%' || us.skill || '%'
             ) AS matching_skills_count,
             ARRAY_LENGTH(g.skills_required, 1) AS total_skills
      FROM gigs g
      JOIN users u ON g.created_by = u.id
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE g.status = 'open' AND g.is_fake_flagged = false
      ${excludeIds}
      AND (${skillConditions.join(' OR ')})
      ORDER BY matching_skills_count DESC, g.created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [...skillParams, userId]);

    const jobs = result.rows.map(job => {
      const total = job.total_skills || 1;
      const matched = parseInt(job.matching_skills_count) || 0;
      const score = Math.round((matched / total) * 100);
      return { ...job, match_score: score };
    });

    res.json({ jobs });
  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
