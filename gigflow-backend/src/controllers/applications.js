const pool = require('../config/db');
const { sendNotificationEmail } = require('../utils/email');

// Helper: notify user (in-app + email)
async function notify(userId, type, title, message, data = {}) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
      [userId, type, title, message, JSON.stringify(data)]
    );
    pool.query('SELECT email, email_notifications FROM users WHERE id = $1', [userId])
      .then(r => {
        if (r.rows[0]?.email_notifications !== false) {
          sendNotificationEmail(r.rows[0].email, title, message).catch(() => {});
        }
      }).catch(() => {});
  } catch (_) {}
}

// POST /api/applications — Apply to a job (worker)
exports.apply = async (req, res) => {
  try {
    const { gig_id, cover_letter, expected_salary } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can apply to jobs' });
    }

    const gigRes = await pool.query(
      'SELECT id, title, created_by, status, is_fake_flagged FROM gigs WHERE id = $1',
      [gig_id]
    );
    if (gigRes.rows.length === 0) return res.status(404).json({ message: 'Job not found' });

    const gig = gigRes.rows[0];
    if (gig.status !== 'open') return res.status(400).json({ message: 'Job is no longer open' });
    if (gig.is_fake_flagged) return res.status(400).json({ message: 'This job has been flagged for review' });
    if (gig.created_by === userId) return res.status(400).json({ message: 'Cannot apply to your own job' });

    const existing = await pool.query(
      'SELECT id FROM applications WHERE gig_id = $1 AND applicant_id = $2',
      [gig_id, userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }

    const result = await pool.query(
      `INSERT INTO applications (gig_id, applicant_id, cover_letter, expected_salary)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [gig_id, userId, cover_letter || null, expected_salary || null]
    );

    // Update gig total_bids count
    await pool.query('UPDATE gigs SET total_bids = total_bids + 1, last_activity_at = NOW() WHERE id = $1', [gig_id]);

    // Notify employer
    await notify(gig.created_by, 'new_application', 'New Application',
      `Someone applied to "${gig.title}"`, { gig_id, application_id: result.rows[0].id });

    res.status(201).json({ message: 'Application submitted', applicationId: result.rows[0].id });
  } catch (error) {
    console.error('Apply error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/applications/mine — Worker: my applications
exports.myApplications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.status, a.rejection_reason, a.cover_letter,
              a.expected_salary, a.interview_date, a.created_at, a.updated_at,
              g.id AS gig_id, g.title AS gig_title, g.job_type,
              g.salary_min, g.salary_max, g.budget_min, g.budget_max,
              g.city, g.is_remote, g.company_name, g.company_verified,
              g.status AS gig_status,
              u.name AS employer_name, u.avatar_url AS employer_avatar
       FROM applications a
       JOIN gigs g ON a.gig_id = g.id
       JOIN users u ON g.created_by = u.id
       WHERE a.applicant_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('My applications error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/applications/gig/:gigId — Employer: applicants for a job
exports.gigApplications = async (req, res) => {
  try {
    const { gigId } = req.params;

    const gigCheck = await pool.query('SELECT created_by FROM gigs WHERE id = $1', [gigId]);
    if (gigCheck.rows.length === 0) return res.status(404).json({ message: 'Job not found' });
    if (gigCheck.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const result = await pool.query(
      `SELECT a.id, a.status, a.rejection_reason, a.cover_letter,
              a.expected_salary, a.interview_date, a.recruiter_notes,
              a.created_at, a.updated_at,
              u.id AS applicant_id, u.name AS applicant_name,
              u.avatar_url, u.bio, u.city, u.rating, u.total_reviews,
              u.total_jobs_completed, u.hourly_rate, u.years_experience,
              u.github_url, u.linkedin_url,
              u.is_verified,
              ARRAY(SELECT skill FROM user_skills WHERE user_id = u.id) AS skills,
              ts.passed AS test_passed, ts.score AS test_score
       FROM applications a
       JOIN users u ON a.applicant_id = u.id
       LEFT JOIN skill_tests st ON st.gig_id = $1 AND st.is_active = true
       LEFT JOIN test_submissions ts ON ts.test_id = st.id AND ts.applicant_id = u.id
       WHERE a.gig_id = $1
       ORDER BY
         CASE a.status
           WHEN 'shortlisted' THEN 1
           WHEN 'interview_scheduled' THEN 2
           WHEN 'offer' THEN 3
           WHEN 'applied' THEN 4
           WHEN 'viewed' THEN 5
           WHEN 'rejected' THEN 6
         END,
         a.created_at DESC`,
      [gigId]
    );

    // Mark unread applications as 'viewed'
    await pool.query(
      `UPDATE applications SET status = 'viewed', updated_at = NOW()
       WHERE gig_id = $1 AND status = 'applied'`,
      [gigId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Gig applications error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/applications/:id/status — Employer: update application status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, interview_date, recruiter_notes } = req.body;
    const userId = req.user.id;

    const appRes = await pool.query(
      `SELECT a.*, g.created_by, g.title AS gig_title,
              u.name AS applicant_name
       FROM applications a
       JOIN gigs g ON a.gig_id = g.id
       JOIN users u ON a.applicant_id = u.id
       WHERE a.id = $1`,
      [id]
    );
    if (appRes.rows.length === 0) return res.status(404).json({ message: 'Application not found' });

    const app = appRes.rows[0];
    if (app.created_by !== userId) return res.status(403).json({ message: 'Not authorized' });

    const validTransitions = {
      applied: ['viewed', 'shortlisted', 'rejected'],
      viewed: ['shortlisted', 'interview_scheduled', 'rejected'],
      shortlisted: ['interview_scheduled', 'offer', 'rejected'],
      interview_scheduled: ['offer', 'rejected'],
      offer: ['rejected'],
      rejected: [],
    };
    const allowed = validTransitions[app.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Cannot change status from '${app.status}' to '${status}'` });
    }

    await pool.query(
      `UPDATE applications
       SET status=$1, rejection_reason=$2, interview_date=$3,
           recruiter_notes=$4, updated_at=NOW()
       WHERE id=$5`,
      [status, rejection_reason || null, interview_date || null, recruiter_notes || null, id]
    );

    // Notify applicant
    const notifMessages = {
      viewed: `Your application for "${app.gig_title}" was viewed by the recruiter.`,
      shortlisted: `🎉 You've been shortlisted for "${app.gig_title}"!`,
      interview_scheduled: `📅 Interview scheduled for "${app.gig_title}"${interview_date ? ` on ${new Date(interview_date).toLocaleDateString()}` : ''}.`,
      offer: `🎊 You've received an offer for "${app.gig_title}"!`,
      rejected: `Your application for "${app.gig_title}" was not selected${rejection_reason ? ': ' + rejection_reason : '.'}`,
    };

    if (notifMessages[status]) {
      await notify(app.applicant_id, `application_${status}`,
        `Application ${status.replace('_', ' ')}`, notifMessages[status],
        { gig_id: app.gig_id, application_id: id });
    }

    res.json({ message: 'Status updated' });
  } catch (error) {
    console.error('Update status error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/applications/:id — Get single application detail
exports.getApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT a.*, g.title AS gig_title, g.created_by AS employer_id,
              u.name AS applicant_name
       FROM applications a
       JOIN gigs g ON a.gig_id = g.id
       JOIN users u ON a.applicant_id = u.id
       WHERE a.id = $1 AND (a.applicant_id = $2 OR g.created_by = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/applications/:id — Withdraw application
exports.withdraw = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, gig_id FROM applications WHERE id = $1 AND applicant_id = $2',
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Application not found' });

    await pool.query('DELETE FROM applications WHERE id = $1', [id]);
    await pool.query('UPDATE gigs SET total_bids = GREATEST(total_bids - 1, 0) WHERE id = $1', [result.rows[0].gig_id]);

    res.json({ message: 'Application withdrawn' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/applications/skill-match/:gigId — Skill match score for current user
exports.skillMatch = async (req, res) => {
  try {
    const { gigId } = req.params;
    const userId = req.user.id;

    const [gigRes, userRes] = await Promise.all([
      pool.query('SELECT skills_required, title FROM gigs WHERE id = $1', [gigId]),
      pool.query('SELECT skill FROM user_skills WHERE user_id = $1', [userId]),
    ]);

    if (gigRes.rows.length === 0) return res.status(404).json({ message: 'Job not found' });

    const required = (gigRes.rows[0].skills_required || []).map(s => s.toLowerCase().trim());
    const userSkills = userRes.rows.map(r => r.skill.toLowerCase().trim());

    if (required.length === 0) {
      return res.json({ score: 100, matching: [], missing: [], suggestions: [] });
    }

    const matching = required.filter(s => userSkills.some(us => us.includes(s) || s.includes(us)));
    const missing = required.filter(s => !userSkills.some(us => us.includes(s) || s.includes(us)));
    const score = Math.round((matching.length / required.length) * 100);

    const suggestions = missing.slice(0, 3).map(skill => ({
      skill,
      resource: `Search "${skill} course" on YouTube or Coursera`,
    }));

    res.json({ score, matching, missing, suggestions });
  } catch (error) {
    console.error('Skill match error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
