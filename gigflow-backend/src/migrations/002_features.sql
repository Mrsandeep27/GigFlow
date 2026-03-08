-- ============================================================
-- GigFlow Feature Migration 002
-- All 10 features + Bonus Reverse Marketplace
-- ============================================================

-- ── Extend users table ──────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_experience INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS desired_salary_min DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS desired_salary_max DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_headline VARCHAR(255);

-- ── Extend gigs table ───────────────────────────────────────
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS salary_min DECIMAL(10,2);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS salary_max DECIMAL(10,2);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS interview_difficulty INT DEFAULT 3 CHECK (interview_difficulty BETWEEN 1 AND 5);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS company_verified BOOLEAN DEFAULT false;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS is_fake_flagged BOOLEAN DEFAULT false;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS is_actively_hiring BOOLEAN DEFAULT true;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS has_skill_test BOOLEAN DEFAULT false;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS market_avg_salary DECIMAL(10,2);

-- ── Feature 1: Application Status Tracking ──────────────────
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  gig_id INT REFERENCES gigs(id) ON DELETE CASCADE,
  applicant_id INT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'applied'
    CHECK (status IN ('applied','viewed','shortlisted','interview_scheduled','offer','rejected')),
  rejection_reason TEXT,
  cover_letter TEXT,
  expected_salary DECIMAL(10,2),
  interview_date TIMESTAMP,
  recruiter_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(gig_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_gig ON applications(gig_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- ── Feature 3 & 7: Company Profiles ─────────────────────────
CREATE TABLE IF NOT EXISTS company_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  company_size VARCHAR(50),
  industry VARCHAR(100),
  website VARCHAR(500),
  linkedin_url VARCHAR(500),
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP,
  is_actively_hiring BOOLEAN DEFAULT true,
  description TEXT,
  logo_url VARCHAR(500),
  avg_interview_difficulty DECIMAL(3,1) DEFAULT 3.0,
  total_reviews INT DEFAULT 0,
  avg_rating DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Feature 3: Fraud Reports ─────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_reports (
  id SERIAL PRIMARY KEY,
  reported_by INT REFERENCES users(id) ON DELETE CASCADE,
  gig_id INT REFERENCES gigs(id) ON DELETE CASCADE,
  employer_id INT REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved')),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_gig ON fraud_reports(gig_id);

-- ── Feature 4: AI Resume Analyzer ───────────────────────────
CREATE TABLE IF NOT EXISTS resume_analyses (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  resume_text TEXT NOT NULL,
  ats_score INT CHECK (ats_score BETWEEN 0 AND 100),
  analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_user ON resume_analyses(user_id);

-- ── Feature 5: Direct Chat ───────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  gig_id INT REFERENCES gigs(id) ON DELETE SET NULL,
  employer_id INT REFERENCES users(id) ON DELETE CASCADE,
  worker_id INT REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP DEFAULT NOW(),
  employer_unread INT DEFAULT 0,
  worker_unread INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(gig_id, employer_id, worker_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_employer ON conversations(employer_id);
CREATE INDEX IF NOT EXISTS idx_conv_worker ON conversations(worker_id);

-- ── Feature 6: Portfolio ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_items (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'project'
    CHECK (type IN ('github','live_link','case_study','video','project')),
  url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  tags TEXT[],
  order_num INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items(user_id);

-- ── Feature 7: Salary Benchmarks ────────────────────────────
CREATE TABLE IF NOT EXISTS salary_benchmarks (
  id SERIAL PRIMARY KEY,
  job_title VARCHAR(255),
  category_id INT REFERENCES categories(id),
  experience_level VARCHAR(50) DEFAULT 'mid'
    CHECK (experience_level IN ('junior','mid','senior','lead')),
  min_salary DECIMAL(10,2),
  max_salary DECIMAL(10,2),
  avg_salary DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'INR',
  city VARCHAR(100),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Feature 8: AI Job Recommendations Cache ─────────────────
CREATE TABLE IF NOT EXISTS job_recommendations (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  gig_id INT REFERENCES gigs(id) ON DELETE CASCADE,
  score DECIMAL(5,2),
  reasons TEXT[],
  computed_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, gig_id)
);

-- ── Feature 9: Referral System ───────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  gig_id INT REFERENCES gigs(id) ON DELETE CASCADE,
  referrer_id INT REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  max_referrals INT DEFAULT 5,
  referral_count INT DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_requests (
  id SERIAL PRIMARY KEY,
  referral_id INT REFERENCES referrals(id) ON DELETE CASCADE,
  requester_id INT REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  linkedin_url VARCHAR(500),
  resume_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  response_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referral_id, requester_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_gig ON referrals(gig_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_referral ON referral_requests(referral_id);

-- ── Feature 10: Skill Tests ──────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_tests (
  id SERIAL PRIMARY KEY,
  gig_id INT REFERENCES gigs(id) ON DELETE CASCADE,
  created_by INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_limit_minutes INT DEFAULT 30,
  passing_score INT DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_questions (
  id SERIAL PRIMARY KEY,
  test_id INT REFERENCES skill_tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'mcq'
    CHECK (question_type IN ('mcq','text')),
  points INT DEFAULT 1,
  order_num INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS test_submissions (
  id SERIAL PRIMARY KEY,
  test_id INT REFERENCES skill_tests(id) ON DELETE CASCADE,
  applicant_id INT REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INT,
  passed BOOLEAN,
  time_taken_seconds INT,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(test_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_tests_gig ON skill_tests(gig_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_test ON test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_applicant ON test_submissions(applicant_id);

-- ── Bonus: Reverse Marketplace index ────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_discoverable ON users(is_discoverable, is_active)
  WHERE is_discoverable = true;

-- ── Seed: Salary benchmarks ──────────────────────────────────
INSERT INTO salary_benchmarks (job_title, experience_level, min_salary, max_salary, avg_salary, city) VALUES
  ('Frontend Developer', 'junior', 300000, 600000, 450000, NULL),
  ('Frontend Developer', 'mid', 600000, 1200000, 900000, NULL),
  ('Frontend Developer', 'senior', 1200000, 2000000, 1600000, NULL),
  ('Backend Developer', 'junior', 350000, 700000, 500000, NULL),
  ('Backend Developer', 'mid', 700000, 1400000, 1000000, NULL),
  ('Backend Developer', 'senior', 1400000, 2500000, 1900000, NULL),
  ('Full Stack Developer', 'junior', 400000, 800000, 600000, NULL),
  ('Full Stack Developer', 'mid', 800000, 1600000, 1200000, NULL),
  ('Full Stack Developer', 'senior', 1600000, 2800000, 2200000, NULL),
  ('UI/UX Designer', 'junior', 250000, 500000, 375000, NULL),
  ('UI/UX Designer', 'mid', 500000, 1000000, 750000, NULL),
  ('UI/UX Designer', 'senior', 1000000, 1800000, 1400000, NULL),
  ('Data Scientist', 'junior', 400000, 800000, 600000, NULL),
  ('Data Scientist', 'mid', 800000, 1600000, 1200000, NULL),
  ('Data Scientist', 'senior', 1600000, 3000000, 2300000, NULL),
  ('DevOps Engineer', 'junior', 400000, 800000, 600000, NULL),
  ('DevOps Engineer', 'mid', 800000, 1600000, 1200000, NULL),
  ('DevOps Engineer', 'senior', 1600000, 2800000, 2200000, NULL),
  ('Product Manager', 'junior', 500000, 900000, 700000, NULL),
  ('Product Manager', 'mid', 900000, 1800000, 1350000, NULL),
  ('Product Manager', 'senior', 1800000, 3500000, 2600000, NULL),
  ('Mobile Developer', 'junior', 350000, 700000, 525000, NULL),
  ('Mobile Developer', 'mid', 700000, 1400000, 1050000, NULL),
  ('Mobile Developer', 'senior', 1400000, 2500000, 1950000, NULL)
ON CONFLICT DO NOTHING;
