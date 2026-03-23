const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
// Fallback: also load from gigflow-backend/.env for local dev server
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ── Existing routes ──────────────────────────────────────────
const authRoutes        = require('./routes/auth');
const gigsRoutes        = require('./routes/gigs');
const bidsRoutes        = require('./routes/bids');
const usersRoutes       = require('./routes/users');
const reviewsRoutes     = require('./routes/reviews');
const notificationsRoutes = require('./routes/notifications');
const savedGigsRoutes   = require('./routes/savedGigs');

// ── New feature routes ───────────────────────────────────────
const applicationsRoutes = require('./routes/applications');
const chatRoutes         = require('./routes/chat');
const portfolioRoutes    = require('./routes/portfolio');
const resumeRoutes       = require('./routes/resume');
const referralsRoutes    = require('./routes/referrals');
const testsRoutes        = require('./routes/tests');
const candidatesRoutes   = require('./routes/candidates');

const app = express();

// ── Security & Performance ───────────────────────────────────
app.use(helmet());
app.use(compression());

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://gig-flow-work.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin serverless, curl, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// On Vercel, the body is already parsed — skip express.json() if body exists
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) return next();
  express.json({ limit: '2mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) return next();
  express.urlencoded({ extended: true, limit: '2mb' })(req, res, next);
});

// ── Response compression ─────────────────────────────────────
app.use((req, res, next) => {
  // Cache static API responses (categories, health) for 5 min
  if (req.method === 'GET' && (req.path.includes('/categories') || req.path === '/api/health')) {
    res.set('Cache-Control', 'public, max-age=300');
  }
  next();
});

// ── Rate limiting ─────────────────────────────────────────────
const authLimiter    = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const aiLimiter      = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { message: 'AI analysis limit reached. Try again in 1 hour.' } });

app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/resume',        aiLimiter);
app.use('/api/',              generalLimiter);

// ── Existing routes ──────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/gigs',         gigsRoutes);
app.use('/api/bids',         bidsRoutes);
app.use('/api/users',        usersRoutes);
app.use('/api/reviews',      reviewsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/saved-gigs',   savedGigsRoutes);

// ── New feature routes ───────────────────────────────────────
app.use('/api/applications', applicationsRoutes);
app.use('/api/chat',         chatRoutes);
app.use('/api/portfolio',    portfolioRoutes);
app.use('/api/resume',       resumeRoutes);
app.use('/api/referrals',    referralsRoutes);
app.use('/api/tests',        testsRoutes);
app.use('/api/candidates',   candidatesRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'not tested';
  try {
    const pool = require('./config/db');
    const result = await pool.query('SELECT NOW() as time');
    dbStatus = `connected (${result.rows[0].time})`;
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'ok',
    project: 'gigflow',
    version: '2.0.0',
    database: dbStatus,
    env_check: {
      DB_HOST: !!process.env.DB_HOST,
      DB_USER: !!process.env.DB_USER,
      DB_PASSWORD: !!process.env.DB_PASSWORD,
      DB_NAME: !!process.env.DB_NAME,
      JWT_SECRET: !!process.env.JWT_SECRET,
    },
  });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message, err.stack);
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal server error', debug: err.message });
});

module.exports = app;
