const pool = require('../config/db');

// Get all gigs (with search, filter, pagination)
exports.getAllGigs = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      search, category, city, job_type, status = 'open',
      budget_min, budget_max, is_remote,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    let idx = 1;

    conditions.push(`g.status = $${idx++}`);
    params.push(status);

    if (search) {
      // Use full-text search if available, fallback to ILIKE
      conditions.push(`(g.search_vector @@ plainto_tsquery('english', $${idx}) OR g.title ILIKE $${idx + 1})`);
      params.push(search, `%${search}%`);
      idx += 2;
    }
    if (category) { conditions.push(`g.category_id = $${idx++}`); params.push(category); }
    if (city) { conditions.push(`g.city ILIKE $${idx++}`); params.push(`%${city}%`); }
    if (job_type) { conditions.push(`g.job_type = $${idx++}`); params.push(job_type); }
    if (budget_min) { conditions.push(`g.budget_max >= $${idx++}`); params.push(budget_min); }
    if (budget_max) { conditions.push(`g.budget_min <= $${idx++}`); params.push(budget_max); }
    if (is_remote === 'true') { conditions.push(`g.is_remote = true`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [gigsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT g.id, g.title, g.description, g.job_type, g.status,
                g.budget_min, g.budget_max, g.budget_type, g.currency,
                g.city, g.state, g.is_remote, g.skills_required,
                g.total_bids, g.views, g.deadline, g.created_at,
                g.category_id, c.name AS category_name,
                u.id AS creator_id, u.name AS creator_name, u.rating AS creator_rating
         FROM gigs g
         JOIN users u ON g.created_by = u.id
         LEFT JOIN categories c ON g.category_id = c.id
         ${where}
         ORDER BY g.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM gigs g ${where}`,
        params
      ),
    ]);

    // Increment views for listed gigs is handled per-gig in getGigById
    res.json({
      gigs: gigsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get gigs error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get gig by ID
exports.getGigById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT g.*, c.name AS category_name,
              u.id AS creator_id, u.name AS creator_name,
              u.rating AS creator_rating, u.avatar_url AS creator_avatar,
              u.total_jobs_completed AS creator_jobs_completed
       FROM gigs g
       JOIN users u ON g.created_by = u.id
       LEFT JOIN categories c ON g.category_id = c.id
       WHERE g.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Gig not found' });
    }

    res.json(result.rows[0]);

    // Increment view count (fire-and-forget after response)
    pool.query('UPDATE gigs SET views = views + 1 WHERE id = $1', [id]).catch(() => {});
  } catch (error) {
    console.error('Get gig error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create gig
exports.createGig = async (req, res) => {
  try {
    const {
      title, description, category_id, subcategory_id,
      job_type, budget_min, budget_max, budget_type,
      city, state, location, is_remote,
      skills_required, deadline,
    } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can post gigs' });
    }

    const result = await pool.query(
      `INSERT INTO gigs
        (title, description, category_id, subcategory_id, created_by,
         job_type, budget_min, budget_max, budget_type,
         city, state, location, is_remote, skills_required, deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        title, description, category_id || null, subcategory_id || null, userId,
        job_type || 'gig', budget_min || null, budget_max || null, budget_type || 'fixed',
        city || null, state || null, location || null, is_remote || false,
        skills_required || null, deadline || null,
      ]
    );

    res.status(201).json({
      message: 'Gig created successfully',
      gigId: result.rows[0].id,
    });
  } catch (error) {
    console.error('Create gig error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Valid gig status transitions
const GIG_TRANSITIONS = {
  open: ['closed', 'in_progress'],
  in_progress: ['completed', 'open'],
  completed: [],
  closed: ['open'],
};

// Update gig
exports.updateGig = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, category_id, job_type,
      budget_min, budget_max, city, state, is_remote,
      skills_required, deadline, status,
    } = req.body;
    const userId = req.user.id;

    const check = await pool.query('SELECT created_by, status AS current_status FROM gigs WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Gig not found' });
    if (check.rows[0].created_by !== userId) return res.status(403).json({ message: 'Not authorized' });

    // Validate status transition
    const currentStatus = check.rows[0].current_status;
    const newStatus = status || currentStatus;
    if (newStatus !== currentStatus) {
      const allowed = GIG_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        return res.status(400).json({ message: `Cannot change status from '${currentStatus}' to '${newStatus}'` });
      }
    }

    // Validate budget
    if (budget_min && budget_max && Number(budget_min) > Number(budget_max)) {
      return res.status(400).json({ message: 'Minimum budget cannot exceed maximum' });
    }

    await pool.query(
      `UPDATE gigs SET title=COALESCE($1,title), description=COALESCE($2,description),
       category_id=COALESCE($3,category_id), job_type=COALESCE($4,job_type),
       budget_min=COALESCE($5,budget_min), budget_max=COALESCE($6,budget_max),
       city=COALESCE($7,city), state=COALESCE($8,state), is_remote=COALESCE($9,is_remote),
       skills_required=COALESCE($10,skills_required), deadline=COALESCE($11,deadline),
       status=$12, updated_at=NOW()
       WHERE id=$13`,
      [title, description, category_id, job_type, budget_min, budget_max,
       city, state, is_remote, skills_required, deadline, newStatus, id]
    );

    res.json({ message: 'Gig updated successfully' });
  } catch (error) {
    console.error('Update gig error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete gig
exports.deleteGig = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const check = await pool.query('SELECT created_by FROM gigs WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Gig not found' });
    if (check.rows[0].created_by !== userId) return res.status(403).json({ message: 'Not authorized' });

    await pool.query('DELETE FROM gigs WHERE id = $1', [id]);
    res.json({ message: 'Gig deleted successfully' });
  } catch (error) {
    console.error('Delete gig error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get my gigs (employer)
exports.getMyGigs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.*, c.name AS category_name
       FROM gigs g
       LEFT JOIN categories c ON g.category_id = c.id
       WHERE g.created_by = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get my gigs error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get categories — cached in memory (refreshes every 10 min)
let categoriesCache = { data: null, ts: 0 };
const CATEGORIES_TTL = 10 * 60 * 1000;

exports.getCategories = async (req, res) => {
  try {
    if (categoriesCache.data && Date.now() - categoriesCache.ts < CATEGORIES_TTL) {
      return res.json(categoriesCache.data);
    }
    const result = await pool.query(
      `SELECT c.*, json_agg(json_build_object('id', s.id, 'name', s.name) ORDER BY s.name)
         FILTER (WHERE s.id IS NOT NULL) AS subcategories
       FROM categories c
       LEFT JOIN subcategories s ON s.category_id = c.id
       GROUP BY c.id ORDER BY c.name`
    );
    categoriesCache = { data: result.rows, ts: Date.now() };
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
