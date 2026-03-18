const pool = require('../config/db');

// POST /api/tests — Create a skill test for a gig
exports.createTest = async (req, res) => {
  try {
    const { gig_id, title, description, time_limit_minutes, passing_score, questions } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can create tests' });
    }

    // Verify gig ownership
    const gigCheck = await pool.query('SELECT created_by FROM gigs WHERE id = $1', [gig_id]);
    if (gigCheck.rows.length === 0) return res.status(404).json({ message: 'Job not found' });
    if (gigCheck.rows[0].created_by !== userId) return res.status(403).json({ message: 'Not authorized' });

    if (!questions || !Array.isArray(questions) || questions.length < 2) {
      return res.status(400).json({ message: 'At least 2 questions are required' });
    }

    // Create test
    const testRes = await pool.query(
      `INSERT INTO skill_tests (gig_id, created_by, title, description, time_limit_minutes, passing_score)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [gig_id, userId, title, description || null, time_limit_minutes || 30, passing_score || 70]
    );
    const testId = testRes.rows[0].id;

    // Insert questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await pool.query(
        `INSERT INTO test_questions (test_id, question, options, correct_answer, question_type, points, order_num)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [testId, q.question, JSON.stringify(q.options || null),
         q.correct_answer, q.question_type || 'mcq', q.points || 1, i]
      );
    }

    // Mark gig as having a test
    await pool.query('UPDATE gigs SET has_skill_test = true WHERE id = $1', [gig_id]);

    res.status(201).json({ message: 'Skill test created', testId });
  } catch (error) {
    console.error('Create test error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/tests/gig/:gigId — Get test for a gig (without answers)
exports.getTestForGig = async (req, res) => {
  try {
    const { gigId } = req.params;

    const testRes = await pool.query(
      'SELECT id, title, description, time_limit_minutes, passing_score FROM skill_tests WHERE gig_id = $1 AND is_active = true',
      [gigId]
    );
    if (testRes.rows.length === 0) return res.status(404).json({ message: 'No test found for this job' });

    const test = testRes.rows[0];

    const questionsRes = await pool.query(
      `SELECT id, question, options, question_type, points, order_num
       FROM test_questions WHERE test_id = $1 ORDER BY order_num`,
      [test.id]
    );

    // Don't send correct_answer to candidate
    const questions = questionsRes.rows.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      question_type: q.question_type,
      points: q.points,
      order_num: q.order_num,
    }));

    res.json({ ...test, questions, total_questions: questions.length });
  } catch (error) {
    console.error('Get test error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/tests/:testId/submit — Submit test answers
exports.submitTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers, time_taken_seconds } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can take tests' });
    }

    // Check for existing submission
    const existing = await pool.query(
      'SELECT id FROM test_submissions WHERE test_id = $1 AND applicant_id = $2',
      [testId, userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'You have already submitted this test' });
    }

    // Get test + questions with answers
    const testRes = await pool.query(
      'SELECT * FROM skill_tests WHERE id = $1 AND is_active = true',
      [testId]
    );
    if (testRes.rows.length === 0) return res.status(404).json({ message: 'Test not found' });

    const test = testRes.rows[0];

    const questionsRes = await pool.query(
      'SELECT id, correct_answer, points FROM test_questions WHERE test_id = $1',
      [testId]
    );

    // Grade answers
    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedAnswers = {};

    for (const q of questionsRes.rows) {
      totalPoints += q.points;
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer && q.correct_answer
        && String(userAnswer).toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim();
      if (isCorrect) earnedPoints += q.points;
      gradedAnswers[q.id] = { answered: userAnswer || null, correct: !!isCorrect };
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= test.passing_score;

    // Use transaction for atomic submission + shortlisting
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO test_submissions (test_id, applicant_id, answers, score, passed, time_taken_seconds)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [testId, userId, JSON.stringify(gradedAnswers), score, passed, time_taken_seconds || null]
      );

      if (passed) {
        await client.query(
          `UPDATE applications SET status = 'shortlisted', updated_at = NOW()
           WHERE gig_id = $1 AND applicant_id = $2 AND status IN ('applied','viewed')`,
          [test.gig_id, userId]
        );
      }

      await client.query('COMMIT');
    } catch (txErr) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      if (client) client.release();
    }

    // Notifications (non-critical, outside transaction)
    if (passed) {
      try {
        await pool.query(
          'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
          [userId, 'test_passed', 'Test Passed & Shortlisted!',
           `You scored ${score}% on the skill test and have been automatically shortlisted!`,
           JSON.stringify({ gig_id: test.gig_id, score })]
        );
        const gigRes = await pool.query('SELECT created_by, title FROM gigs WHERE id = $1', [test.gig_id]);
        if (gigRes.rows.length > 0) {
          await pool.query(
            'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
            [gigRes.rows[0].created_by, 'candidate_shortlisted', 'Candidate Auto-Shortlisted',
             `A candidate scored ${score}% on the test for "${gigRes.rows[0].title}" and was shortlisted.`,
             JSON.stringify({ gig_id: test.gig_id })]
          );
        }
      } catch (notifErr) {
        console.error('Test notification error:', notifErr.message);
      }
    }

    res.json({
      score,
      passed,
      passing_score: test.passing_score,
      message: passed
        ? `Congratulations! You scored ${score}% and have been shortlisted.`
        : `You scored ${score}%. The passing score is ${test.passing_score}%. You can apply again next time.`,
    });
  } catch (error) {
    console.error('Submit test error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/tests/:testId/results — Employer: view all submissions
exports.getResults = async (req, res) => {
  try {
    const { testId } = req.params;

    const testCheck = await pool.query(
      'SELECT st.*, g.created_by FROM skill_tests st JOIN gigs g ON st.gig_id = g.id WHERE st.id = $1',
      [testId]
    );
    if (testCheck.rows.length === 0) return res.status(404).json({ message: 'Test not found' });
    if (testCheck.rows[0].created_by !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const result = await pool.query(
      `SELECT ts.id, ts.score, ts.passed, ts.time_taken_seconds, ts.completed_at,
              u.id AS applicant_id, u.name, u.email, u.avatar_url, u.rating
       FROM test_submissions ts
       JOIN users u ON ts.applicant_id = u.id
       WHERE ts.test_id = $1
       ORDER BY ts.score DESC`,
      [testId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/tests/my-submissions — Worker: my test submissions
exports.mySubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ts.id, ts.score, ts.passed, ts.completed_at,
              st.title AS test_title, st.passing_score,
              g.id AS gig_id, g.title AS gig_title
       FROM test_submissions ts
       JOIN skill_tests st ON ts.test_id = st.id
       JOIN gigs g ON st.gig_id = g.id
       WHERE ts.applicant_id = $1
       ORDER BY ts.completed_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
