// In production (Vercel), API runs on same origin as serverless functions → use '' (relative)
// In development, use localhost:5000 where the Express dev server runs
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gf_token');
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('gf_refresh');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('gf_token', data.token);
    return data.token;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  let token = getToken();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && retry) {
    token = await refreshAccessToken();
    if (token) return request<T>(path, options, false);
    localStorage.removeItem('gf_token');
    localStorage.removeItem('gf_refresh');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data as T;
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),
    register: (data: { name: string; email: string; password: string; role: 'worker' | 'employer' }) =>
      request<{ token: string; refreshToken: string; user: User }>('/auth/register', {
        method: 'POST', body: JSON.stringify(data),
      }),
    me: () => request<User>('/auth/me'),
    updateProfile: (data: Partial<User> & { skills?: string[] }) =>
      request<{ message: string }>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  },

  // ── Gigs ────────────────────────────────────────────────────
  gigs: {
    list: (params?: GigFilters) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return request<GigListResponse>(`/gigs${qs}`);
    },
    get: (id: number) => request<Gig>(`/gigs/${id}`),
    mine: () => request<Gig[]>('/gigs/mine'),
    categories: () => request<Category[]>('/gigs/categories'),
    create: (data: CreateGigData) =>
      request<{ message: string; gigId: number }>('/gigs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<CreateGigData> & { status?: string }) =>
      request<{ message: string }>(`/gigs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<{ message: string }>(`/gigs/${id}`, { method: 'DELETE' }),
  },

  // ── Users / Freelancers ─────────────────────────────────────
  users: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<WorkersListResponse>(`/users${qs}`);
    },
    get: (id: string) => request<Worker>(`/users/${id}`),
  },

  // ── Bids ────────────────────────────────────────────────────
  bids: {
    forGig: (gigId: number) => request<Bid[]>(`/bids/gig/${gigId}`),
    mine: () => request<Bid[]>('/bids/mine'),
    create: (data: { gigId: number; amount: number; message: string; delivery_days?: number }) =>
      request<{ message: string; bidId: number }>('/bids', { method: 'POST', body: JSON.stringify(data) }),
    accept: (bidId: number) => request<{ message: string }>(`/bids/${bidId}/accept`, { method: 'PUT' }),
    reject: (bidId: number) => request<{ message: string }>(`/bids/${bidId}/reject`, { method: 'PUT' }),
    withdraw: (bidId: number) => request<{ message: string }>(`/bids/${bidId}/withdraw`, { method: 'PUT' }),
  },

  // ── Reviews ─────────────────────────────────────────────────
  reviews: {
    forUser: (userId: string) => request<Review[]>(`/reviews/user/${userId}`),
    forGig: (gigId: number) => request<Review[]>(`/reviews/gig/${gigId}`),
    create: (data: { gig_id: number; reviewed_id: string; rating: number; comment?: string }) =>
      request<{ message: string }>('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  },

  // ── Notifications ───────────────────────────────────────────
  notifications: {
    list: () => request<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
    markRead: (id: number) => request<{ message: string }>(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => request<{ message: string }>('/notifications/read-all', { method: 'PUT' }),
  },

  // ── Saved Gigs ──────────────────────────────────────────────
  savedGigs: {
    list: () => request<Gig[]>('/saved-gigs'),
    save: (gig_id: number) =>
      request<{ message: string }>('/saved-gigs', { method: 'POST', body: JSON.stringify({ gig_id }) }),
    unsave: (gigId: number) => request<{ message: string }>(`/saved-gigs/${gigId}`, { method: 'DELETE' }),
    check: (gigId: number) => request<{ saved: boolean }>(`/saved-gigs/check/${gigId}`),
  },

  // ── Feature 1: Applications ─────────────────────────────────
  applications: {
    apply: (data: { gig_id: number; cover_letter?: string; expected_salary?: number }) =>
      request<{ message: string; applicationId: number }>('/applications', {
        method: 'POST', body: JSON.stringify(data),
      }),
    mine: () => request<Application[]>('/applications/mine'),
    forGig: (gigId: number) => request<ApplicationWithCandidate[]>(`/applications/gig/${gigId}`),
    get: (id: number) => request<Application>(`/applications/${id}`),
    updateStatus: (id: number, data: {
      status: ApplicationStatus;
      rejection_reason?: string;
      interview_date?: string;
      recruiter_notes?: string;
    }) => request<{ message: string }>(`/applications/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    withdraw: (id: number) => request<{ message: string }>(`/applications/${id}`, { method: 'DELETE' }),
    skillMatch: (gigId: number) => request<SkillMatchResult>(`/applications/skill-match/${gigId}`),
  },

  // ── Feature 5: Chat ─────────────────────────────────────────
  chat: {
    list: () => request<Conversation[]>('/chat'),
    start: (data: { gig_id?: number; other_user_id: string }) =>
      request<{ conversationId: number }>('/chat', { method: 'POST', body: JSON.stringify(data) }),
    messages: (id: number, params?: { before?: string; limit?: number }) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return request<Message[]>(`/chat/${id}/messages${qs}`);
    },
    send: (id: number, content: string) =>
      request<Message>(`/chat/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
    unread: () => request<{ unread: number }>('/chat/unread'),
  },

  // ── Feature 6: Portfolio ────────────────────────────────────
  portfolio: {
    mine: () => request<PortfolioItem[]>('/portfolio/mine'),
    forUser: (userId: string) => request<PortfolioItem[]>(`/portfolio/${userId}`),
    add: (data: Partial<PortfolioItem>) =>
      request<{ message: string; itemId: number }>('/portfolio', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<PortfolioItem>) =>
      request<{ message: string }>(`/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<{ message: string }>(`/portfolio/${id}`, { method: 'DELETE' }),
  },

  // ── Feature 4: Resume Analyzer ──────────────────────────────
  resume: {
    analyze: (resume_text: string) =>
      request<ResumeAnalysis>('/resume/analyze', { method: 'POST', body: JSON.stringify({ resume_text }) }),
    history: () => request<ResumeAnalysisSummary[]>('/resume/history'),
    latest: () => request<ResumeAnalysis>('/resume/latest'),
  },

  // ── Feature 9: Referrals ────────────────────────────────────
  referrals: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<ReferralListResponse>(`/referrals${qs}`);
    },
    create: (data: Partial<Referral>) =>
      request<{ message: string; referralId: number }>('/referrals', { method: 'POST', body: JSON.stringify(data) }),
    mine: () => request<Referral[]>('/referrals/mine'),
    myRequests: () => request<ReferralRequest[]>('/referrals/requests/mine'),
    getRequests: (id: number) => request<ReferralRequest[]>(`/referrals/${id}/requests`),
    request: (id: number, data: { message?: string; linkedin_url?: string; resume_url?: string }) =>
      request<{ message: string }>(`/referrals/${id}/request`, { method: 'POST', body: JSON.stringify(data) }),
    respond: (requestId: number, data: { status: 'approved' | 'rejected'; response_message?: string }) =>
      request<{ message: string }>(`/referrals/requests/${requestId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<{ message: string }>(`/referrals/${id}`, { method: 'DELETE' }),
  },

  // ── Feature 10: Skill Tests ─────────────────────────────────
  tests: {
    list: () => request<SkillTest[]>('/tests'),
    create: (data: CreateTestData) =>
      request<{ message: string; testId: number }>('/tests', { method: 'POST', body: JSON.stringify(data) }),
    forGig: (gigId: number) => request<SkillTest>(`/tests/gig/${gigId}`),
    submit: (testId: number, data: { answers: Record<number, number | string>; time_taken_seconds?: number }) =>
      request<TestResult>(`/tests/${testId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
    results: (testId: number) => request<TestSubmission[]>(`/tests/${testId}/results`),
    mySubmissions: () => request<TestSubmission[]>('/tests/my-submissions'),
  },

  // ── Bonus + Features 3,7,8: Candidates / Discover ──────────
  candidates: {
    discover: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<CandidateListResponse>(`/candidates${qs}`);
    },
    setDiscoverable: (data: DiscoverableProfile) =>
      request<{ message: string }>('/candidates/discoverable', { method: 'PUT', body: JSON.stringify(data) }),
    recommendations: () => request<{ jobs: Gig[]; message?: string }>('/candidates/recommendations'),
    upsertCompany: (data: Partial<CompanyProfile>) =>
      request<{ message: string }>('/candidates/company', { method: 'POST', body: JSON.stringify(data) }),
    getCompany: (userId: string) => request<CompanyProfile>(`/candidates/company/${userId}`),
    reportFraud: (data: { gig_id?: number; employer_id?: string; reason: string }) =>
      request<{ message: string }>('/candidates/report', { method: 'POST', body: JSON.stringify(data) }),
    salaryInsights: (gigId: number) => request<SalaryInsights>(`/candidates/salary-insights/${gigId}`),
  },
};

