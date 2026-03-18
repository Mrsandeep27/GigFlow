# GigFlow

**India's AI-Powered Professional Marketplace** — connecting skilled professionals with businesses across India, with 10 advanced hiring features built in.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-gig--flow--work.vercel.app-4F46E5?style=for-the-badge&logo=vercel&logoColor=white)](https://gig-flow-work.vercel.app)

## Features

### Core Platform
- **Job Posting & Bidding** — Employers post projects; freelancers submit proposals with custom bids
- **Freelancer Profiles** — Skills, hourly rate, verified badge, portfolio, and client reviews
- **Dashboard** — Manage jobs/bids, saved gigs, quick-access panel for all features
- **Reviews & Ratings** — Star ratings and written reviews after job completion
- **Saved Jobs** — Bookmark jobs to revisit later
- **JWT Auth** — Secure login with 15-min access tokens + 30-day refresh tokens (auto-refresh)

### Advanced Features (v2)
| # | Feature | Description |
|---|---------|-------------|
| 1 | **Application Status Tracking** | Visual pipeline: Applied → Viewed → Shortlisted → Interview → Offer → Rejected |
| 2 | **Skill Match Score** | % match against job requirements, missing skills, suggestions |
| 3 | **Fake Job Detection** | Verified badges, fraud reports, auto-flag at 3 reports |
| 4 | **AI Resume Analyzer** | ATS score, keyword analysis, improvement tips via Claude AI |
| 5 | **Direct Chat with Recruiter** | REST-based messaging with adaptive polling, rate limiting |
| 6 | **Portfolio-Based Hiring** | Projects, case studies, GitHub links, live demos, thumbnails |
| 7 | **Salary Transparency** | Salary ranges, market benchmarks, interview difficulty per role |
| 8 | **AI Job Recommendations** | Skill-overlap algorithm matches workers to best-fit jobs |
| 9 | **Referral System** | Post referral opportunities, request/approve/reject flow |
| 10 | **Skill Test Hiring** | MCQ tests with auto-shortlist on pass, employer results dashboard |
| + | **Reverse Hiring Marketplace** | Employers discover candidates by skills/salary expectations |

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Fonts | DM Sans + Instrument Serif via `next/font/google` |
| State | React Context (auth) |
| Icons | Lucide React (tree-shaken via `optimizePackageImports`) |
| Build | Turbopack (fast HMR) |

### Backend
| | |
|---|---|
| Runtime | Node.js + Express.js |
| Database | PostgreSQL via Supabase (Mumbai region, ap-south-1) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Driver | `pg` (node-postgres) |
| Real-time | Socket.io |
| AI | Anthropic Claude API (Haiku) with rule-based fallback |

## Project Structure

```
gig/
├── app/
│   ├── page.tsx                # Home — hero, featured jobs, top freelancers
│   ├── jobs/                   # Browse, detail, post job
│   ├── freelancers/            # Browse + freelancer profile
│   ├── dashboard/              # User dashboard with quick-access panel
│   ├── profile/                # Edit profile + discoverable settings
│   ├── applications/           # Application pipeline tracker (worker)
│   ├── chat/                   # Messaging — list + [id] conversation
│   ├── resume/                 # AI resume analyzer with ATS score
│   ├── portfolio/              # Portfolio manager (add/delete items)
│   ├── referrals/              # Browse/post referrals + manage requests
│   ├── tests/                  # Skill tests — create (employer) / take (worker)
│   ├── discover/               # Reverse marketplace — browse candidates
│   └── auth/                   # Login & signup
├── components/
│   ├── navbar.tsx              # Role-aware nav with all feature links
│   ├── error-boundary.tsx      # React error boundary with recovery UI
│   ├── star-rating.tsx         # Shared star rating component
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── api.ts                  # Full API client with auto token refresh
│   ├── auth-context.tsx        # Auth state provider
│   └── utils/format-budget.ts  # Shared budget formatter
├── hooks/
│   ├── use-debounce.ts         # Debounce hook for search inputs
│   └── use-mobile.ts           # Mobile breakpoint detection
└── gigflow-backend/
    ├── src/
    │   ├── controllers/        # applications, chat, portfolio, resume, referrals,
    │   │                       # tests, candidates, auth, gigs, bids, users, reviews...
    │   ├── routes/             # Express route definitions (14 route modules)
    │   ├── middleware/         # JWT auth + role-based access control
    │   ├── migrations/
    │   │   ├── 001_schema.sql  # Base schema
    │   │   └── 002_features.sql# 14 new tables for v2 features
    │   └── config/db.js        # PostgreSQL connection pool with monitoring
    └── .env                    # Environment config (see below)
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### 1. Clone & install

```bash
git clone https://github.com/Mrsandeep27/GigFlow.git
cd GigFlow
npm install
```

### 2. Configure backend

Create `gigflow-backend/.env`:

```env
PORT=5000
NODE_ENV=development

# PostgreSQL (Supabase or any Postgres)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRE=30d

