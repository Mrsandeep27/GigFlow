const pool = require('../config/db');

// Ensure resume tables exist (runs once)
let tablesChecked = false;
async function ensureTables() {
  if (tablesChecked) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS resume_analyses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        resume_text TEXT NOT NULL,
        ats_score INT CHECK (ats_score BETWEEN 0 AND 100),
        analysis JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_skills (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill VARCHAR(100) NOT NULL,
        UNIQUE(user_id, skill)
      );
    `);
    tablesChecked = true;
  } catch (err) {
    console.error('Table check error:', err.message);
  }
}

// AI analysis using Groq API (free tier — no credit card needed)
async function analyzeWithAI(resumeText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fallbackAnalysis(resumeText);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an expert ATS resume reviewer. Respond with only valid JSON.',
          },
          {
            role: 'user',
            content: `Analyze this resume for ATS compatibility. Return ONLY valid JSON matching this exact schema:
{"ats_score":<0-100>,"summary":"<2 sentences>","strengths":["...","...","..."],"weaknesses":["...","...","..."],"missing_keywords":["...","...","...","...","..."],"formatting_tips":["...","...","..."],"improvement_tips":["...","...","..."],"detected_skills":["...","...","..."],"experience_level":"<junior|mid|senior|lead>","estimated_yoe":<number>}

Resume (first 3000 chars):
${resumeText.substring(0, 3000)}`,
          },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Groq API ${response.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('AI API error, using fallback:', err.message);
    return fallbackAnalysis(resumeText);
  }
}

function fallbackAnalysis(resumeText) {
  const lower = resumeText.toLowerCase();
  let score = 40;

  const skillKeywords = ['javascript', 'python', 'react', 'node', 'sql', 'java', 'css', 'html', 'git', 'docker'];
  const sectionKeywords = ['experience', 'education', 'skills', 'projects', 'summary', 'objective'];
  const actionVerbs = ['developed', 'built', 'designed', 'managed', 'led', 'created', 'implemented', 'improved'];
  const quantifiers = ['%', 'increased', 'reduced', 'million', 'thousand', 'users', 'team'];

  const foundSkills = skillKeywords.filter(k => lower.includes(k));
  const foundSections = sectionKeywords.filter(k => lower.includes(k));
  const hasActionVerbs = actionVerbs.some(v => lower.includes(v));
  const hasQuantifiers = quantifiers.some(q => lower.includes(q));
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(resumeText);
  const hasPhone = /[\d\-\+\(\) ]{10,}/.test(resumeText);

  score += foundSkills.length * 4;
  score += foundSections.length * 4;
  if (hasActionVerbs) score += 8;
  if (hasQuantifiers) score += 8;
  if (hasEmail) score += 5;
  if (hasPhone) score += 3;
  score = Math.min(score, 95);

  const missingSections = sectionKeywords.filter(k => !lower.includes(k));

  return {
    ats_score: score,
    summary: `Your resume scored ${score}/100 for ATS compatibility. ${score < 60 ? 'Significant improvements needed.' : score < 80 ? 'Good foundation with room for improvement.' : 'Strong resume with minor tweaks needed.'}`,
    strengths: [
      foundSkills.length > 0 ? `Technical skills detected: ${foundSkills.slice(0, 3).join(', ')}` : 'Included technical context',
      hasActionVerbs ? 'Uses action verbs effectively' : 'Has relevant content',
      hasQuantifiers ? 'Contains quantifiable achievements' : 'Shows work experience',
    ],
    weaknesses: [
      !hasQuantifiers ? 'Missing quantifiable achievements (e.g., "increased sales by 30%")' : 'Could add more metrics',
      missingSections.length > 0 ? `Missing sections: ${missingSections.join(', ')}` : 'Consider adding more detail',
      foundSkills.length < 5 ? 'Limited technical keywords for ATS parsing' : 'Ensure all skills are listed',
    ],
    missing_keywords: ['docker', 'agile', 'cloud', 'api', 'microservices', 'ci/cd', 'kubernetes'].filter(k => !lower.includes(k)).slice(0, 5),
    formatting_tips: [
      'Use a clean, single-column layout for ATS compatibility',
      'Avoid tables, graphics, and headers/footers in the file',
      'Save as PDF or .docx — avoid .pages or image formats',
    ],
    improvement_tips: [
      'Add measurable achievements (numbers, percentages, impact)',
      'Tailor your resume keywords to match job descriptions',
      'Keep resume to 1-2 pages maximum',
    ],
    detected_skills: foundSkills,
    experience_level: resumeText.length > 2000 ? 'mid' : 'junior',
    estimated_yoe: foundSections.includes('experience') ? 2 : 0,
  };
}

// POST /api/resume/analyze — Analyze resume text
exports.analyze = async (req, res) => {
  try {
    const { resume_text } = req.body;
    const userId = req.user.id;

    if (!resume_text || resume_text.trim().length < 100) {
      return res.status(400).json({ message: 'Please provide at least 100 characters of resume text' });
    }
    if (resume_text.trim().length > 50000) {
      return res.status(400).json({ message: 'Resume text must be under 50,000 characters' });
    }

    const analysis = await analyzeWithAI(resume_text.trim());

    // Ensure tables exist before DB operations
    await ensureTables();

    // Save analysis to DB (non-blocking — don't fail if DB has issues)
    let savedId = null;
    let savedAt = new Date().toISOString();
    try {
      const saved = await pool.query(
        `INSERT INTO resume_analyses (user_id, resume_text, ats_score, analysis)
         VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
        [userId, resume_text.trim(), analysis.ats_score, JSON.stringify(analysis)]
      );
      savedId = saved.rows[0].id;
      savedAt = saved.rows[0].created_at;
    } catch (dbErr) {
      console.error('Resume DB save error (non-fatal):', dbErr.message);
    }

    // Auto-update user skills from detected skills
    if (analysis.detected_skills && analysis.detected_skills.length > 0) {
      const skills = analysis.detected_skills.map(s => s.trim()).filter(Boolean);
      if (skills.length > 0) {
        try {
          const values = skills.map((_, i) => `($1, $${i + 2})`).join(', ');
          await pool.query(
            `INSERT INTO user_skills (user_id, skill) VALUES ${values} ON CONFLICT DO NOTHING`,
            [userId, ...skills]
          );
        } catch (skillErr) {
          console.error('Skills save error (non-fatal):', skillErr.message);
        }
      }
    }

    res.json({
      id: savedId,
      created_at: savedAt,
      ...analysis,
    });
  } catch (error) {
    console.error('Resume analyze error:', error.message);
    res.status(500).json({ message: 'Analysis failed. Please try again.' });
  }
};

// GET /api/resume/history — Get analysis history for user
exports.history = async (req, res) => {
  try {
    await ensureTables();
    const result = await pool.query(
      `SELECT id, ats_score, analysis->>'summary' AS summary,
              analysis->>'experience_level' AS experience_level,
              created_at
       FROM resume_analyses
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
};

// GET /api/resume/latest — Get latest analysis for user
exports.latest = async (req, res) => {
  try {
    await ensureTables();
    const result = await pool.query(
      `SELECT id, ats_score, analysis, created_at
       FROM resume_analyses
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'No analysis found' });
    const row = result.rows[0];
    res.json({ ...row, ...(row.analysis || {}) });
  } catch (error) {
    // Table might not exist yet — treat as no analysis found
    res.status(404).json({ message: 'No analysis found' });
  }
};