// ── Types ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'worker' | 'employer' | 'admin';
  bio?: string;
  avatar_url?: string;
  city?: string;
  state?: string;
  location?: string;
  hourly_rate?: number;
  rating?: number;
  total_reviews?: number;
  total_jobs_completed?: number;
  is_verified?: boolean;
  skills?: string[];
  // New fields
  is_discoverable?: boolean;
  years_experience?: number;
  github_url?: string;
  linkedin_url?: string;
  website_url?: string;
  desired_salary_min?: number;
  desired_salary_max?: number;
  resume_url?: string;
  profile_headline?: string;
}

export interface Gig {
  id: number;
  title: string;
  description: string;
  job_type: string;
  status: string;
  budget_min?: number;
  budget_max?: number;
  budget_type?: string;
  currency?: string;
  city?: string;
  state?: string;
  is_remote?: boolean;
  skills_required?: string[];
  total_bids?: number;
  views?: number;
  deadline?: string;
  created_at: string;
  category_id?: number;
  category_name?: string;
  creator_id?: string;
  creator_name?: string;
  creator_rating?: number;
  creator_avatar?: string;
  saved_at?: string;
  // New fields
  salary_min?: number;
  salary_max?: number;
  interview_difficulty?: number;
  company_name?: string;
  company_verified?: boolean;
  is_fake_flagged?: boolean;
  is_actively_hiring?: boolean;
  has_skill_test?: boolean;
  match_score?: number;
}

