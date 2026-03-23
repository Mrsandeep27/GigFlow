-- ============================================================
-- GigFlow Migration 004 — Missing production features
-- Password resets, email verification, payments, admin
-- ============================================================

-- ── Password reset tokens ────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- ── Email verification fields (add to users if missing) ──────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- ── Admin role support ───────────────────────────────────────
-- Users table already has role column; admin is a valid role value

-- ── Payments / Escrow ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  gig_id INT REFERENCES gigs(id) ON DELETE SET NULL,
  employer_id INT REFERENCES users(id) ON DELETE SET NULL,
  worker_id INT REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending','escrow','released','refunded','failed')),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_gig ON payments(gig_id);
CREATE INDEX IF NOT EXISTS idx_payments_employer ON payments(employer_id);
CREATE INDEX IF NOT EXISTS idx_payments_worker ON payments(worker_id);

-- ── Full-text search on gigs ─────────────────────────────────
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update existing rows
UPDATE gigs SET search_vector = to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
WHERE search_vector IS NULL;

-- Auto-update trigger
CREATE OR REPLACE FUNCTION gigs_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_gigs_search ON gigs;
CREATE TRIGGER trig_gigs_search BEFORE INSERT OR UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION gigs_search_trigger();

CREATE INDEX IF NOT EXISTS idx_gigs_search ON gigs USING GIN (search_vector);