# CORS
CLIENT_URL=http://localhost:3000

# Optional: AI resume analysis
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run the database migrations

```bash
# Run base schema then v2 features migration against your database
psql $DATABASE_URL -f gigflow-backend/src/migrations/002_features.sql
```

### 4. Start everything (one command)

```bash
npm run dev:all
```

This starts both servers concurrently:
- **Frontend** → http://localhost:3000 (Next.js + Turbopack)
- **Backend API** → http://localhost:5000 (Express)

Or run them separately:

```bash
# Terminal 1 — Backend
node gigflow-backend/src/server.js

# Terminal 2 — Frontend
npm run dev
```

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |

### Jobs & Bids
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/gigs` | List jobs (search, filter, paginate) |
| POST | `/api/gigs` | Post a job (employer) |
| GET | `/api/gigs/:id` | Job detail |
| PUT | `/api/gigs/:id` | Update job |
| GET | `/api/bids/mine` | My bids (worker) |
| POST | `/api/bids` | Submit a bid |
| PUT | `/api/bids/:id/accept` | Accept bid (employer) |

### Applications (Feature 1)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/applications` | Apply to a job |
| GET | `/api/applications/mine` | My applications (worker) |
| GET | `/api/applications/gig/:id` | Applicants for a job (employer) |
| PUT | `/api/applications/:id/status` | Update status (employer) |
| GET | `/api/applications/:id/match` | Skill match score |

### Chat (Feature 5)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/start` | Start conversation |
| GET | `/api/chat` | My conversations |
| GET | `/api/chat/:id/messages` | Get messages |
| POST | `/api/chat/:id/messages` | Send message |

### Resume AI (Feature 4)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/resume/analyze` | Analyze resume text (AI + fallback) |
| GET | `/api/resume/history` | Past analyses |

### Portfolio (Feature 6)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/portfolio/mine` | My portfolio items |
| POST | `/api/portfolio` | Add portfolio item |
| DELETE | `/api/portfolio/:id` | Remove item |
| GET | `/api/portfolio/user/:id` | User's public portfolio |

### Referrals (Feature 9)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/referrals` | Browse all referrals |
| POST | `/api/referrals` | Post a referral opportunity |
| GET | `/api/referrals/mine` | My posted referrals |
| POST | `/api/referrals/:id/request` | Request a referral |
| PUT | `/api/referrals/requests/:id` | Approve / reject request |

### Skill Tests (Feature 10)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tests` | List tests |
| POST | `/api/tests` | Create test with questions (employer) |
| POST | `/api/tests/:id/submit` | Submit answers (worker) |

### Candidates / Discover (Feature 8, Bonus)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/candidates` | Discover candidates (search, skill filter) |
| PUT | `/api/candidates/discoverable` | Toggle discoverability |
| GET | `/api/candidates/recommendations` | AI job recommendations |
| GET | `/api/candidates/salary-insights/:gigId` | Salary benchmark data |
| POST | `/api/candidates/report` | Report fake job |

## Security

- **Socket.IO JWT auth** — token verification on connection + room-based messaging (no broadcast)
- **Role-based access control** — `requireRole()` middleware enforced on all protected routes
- **Parameterized queries** — all SQL uses `$1` placeholders, no string interpolation
- **Input validation** — max length on chat messages (5K), resume text (50K), rate limiting per endpoint
- **CORS lockdown** — production restricts to `CLIENT_URL` only; dev allows localhost
- **DB transactions** — test submission + auto-shortlisting wrapped in BEGIN/COMMIT/ROLLBACK
- **Graceful shutdown** — SIGTERM/SIGINT close HTTP server + drain DB pool before exit
- **Error boundary** — React ErrorBoundary wraps entire app, catches render crashes with recovery UI

## Performance

- **Turbopack** — Next.js dev server with fast HMR
- **Image optimization** — AVIF/WebP auto-format via Next.js Image config
- **`optimizePackageImports`** — lucide-react, recharts, date-fns tree-shaken at compile time
- **`next/font`** — DM Sans + Instrument Serif self-hosted, no Google Fonts network fetch
- **GPU-accelerated orbs** — `will-change: transform` + `translateZ(0)` on blur elements
- **Adaptive chat polling** — 3s when active → backs off to 15s when idle, pauses when tab hidden
- **gzip compression** — Express `compression` middleware on all API responses
- **HTTP caching** — `Cache-Control` headers on static endpoints (categories, health)
- **Race condition handling** — AbortController cancels stale search requests
- **Rendering containment** — `contain: layout style` on card sections
- **CSS-only hover states** — footer/orb styles moved from JS handlers to CSS classes

## SEO

- **Dynamic sitemap** — auto-generated `sitemap.xml` at build time
- **robots.txt** — crawl rules with private route exclusions
- **Open Graph + Twitter cards** — metadata on all pages
- **Semantic HTML** — proper heading hierarchy, landmark elements

## License

MIT
