const https = require('https');

const TOKEN = 'sbp_12a3cb0bd4192ad3f53d3e20e973c6fa130782db';
const PROJECT_REF = 'vwcuukzdrjdqdxftifky';

function runSQL(label, sql) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[OK]   ${label}`);
        } else {
          console.log(`[FAIL] ${label}: ${data}`);
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log(`[ERR]  ${label}: ${e.message}`);
      resolve();
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Running GigFlow database schema...\n');

  // ── TABLES ────────────────────────────────────────────────────────────────

  await runSQL('categories', `
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      icon VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runSQL('subcategories', `
    CREATE TABLE IF NOT EXISTS subcategories (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(category_id, name)
    );
  `);

  await runSQL('users', `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(20) UNIQUE,
      password_hash VARCHAR(255),
      name VARCHAR(100) NOT NULL,
      role user_role NOT NULL DEFAULT 'worker',
      bio TEXT,
      avatar_url TEXT,
      location VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(10),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      hourly_rate DECIMAL(10, 2),
      rating DECIMAL(3, 2) DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      total_jobs_completed INTEGER DEFAULT 0,
      is_verified BOOLEAN DEFAULT FALSE,
      is_email_verified BOOLEAN DEFAULT FALSE,
      is_phone_verified BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      otp VARCHAR(6),
      otp_expires_at TIMESTAMPTZ,
      email_verify_token VARCHAR(255),
      password_reset_token VARCHAR(255),
      password_reset_expires TIMESTAMPTZ,
      refresh_token TEXT,
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runSQL('user_skills', `
    CREATE TABLE IF NOT EXISTS user_skills (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      skill VARCHAR(100) NOT NULL,
      UNIQUE(user_id, skill)
    );
  `);

  await runSQL('user_experience', `
    CREATE TABLE IF NOT EXISTS user_experience (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      company VARCHAR(200),
      start_date DATE,
      end_date DATE,
      is_current BOOLEAN DEFAULT FALSE,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runSQL('gigs', `
    CREATE TABLE IF NOT EXISTS gigs (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      subcategory_id INTEGER REFERENCES subcategories(id),
      created_by UUID REFERENCES users(id) ON DELETE CASCADE,
      job_type job_type NOT NULL DEFAULT 'gig',
      status gig_status NOT NULL DEFAULT 'open',
      budget_min DECIMAL(10, 2),
      budget_max DECIMAL(10, 2),
      budget_type VARCHAR(20) DEFAULT 'fixed',
      currency VARCHAR(10) DEFAULT 'INR',
      location VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(10),
      is_remote BOOLEAN DEFAULT FALSE,
      skills_required TEXT[],
      deadline TIMESTAMPTZ,
      total_bids INTEGER DEFAULT 0,
      assigned_to UUID REFERENCES users(id),
      views INTEGER DEFAULT 0,
      is_featured BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runSQL('bids', `
    CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      gig_id INTEGER REFERENCES gigs(id) ON DELETE CASCADE,
      bidder_id UUID REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
      message TEXT,
      status bid_status NOT NULL DEFAULT 'pending',
      delivery_days INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(gig_id, bidder_id)
    );
  `);

  await runSQL('reviews', `
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      gig_id INTEGER REFERENCES gigs(id) ON DELETE CASCADE,
      reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(gig_id, reviewer_id)
    );
  `);

  await runSQL('conversations', `
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      gig_id INTEGER REFERENCES gigs(id),
      participant_one UUID REFERENCES users(id) ON DELETE CASCADE,
      participant_two UUID REFERENCES users(id) ON DELETE CASCADE,
      last_message TEXT,
      last_message_at TIMESTAMPTZ,
      unread_count_one INTEGER DEFAULT 0,
      unread_count_two INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runSQL('messages', `
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runSQL('notifications', `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type notification_type NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      data JSONB,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runSQL('saved_gigs', `
    CREATE TABLE IF NOT EXISTS saved_gigs (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      gig_id INTEGER REFERENCES gigs(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, gig_id)
    );
  `);

  await runSQL('reports', `
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reported_user_id UUID REFERENCES users(id),
      reported_gig_id INTEGER REFERENCES gigs(id),
      reason VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ── INDEXES ───────────────────────────────────────────────────────────────

  await runSQL('indexes', `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
    CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
    CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category_id);
    CREATE INDEX IF NOT EXISTS idx_gigs_city ON gigs(city);
    CREATE INDEX IF NOT EXISTS idx_gigs_created_by ON gigs(created_by);
    CREATE INDEX IF NOT EXISTS idx_gigs_job_type ON gigs(job_type);
    CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON gigs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bids_gig_id ON bids(gig_id);
    CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
    CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
  `);

  // ── TRIGGERS ──────────────────────────────────────────────────────────────

  await runSQL('updated_at function', `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await runSQL('updated_at triggers', `
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_gigs_updated_at ON gigs;
    CREATE TRIGGER update_gigs_updated_at
      BEFORE UPDATE ON gigs FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_bids_updated_at ON bids;
    CREATE TRIGGER update_bids_updated_at
      BEFORE UPDATE ON bids FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  await runSQL('bid count trigger', `
    CREATE OR REPLACE FUNCTION update_gig_bid_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE gigs SET total_bids = total_bids + 1 WHERE id = NEW.gig_id;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE gigs SET total_bids = GREATEST(total_bids - 1, 0) WHERE id = OLD.gig_id;
      END IF;
      RETURN NULL;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_bid_count ON bids;
    CREATE TRIGGER update_bid_count
      AFTER INSERT OR DELETE ON bids
      FOR EACH ROW EXECUTE FUNCTION update_gig_bid_count();
  `);

  await runSQL('user rating trigger', `
    CREATE OR REPLACE FUNCTION update_user_rating()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE users SET
        rating = (SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) FROM reviews WHERE reviewee_id = NEW.reviewee_id),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id)
      WHERE id = NEW.reviewee_id;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_rating_on_review ON reviews;
    CREATE TRIGGER update_rating_on_review
      AFTER INSERT OR UPDATE ON reviews
      FOR EACH ROW EXECUTE FUNCTION update_user_rating();
  `);

  await runSQL('conversation last_message trigger', `
    CREATE OR REPLACE FUNCTION update_conversation_last_message()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE conversations SET
        last_message = NEW.content,
        last_message_at = NEW.created_at
      WHERE id = NEW.conversation_id;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
    CREATE TRIGGER update_conversation_on_message
      AFTER INSERT ON messages
      FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
  `);

  // ── SEED DATA ─────────────────────────────────────────────────────────────

  await runSQL('seed categories', `
    INSERT INTO categories (name, icon) VALUES
      ('Technology', 'laptop'),
      ('Design & Creative', 'palette'),
      ('Writing & Content', 'pen'),
      ('Marketing & Sales', 'trending-up'),
      ('Finance & Accounting', 'dollar-sign'),
      ('Admin & Support', 'headphones'),
      ('Engineering', 'tool'),
      ('Delivery & Logistics', 'truck'),
      ('Education & Training', 'book'),
      ('Healthcare', 'heart'),
      ('Construction', 'building'),
      ('Hospitality', 'coffee'),
      ('Security', 'shield'),
      ('Domestic Help', 'home'),
      ('Other', 'briefcase')
    ON CONFLICT (name) DO NOTHING;
  `);

  await runSQL('seed subcategories', `
    INSERT INTO subcategories (category_id, name) VALUES
      (1, 'Web Development'), (1, 'Mobile App Development'), (1, 'Data Entry'),
      (1, 'IT Support'), (1, 'Software Testing'), (1, 'DevOps'),
      (2, 'Graphic Design'), (2, 'Logo Design'), (2, 'UI/UX Design'),
      (2, 'Video Editing'), (2, 'Photography'), (2, 'Animation'),
      (3, 'Blog Writing'), (3, 'SEO Content'), (3, 'Copywriting'), (3, 'Translation'),
      (4, 'Social Media Marketing'), (4, 'Lead Generation'), (4, 'Email Marketing'),
      (5, 'Bookkeeping'), (5, 'Tax Filing'), (5, 'Financial Analysis'),
      (7, 'Plumbing'), (7, 'Electrical'), (7, 'Civil Work'), (7, 'Carpentry'),
      (8, 'Food Delivery'), (8, 'Courier'), (8, 'Warehouse'),
      (9, 'Tutoring'), (9, 'Online Teaching'), (9, 'Corporate Training'),
      (10, 'Nursing'), (10, 'Home Care'), (10, 'Medical Transcription'),
      (11, 'Painting'), (11, 'Tiles'), (11, 'Waterproofing'),
      (13, 'Security Guard'), (13, 'CCTV Operator'),
      (14, 'Cooking'), (14, 'Cleaning'), (14, 'Babysitting'), (14, 'Elderly Care')
    ON CONFLICT DO NOTHING;
  `);

  console.log('\n================================');
  console.log(' GigFlow Database Setup Complete');
  console.log('================================');
  console.log(' Project : gigflow');
  console.log(' Ref     : vwcuukzdrjdqdxftifky');
  console.log(' Region  : ap-south-1 (Mumbai)');
  console.log(' Host    : db.vwcuukzdrjdqdxftifky.supabase.co');
  console.log(' Tables  : 13 tables created');
  console.log(' Indexes : 16 indexes');
  console.log(' Triggers: 5 auto-triggers');
  console.log(' Seed    : 15 categories, 44 subcategories');
  console.log('================================');
}

main();
