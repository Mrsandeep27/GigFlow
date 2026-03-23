'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import {
  Loader2, Shield, Users, Briefcase, FileText, AlertTriangle,
  Search, ChevronLeft, ChevronRight, Ban, CheckCircle, Eye,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────
interface AdminStats {
  totalUsers: number;
  activeGigs: number;
  totalBids: number;
  pendingReports: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_verified?: boolean;
  created_at: string;
}

interface Report {
  id: string;
  reporter_name: string;
  gig_title: string;
  reason: string;
  status: string;
}

// ── Helpers ─────────────────────────────────────────────────
function authHeaders() {
  const token = localStorage.getItem('gf_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...options?.headers } });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ── Component ───────────────────────────────────────────────
export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Gate: redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage users, gigs, and reports</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
        </Tabs>
      </main>
    </>
  );
}

// ── Dashboard Tab ───────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch<AdminStats>('/api/admin/stats')
      .then(setStats)
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!stats) return null;

  const cards = [
    { label: 'Total Users',     value: stats.totalUsers,     icon: Users,          color: 'bg-primary/8 text-primary' },
    { label: 'Active Gigs',     value: stats.activeGigs,     icon: Briefcase,      color: 'bg-emerald-500/8 text-emerald-600' },
    { label: 'Total Bids',      value: stats.totalBids,      icon: FileText,       color: 'bg-blue-500/8 text-blue-600' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: AlertTriangle,  color: 'bg-yellow-500/8 text-yellow-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="border border-border rounded-xl p-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">{c.label}</span>
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center`}>
              <c.icon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{c.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

// ── Users Tab ───────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async (s: string, p: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch<{ users: AdminUser[]; totalPages: number }>(
        `/api/admin/users?search=${encodeURIComponent(s)}&page=${p}`
      );
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(search, page); }, [search, page, fetchUsers]);

  const toggleActive = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      await adminFetch(`/api/admin/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x)));
    } catch {
      alert('Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const verifyUser = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      await adminFetch(`/api/admin/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_verified: true }),
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_verified: true } : x)));
    } catch {
      alert('Failed to verify user');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No users found.</p>
      ) : (
        <>
          {/* Table */}
          <div className="border border-border rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.is_active ? 'outline' : 'destructive'}>
                          {u.is_active ? 'Active' : 'Banned'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={u.is_active ? 'destructive' : 'outline'}
                            size="sm"
                            disabled={actionLoading === u.id}
                            onClick={() => toggleActive(u)}
                          >
                            {actionLoading === u.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : u.is_active ? (
                              <Ban className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            {u.is_active ? 'Ban' : 'Unban'}
                          </Button>
                          {!u.is_verified && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === u.id}
                              onClick={() => verifyUser(u)}
                            >
                              {actionLoading === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                              Verify
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Reports Tab ─────────────────────────────────────────────
function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<Report[]>('/api/admin/reports')
      .then(setReports)
      .catch(() => setError('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const resolveReport = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/admin/reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'resolved' }),
      });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r)));
    } catch {
      alert('Failed to resolve report');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No reports found.</p>;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reporter</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gig</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{r.reporter_name}</td>
                <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{r.gig_title}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-[250px] truncate">{r.reason}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.status === 'resolved' ? 'secondary' : 'outline'} className="capitalize">
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status !== 'resolved' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading === r.id}
                      onClick={() => resolveReport(r.id)}
                    >
                      {actionLoading === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      Resolve
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Resolved</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Shared small components ─────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
