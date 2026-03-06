# GigFlow

**India's Professional Freelance Marketplace** — connecting skilled professionals with businesses across India.

## Features

- **Job Posting & Bidding** — Employers post projects; freelancers submit proposals with custom bids
- **Freelancer Profiles** — Skills, hourly rate, verified badge, portfolio, and client reviews
- **Dashboard** — Manage jobs/bids, saved gigs, and notifications in one place
- **Reviews & Ratings** — Star ratings and written reviews after job completion
- **Notifications** — Real-time alerts for bid accepted/rejected, new proposals, and more
- **Saved Jobs** — Bookmark jobs to revisit later
- **JWT Auth** — Secure login with 15-min access tokens + 30-day refresh tokens (auto-refresh)

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | React Context (auth) |
| Icons | Lucide React |

### Backend
| | |
|---|---|
| Runtime | Node.js + Express.js |
| Database | PostgreSQL via Supabase (Mumbai region) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Driver | `pg` (node-postgres) |

## Project Structure

```
gig/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Home page (real API data)
│   ├── jobs/                   # Browse, detail, post job
│   ├── freelancers/            # Browse + freelancer profile
│   ├── dashboard/              # User dashboard
│   ├── profile/                # Edit profile
│   └── auth/                   # Login & signup
├── components/
│   ├── navbar.tsx
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── api.ts                  # API client with auto token refresh
│   └── auth-context.tsx        # Auth state provider
└── gigflow-backend/
    ├── src/
    │   ├── controllers/        # auth, gigs, bids, users, reviews, notifications, savedGigs
    │   ├── routes/             # Express route definitions
    │   ├── middleware/         # JWT auth middleware
    │   └── config/db.js        # PostgreSQL connection pool
    └── schema.sql              # Full database schema
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A PostgreSQL database (Supabase recommended)

### 1. Clone & install frontend

```bash
git clone https://github.com/Mrsandeep27/GigFlow.git
cd GigFlow
pnpm install
```

### 2. Set up backend

```bash
cd gigflow-backend
npm install
```

Create `gigflow-backend/.env`:

```env
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:3000
PORT=5000
```

Run the schema against your database:

```bash
node scripts/run_schema.js
```

### 3. Start both servers

**Backend** (port 5000):
```bash
cd gigflow-backend
npm start
```

**Frontend** (port 3000):
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |
| GET | `/api/gigs` | List jobs (with filters) |
| POST | `/api/gigs` | Post a job (employer) |
| GET | `/api/gigs/:id` | Job detail |
| GET | `/api/bids/mine` | My bids (worker) |
| POST | `/api/bids` | Submit a bid |
| PUT | `/api/bids/:id/accept` | Accept bid (employer) |
| GET | `/api/users` | Browse freelancers |
| GET | `/api/users/:id` | Freelancer profile |
| GET | `/api/reviews/user/:id` | Reviews for a user |
| GET | `/api/notifications` | My notifications |
| GET | `/api/saved-gigs` | My saved jobs |

## License

MIT
