const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

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

// ── Security ─────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',   // Next.js default
  'http://localhost:5173',   // Vite
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, etc.)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // increased for resume text
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'gigflow',
    version: '2.0.0',
    region: 'ap-south-1',
    features: ['applications','chat','portfolio','resume-ai','referrals','skill-tests','discover'],
  });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