export interface GigListResponse {
  gigs: Gig[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GigFilters {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  city?: string;
  job_type?: string;
  budget_min?: string;
  budget_max?: string;
  is_remote?: string;
}

export interface CreateGigData {
  title: string;
  description: string;
  category_id?: number;
  job_type?: string;
  budget_min?: number;
  budget_max?: number;
  budget_type?: string;
  city?: string;
  state?: string;
  is_remote?: boolean;
  skills_required?: string[];
  deadline?: string;
  salary_min?: number;
  salary_max?: number;
  interview_difficulty?: number;
  company_name?: string;
}

export interface Bid {
  id: number;
  gig_id?: number;
  gig_title?: string;
  amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  delivery_days?: number;
  created_at: string;
  bidder_id?: string;
  bidder_name?: string;
  bidder_avatar?: string;
  bidder_rating?: number;
  employer_name?: string;
  gig_status?: string;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
  subcategories?: { id: number; name: string }[];
}

export interface Worker {
  id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  city?: string;
  state?: string;
  hourly_rate?: number;
  rating?: number;
  total_reviews?: number;
  total_jobs_completed?: number;
  is_verified?: boolean;
  skills: string[];
  created_at?: string;
  is_discoverable?: boolean;
  years_experience?: number;
  github_url?: string;
  linkedin_url?: string;
  desired_salary_min?: number;
  desired_salary_max?: number;
  profile_headline?: string;
}

export interface WorkersListResponse {
  workers: Worker[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Review {
  id: number;
  rating: number;
  comment?: string;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  gig_title?: string;
  gig_id?: number;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// ── Feature 1: Applications ──────────────────────────────────

export type ApplicationStatus =
  | 'applied' | 'viewed' | 'shortlisted'
  | 'interview_scheduled' | 'offer' | 'rejected';

export interface Application {
  id: number;
  gig_id: number;
  applicant_id?: string;
  status: ApplicationStatus;
  rejection_reason?: string;
  cover_letter?: string;
  expected_salary?: number;
  interview_date?: string;
  recruiter_notes?: string;
  created_at: string;
  updated_at: string;
  // From JOIN
  gig_title?: string;
  gig_status?: string;
  job_type?: string;
  salary_min?: number;
  salary_max?: number;
  budget_min?: number;
  budget_max?: number;
  city?: string;
  is_remote?: boolean;
  company_name?: string;
  company_verified?: boolean;
  employer_name?: string;
  employer_avatar?: string;
}

export interface ApplicationWithCandidate extends Application {
  applicant_name: string;
  avatar_url?: string;
  bio?: string;
  rating?: number;
  total_reviews?: number;
  total_jobs_completed?: number;
  hourly_rate?: number;
  years_experience?: number;
  github_url?: string;
  linkedin_url?: string;
  is_verified?: boolean;
  skills: string[];
  test_passed?: boolean;
  test_score?: number;
}

export interface SkillMatchResult {
  score: number;
  matching: string[];
  missing: string[];
  suggestions: Array<{ skill: string; resource: string }>;
}

// ── Feature 5: Chat ──────────────────────────────────────────

export interface Conversation {
  id: number;
  gig_id?: number;
  gig_title?: string;
  employer_id: string;
  employer_name: string;
  employer_avatar?: string;
  worker_id: string;
  worker_name: string;
  worker_avatar?: string;
  last_message?: string;
  last_message_at: string;
  employer_unread: number;
  worker_unread: number;
}

export interface Message {
  id: number;
  conversation_id?: number;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ── Feature 6: Portfolio ─────────────────────────────────────

export type PortfolioType = 'github' | 'live_link' | 'case_study' | 'video' | 'project';

export interface PortfolioItem {
  id: number;
  user_id?: string;
  title: string;
  description?: string;
  type: PortfolioType;
  url?: string;
  thumbnail_url?: string;
  tags?: string[];
  order_num?: number;
  created_at?: string;
}

// ── Feature 4: Resume Analyzer ───────────────────────────────

export interface ResumeAnalysis {
  id?: number;
  ats_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  formatting_tips: string[];
  improvement_tips: string[];
  detected_skills: string[];
  experience_level: 'junior' | 'mid' | 'senior' | 'lead';
  estimated_yoe: number;
  created_at?: string;
}

export interface ResumeAnalysisSummary {
  id: number;
  ats_score: number;
  summary: string;
  experience_level: string;
  created_at: string;
}

// ── Feature 9: Referrals ─────────────────────────────────────

export interface Referral {
  id: number;
  gig_id?: number;
  gig_title?: string;
  referrer_id: string;
  referrer_name?: string;
  referrer_avatar?: string;
  company_name: string;
  position: string;
  description?: string;
  is_active: boolean;
  max_referrals: number;
  referral_count: number;
  expires_at?: string;
  created_at: string;
  total_requests?: number;
  approved_count?: number;
}

export interface ReferralRequest {
  id: number;
  referral_id: number;
  requester_id?: string;
  requester_name?: string;
  avatar_url?: string;
  bio?: string;
  rating?: number;
  user_skills?: string[];
  message?: string;
  linkedin_url?: string;
  resume_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  response_message?: string;
  created_at: string;
  // From join
  company_name?: string;
  position?: string;
  referrer_name?: string;
  referrer_avatar?: string;
}

export interface ReferralListResponse {
  referrals: Referral[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Feature 10: Skill Tests ──────────────────────────────────

export interface TestQuestion {
  id: number;
  question: string;
  options?: string[];
  question_type: 'mcq' | 'text';
  points: number;
  order_num: number;
  correct_answer?: string; // only for employer
}

export interface SkillTest {
  id: number;
  gig_id: number;
  title: string;
  description?: string;
  time_limit_minutes: number;
  passing_score: number;
  is_active: boolean;
  questions: TestQuestion[];
  total_questions: number;
  created_at?: string;
}

export interface CreateTestData {
  gig_id: number;
  title: string;
  description?: string;
  time_limit_minutes?: number;
  passing_score?: number;
  questions: Array<{
    question: string;
    options?: string[];
    correct_answer: string;
    question_type?: 'mcq' | 'text';
    points?: number;
  }>;
}

export interface TestResult {
  score: number;
  passed: boolean;
  passing_score: number;
  message: string;
}

export interface TestSubmission {
  id: number;
  test_id?: number;
  test_title?: string;
  applicant_id?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  rating?: number;
  score: number;
  passed: boolean;
  passing_score?: number;
  time_taken_seconds?: number;
  completed_at: string;
  gig_id?: number;
  gig_title?: string;
}

// ── Bonus + Features 3,7,8 ──────────────────────────────────

export interface DiscoverableProfile {
  is_discoverable: boolean;
  profile_headline?: string;
  desired_salary_min?: number;
  desired_salary_max?: number;
  years_experience?: number;
  github_url?: string;
  linkedin_url?: string;
  website_url?: string;
}

export interface CandidateListResponse {
  candidates: Worker[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CompanyProfile {
  id: number;
  user_id: string;
  company_name: string;
  company_size?: string;
  industry?: string;
  website?: string;
  linkedin_url?: string;
  is_verified: boolean;
  is_actively_hiring: boolean;
  description?: string;
  logo_url?: string;
  avg_rating?: number;
  avg_interview_difficulty?: number;
  created_at: string;
}

export interface SalaryInsights {
  salary_range: { min?: number; max?: number };
  market_benchmarks: Array<{
    job_title: string;
    experience_level: string;
    min_salary: number;
    max_salary: number;
    avg_salary: number;
  }>;
  interview_difficulty: number;
  company_info: {
    name?: string;
    verified: boolean;
    avg_rating?: number;
    avg_interview_difficulty?: number;
  };
}
