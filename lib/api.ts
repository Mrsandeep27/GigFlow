const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

  // Auto-refresh on 401
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

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (data: { name: string; email: string; password: string; role: 'worker' | 'employer' }) =>
      request<{ token: string; refreshToken: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => request<User>('/auth/me'),

    updateProfile: (data: Partial<User> & { skills?: string[] }) =>
      request<{ message: string }>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    logout: () =>
      request<{ message: string }>('/auth/logout', { method: 'POST' }),
  },

  // ── Gigs ────────────────────────────────────────────────────────────────────
  gigs: {
    list: (params?: GigFilters) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return request<GigListResponse>(`/gigs${qs}`);
    },
    get: (id: number) => request<Gig>(`/gigs/${id}`),
    mine: () => request<Gig[]>('/gigs/mine'),
    categories: () => request<Category[]>('/gigs/categories'),
    create: (data: CreateGigData) =>
      request<{ message: string; gigId: number }>('/gigs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<CreateGigData> & { status?: string }) =>
      request<{ message: string }>(`/gigs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/gigs/${id}`, { method: 'DELETE' }),
  },

  // ── Users / Freelancers ──────────────────────────────────────────────────────
  users: {
    list: (params?: { search?: string; skill?: string; min_rate?: string; max_rate?: string; page?: string; limit?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return request<WorkersListResponse>(`/users${qs}`);
    },
    get: (id: string) => request<Worker>(`/users/${id}`),
  },

  // ── Bids ────────────────────────────────────────────────────────────────────
  bids: {
    forGig: (gigId: number) => request<Bid[]>(`/bids/gig/${gigId}`),
    mine: () => request<Bid[]>('/bids/mine'),
    create: (data: { gigId: number; amount: number; message: string; delivery_days?: number }) =>
      request<{ message: string; bidId: number }>('/bids', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    accept: (bidId: number) =>
      request<{ message: string }>(`/bids/${bidId}/accept`, { method: 'PUT' }),
    reject: (bidId: number) =>
      request<{ message: string }>(`/bids/${bidId}/reject`, { method: 'PUT' }),
    withdraw: (bidId: number) =>
      request<{ message: string }>(`/bids/${bidId}/withdraw`, { method: 'PUT' }),
  },

  // ── Reviews ──────────────────────────────────────────────────────────────────
  reviews: {
    forUser: (userId: string) => request<Review[]>(`/reviews/user/${userId}`),
    forGig: (gigId: number) => request<Review[]>(`/reviews/gig/${gigId}`),
    create: (data: { gig_id: number; reviewed_id: string; rating: number; comment?: string }) =>
      request<{ message: string }>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ── Notifications ────────────────────────────────────────────────────────────
  notifications: {
    list: () => request<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
    markRead: (id: number) =>
      request<{ message: string }>(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () =>
      request<{ message: string }>('/notifications/read-all', { method: 'PUT' }),
  },

  // ── Saved Gigs ───────────────────────────────────────────────────────────────
  savedGigs: {
    list: () => request<Gig[]>('/saved-gigs'),
    save: (gig_id: number) =>
      request<{ message: string }>('/saved-gigs', {
        method: 'POST',
        body: JSON.stringify({ gig_id }),
      }),
    unsave: (gigId: number) =>
      request<{ message: string }>(`/saved-gigs/${gigId}`, { method: 'DELETE' }),
    check: (gigId: number) =>
      request<{ saved: boolean }>(`/saved-gigs/check/${gigId}`),
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
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
