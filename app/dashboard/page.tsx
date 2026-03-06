'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api, Gig, Bid, Notification } from '@/lib/api';
import { Star, Briefcase, TrendingUp, LogOut, Loader2, PlusCircle, User, Bell, Bookmark, Settings } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  pending:     'outline',
  accepted:    'default',
  rejected:    'destructive',
  withdrawn:   'secondary',
  open:        'outline',
  in_progress: 'default',
  completed:   'secondary',
  closed:      'secondary',
};

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [myGigs, setMyGigs] = useState<Gig[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [savedGigs, setSavedGigs] = useState<Gig[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (!user) return;

    const loads = [
      user.role === 'employer' ? api.gigs.mine().then(setMyGigs)                                                    : Promise.resolve(),
      user.role === 'worker'   ? api.bids.mine().then(setMyBids)                                                    : Promise.resolve(),
      api.savedGigs.list().then(setSavedGigs).catch(() => {}),
      api.notifications.list().then(({ notifications: n, unreadCount: u }) => {
        setNotifications(n); setUnreadCount(u);
      }).catch(() => {}),
    ];

    Promise.all(loads).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const handleLogout     = () => { logout(); router.push('/'); };
  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };
  const handleUnsave     = async (gigId: number) => {
    await api.savedGigs.unsave(gigId);
    setSavedGigs((prev) => prev.filter((g) => g.id !== gigId));
  };
  const handleCloseJob   = async (gigId: number) => {
    await api.gigs.update(gigId, { status: 'closed' });
    setMyGigs((prev) => prev.map((g) => g.id === gigId ? { ...g, status: 'closed' } : g));
  };
  const handleReopenJob  = async (gigId: number) => {
    await api.gigs.update(gigId, { status: 'open' });
    setMyGigs((prev) => prev.map((g) => g.id === gigId ? { ...g, status: 'open' } : g));
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  const pendingBids  = myBids.filter(b => b.status === 'pending').length;
  const acceptedBids = myBids.filter(b => b.status === 'accepted').length;
  const openGigs     = myGigs.filter(g => g.status === 'open').length;

  const stats = user.role === 'employer'
    ? [
        { label: 'Posted Jobs',  value: myGigs.length,                      icon: Briefcase,   color: 'bg-primary/8 text-primary' },
        { label: 'Open Jobs',    value: openGigs,                            icon: TrendingUp,  color: 'bg-emerald-500/8 text-emerald-600' },
        { label: 'Completed',    value: user.total_jobs_completed || 0,      icon: Star,        color: 'bg-yellow-500/8 text-yellow-600' },
        { label: 'Notifications',value: unreadCount,                         icon: Bell,        color: 'bg-accent/8 text-accent' },
      ]
    : [
        { label: 'Total Bids',   value: myBids.length,                       icon: Briefcase,   color: 'bg-primary/8 text-primary' },
        { label: 'Pending',      value: pendingBids,                          icon: TrendingUp,  color: 'bg-yellow-500/8 text-yellow-600' },
        { label: 'Accepted',     value: acceptedBids,                         icon: Star,        color: 'bg-emerald-500/8 text-emerald-600' },
        { label: 'Notifications',value: unreadCount,                          icon: Bell,        color: 'bg-accent/8 text-accent' },
      ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ─── Profile header ──────────────────────────────────── */}
        <div className="bg-white border border-border rounded-xl p-6 mb-6 relative overflow-hidden">
          {/* Subtle background gradient */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, oklch(0.44 0.18 264 / 0.04), transparent 70%)', filter: 'blur(40px)' }}
          />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-[72px] h-[72px] rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">{user.name}</h1>
                  <span className="text-[10px] bg-primary/8 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide capitalize">{user.role}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1.5">
                  {user.bio || (user.role === 'employer' ? 'Employer Account' : 'Freelancer Account')}
                </p>
                {user.rating ? (
                  <div className="flex items-center gap-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(Number(user.rating)) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/25'}`} />
                    ))}
                    <span className="text-xs font-semibold text-foreground ml-0.5">{Number(user.rating).toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({user.total_reviews} reviews)</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Link href="/profile">
                <Button variant="outline" size="sm" className="bg-transparent gap-1.5 h-9 text-sm hover:border-primary/40">
                  <Settings className="w-3.5 h-3.5" /> Edit Profile
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive bg-transparent gap-1.5 h-9 text-sm hover:border-destructive/40"
                onClick={handleLogout}
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              </div>
            );
          })}
        </div>

        {/* ─── Tabs ────────────────────────────────────────────── */}
        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="flex w-full max-w-md bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="flex-1 rounded-lg text-sm font-medium">
              {user.role === 'employer' ? 'My Jobs' : 'My Bids'}
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex-1 rounded-lg text-sm font-medium">
              Saved {savedGigs.length > 0 && `(${savedGigs.length})`}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 rounded-lg text-sm font-medium">
              Alerts {unreadCount > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-px font-bold">{unreadCount}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-3 mt-0">
            {user.role === 'employer' && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">My Posted Jobs</h2>
                <Link href="/jobs/post">
                  <Button size="sm" className="gap-1.5 h-8 text-sm shadow-sm">
                    <PlusCircle className="w-3.5 h-3.5" /> Post a Job
                  </Button>
                </Link>
              </div>
            )}
            {user.role === 'worker' && <h2 className="text-lg font-bold text-foreground mb-4">My Bids</h2>}

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : user.role === 'employer' ? (
              myGigs.length === 0 ? (
                <div className="bg-white border border-dashed border-border rounded-xl py-16 text-center">
                  <div className="w-12 h-12 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No jobs posted yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Post your first project to start receiving proposals</p>
                  <Link href="/jobs/post"><Button size="sm">Post Your First Job</Button></Link>
                </div>
              ) : myGigs.map((gig) => (
                <div key={gig.id} className="bg-white border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/jobs/${gig.id}`} className="text-[15px] font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
                        {gig.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {[gig.city, gig.is_remote ? 'Remote' : null].filter(Boolean).join(' · ') || 'Location not set'}
                        {' · '}{gig.total_bids || 0} proposals
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusVariant[gig.status] || 'outline'} className="capitalize text-xs">
                        {gig.status.replace('_', ' ')}
                      </Badge>
                      {gig.status === 'open' && (
                        <Button size="sm" variant="outline" className="bg-transparent text-xs h-7 px-3" onClick={() => handleCloseJob(gig.id)}>Close</Button>
                      )}
                      {gig.status === 'closed' && (
                        <Button size="sm" variant="outline" className="bg-transparent text-xs h-7 px-3" onClick={() => handleReopenJob(gig.id)}>Reopen</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              myBids.length === 0 ? (
                <div className="bg-white border border-dashed border-border rounded-xl py-16 text-center">
                  <div className="w-12 h-12 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No bids placed yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Browse projects and submit your first proposal</p>
                  <Link href="/jobs"><Button size="sm">Browse Jobs</Button></Link>
                </div>
              ) : myBids.map((bid) => (
                <div key={bid.id} className="bg-white border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/jobs/${bid.gig_id}`} className="text-[15px] font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
                        {bid.gig_title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        by {bid.employer_name}
                        {' · '}Bid: <strong className="text-foreground">₹{Number(bid.amount).toLocaleString('en-IN')}</strong>
                        {bid.delivery_days && ` · ${bid.delivery_days} days`}
                      </p>
                    </div>
                    <Badge variant={statusVariant[bid.status] || 'outline'} className="capitalize shrink-0 text-xs">{bid.status}</Badge>
                  </div>
                </div>
              ))
            )}

            {user.role === 'worker' && myBids.length > 0 && (
              <Link href="/jobs">
                <Button variant="outline" className="w-full mt-2 bg-transparent hover:border-primary/40 hover:text-primary">Browse More Jobs</Button>
              </Link>
            )}
          </TabsContent>

          {/* Saved Jobs */}
          <TabsContent value="saved" className="space-y-3 mt-0">
            <h2 className="text-lg font-bold text-foreground mb-4">Saved Projects</h2>
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : savedGigs.length === 0 ? (
              <div className="bg-white border border-dashed border-border rounded-xl py-16 text-center">
                <div className="w-12 h-12 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bookmark className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No saved jobs yet</p>
                <p className="text-xs text-muted-foreground mb-4">Save interesting projects to review them later</p>
                <Link href="/jobs"><Button size="sm">Browse Jobs</Button></Link>
              </div>
            ) : savedGigs.map((gig) => (
              <div key={gig.id} className="bg-white border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/jobs/${gig.id}`} className="text-[15px] font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
                      {gig.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {gig.creator_name} · {gig.category_name || gig.job_type}
                      {(gig.budget_min || gig.budget_max) && ` · ₹${(gig.budget_min || gig.budget_max)?.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant[gig.status] || 'outline'} className="capitalize text-xs">{gig.status}</Badge>
                    <Button size="sm" variant="outline" className="bg-transparent text-xs h-7 px-3 text-destructive hover:border-destructive/30" onClick={() => handleUnsave(gig.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-3 mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" className="bg-transparent h-8 text-xs hover:border-primary/40" onClick={handleMarkAllRead}>
                  Mark all read
                </Button>
              )}
            </div>
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : notifications.length === 0 ? (
              <div className="bg-white border border-dashed border-border rounded-xl py-16 text-center">
                <div className="w-12 h-12 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">All caught up</p>
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-white border rounded-xl p-4 transition-colors ${
                  !n.is_read ? 'border-primary/25 bg-primary/[0.02]' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-[5px] shrink-0 ${!n.is_read ? 'bg-primary' : 'bg-border'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm mb-0.5">{n.title}</div>
                    <div className="text-sm text-muted-foreground leading-relaxed">{n.message}</div>
                    <div className="text-xs text-muted-foreground/60 mt-1.5">
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
