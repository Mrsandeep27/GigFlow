const pool = require('../config/db');

// AI analysis using Claude API (server-side)
async function analyzeWithClaude(resumeText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: basic rule-based analysis
    return fallbackAnalysis(resumeText);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are an expert ATS (Applicant Tracking System) and resume reviewer. Analyze the following resume and return a JSON response ONLY (no markdown, no explanation, just raw JSON).

Resume:
${resumeText.substring(0, 4000)}

Return this exact JSON structure:
{
  "ats_score": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "missing_keywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>", "<keyword 4>", "<keyword 5>"],
  "formatting_tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "improvement_tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "detected_skills": ["<skill 1>", "<skill 2>", "<skill 3>"],
  "experience_level": "<junior|mid|senior|lead>",
  "estimated_yoe": <number>
}`,
        }],
      }),
    });

    if (!response.ok) throw new Error('Claude API error');

    const data = await response.json();
    const text = data.content[0].text.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('Claude API error, using fallback:', err.message);
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

    const analysis = await analyzeWithClaude(resume_text.trim());

    // Save analysis to DB
    const saved = await pool.query(
      `INSERT INTO resume_analyses (user_id, resume_text, ats_score, analysis)
       VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
      [userId, resume_text.trim(), analysis.ats_score, JSON.stringify(analysis)]
    );

    // Auto-update user skills from detected skills
    if (analysis.detected_skills && analysis.detected_skills.length > 0) {
      for (const skill of analysis.detected_skills) {
        await pool.query(
          'INSERT INTO user_skills (user_id, skill) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [userId, skill.trim()]
        );
      }
    }

    res.json({
      id: saved.rows[0].id,
      created_at: saved.rows[0].created_at,
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
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/resume/latest — Get latest analysis for user
exports.latest = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ats_score, analysis, created_at
       FROM resume_analyses
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'No analysis found' });
    res.json({ ...result.rows[0], ...result.rows[0].analysis });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
