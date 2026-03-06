'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api, Gig, Bid, Notification } from '@/lib/api';
import { Star, Briefcase, TrendingUp, LogOut, Loader2, PlusCircle, User, Bell, Bookmark, Settings } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  pending: 'outline',
  accepted: 'default',
  rejected: 'destructive',
  withdrawn: 'secondary',
  open: 'outline',
  in_progress: 'default',
  completed: 'secondary',
  closed: 'secondary',
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
      user.role === 'employer' ? api.gigs.mine().then(setMyGigs) : Promise.resolve(),
      user.role === 'worker' ? api.bids.mine().then(setMyBids) : Promise.resolve(),
      api.savedGigs.list().then(setSavedGigs).catch(() => {}),
      api.notifications.list().then(({ notifications: n, unreadCount: u }) => {
        setNotifications(n); setUnreadCount(u);
      }).catch(() => {}),
    ];

    Promise.all(loads).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const handleLogout = () => { logout(); router.push('/'); };

  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleUnsave = async (gigId: number) => {
    await api.savedGigs.unsave(gigId);
    setSavedGigs((prev) => prev.filter((g) => g.id !== gigId));
  };

  const handleCloseJob = async (gigId: number) => {
    await api.gigs.update(gigId, { status: 'closed' });
    setMyGigs((prev) => prev.map((g) => g.id === gigId ? { ...g, status: 'closed' } : g));
  };

  const handleReopenJob = async (gigId: number) => {
    await api.gigs.update(gigId, { status: 'open' });
    setMyGigs((prev) => prev.map((g) => g.id === gigId ? { ...g, status: 'open' } : g));
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const pendingBids = myBids.filter(b => b.status === 'pending').length;
  const acceptedBids = myBids.filter(b => b.status === 'accepted').length;
  const openGigs = myGigs.filter(g => g.status === 'open').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-5">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <User className="w-10 h-10 text-primary-foreground" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold capitalize">{user.role}</span>
              </div>
              <p className="text-muted-foreground text-sm">{user.bio || (user.role === 'employer' ? 'Employer Account' : 'Freelancer Account')}</p>
              {user.rating ? (
                <div className="flex items-center gap-1.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(Number(user.rating)) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  ))}
                  <span className="text-sm font-medium">{Number(user.rating).toFixed(1)} ({user.total_reviews} reviews)</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="bg-transparent gap-1.5">
                <Settings className="w-4 h-4" /> Edit Profile
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="text-destructive bg-transparent gap-1.5" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">{user.role === 'employer' ? 'Posted Jobs' : 'Total Bids'}</div>
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold">{user.role === 'employer' ? myGigs.length : myBids.length}</div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">{user.role === 'employer' ? 'Open Jobs' : 'Pending'}</div>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold">{user.role === 'employer' ? openGigs : pendingBids}</div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">{user.role === 'employer' ? 'Completed' : 'Accepted'}</div>
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold">{user.role === 'employer' ? user.total_jobs_completed || 0 : acceptedBids}</div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Notifications</div>
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold">{unreadCount}</div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex w-full max-w-lg">
            <TabsTrigger value="overview" className="flex-1">{user.role === 'employer' ? 'My Jobs' : 'My Bids'}</TabsTrigger>
            <TabsTrigger value="saved" className="flex-1">
              Saved {savedGigs.length > 0 && `(${savedGigs.length})`}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1">
              Alerts {unreadCount > 0 && <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">{unreadCount}</span>}
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            {user.role === 'employer' && (
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">My Posted Jobs</h2>
                <Link href="/jobs/post">
                  <Button size="sm" className="gap-1.5"><PlusCircle className="w-4 h-4" /> Post a Job</Button>
                </Link>
              </div>
            )}
            {user.role === 'worker' && <h2 className="text-xl font-bold">My Bids</h2>}

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : user.role === 'employer' ? (
              myGigs.length === 0 ? (
                <Card className="p-12 text-center">
                  <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No jobs posted yet</p>
                  <Link href="/jobs/post"><Button className="mt-4">Post Your First Job</Button></Link>
                </Card>
              ) : myGigs.map((gig) => (
                <Card key={gig.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/jobs/${gig.id}`} className="text-base font-bold text-foreground hover:text-primary line-clamp-1">{gig.title}</Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {[gig.city, gig.is_remote ? 'Remote' : null].filter(Boolean).join(' · ') || 'Location not set'} · {gig.total_bids || 0} proposals
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusVariant[gig.status] || 'outline'} className="capitalize">{gig.status.replace('_', ' ')}</Badge>
                      {gig.status === 'open' && (
                        <Button size="sm" variant="outline" className="bg-transparent text-xs h-7" onClick={() => handleCloseJob(gig.id)}>Close</Button>
                      )}
                      {gig.status === 'closed' && (
                        <Button size="sm" variant="outline" className="bg-transparent text-xs h-7" onClick={() => handleReopenJob(gig.id)}>Reopen</Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              myBids.length === 0 ? (
                <Card className="p-12 text-center">
                  <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No bids placed yet</p>
                  <Link href="/jobs"><Button className="mt-4">Browse Jobs</Button></Link>
                </Card>
              ) : myBids.map((bid) => (
                <Card key={bid.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/jobs/${bid.gig_id}`} className="text-base font-bold text-foreground hover:text-primary line-clamp-1">{bid.gig_title}</Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {bid.employer_name} · Bid: ₹{Number(bid.amount).toLocaleString('en-IN')}
                        {bid.delivery_days && ` · ${bid.delivery_days} days`}
                      </p>
                    </div>
                    <Badge variant={statusVariant[bid.status] || 'outline'} className="capitalize shrink-0">{bid.status}</Badge>
                  </div>
                </Card>
              ))
            )}

            {user.role === 'worker' && myBids.length > 0 && (
              <Link href="/jobs"><Button variant="outline" className="w-full mt-2 bg-transparent">Browse More Jobs</Button></Link>
            )}
          </TabsContent>

          {/* Saved Jobs */}
          <TabsContent value="saved" className="space-y-4">
            <h2 className="text-xl font-bold">Saved Jobs</h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : savedGigs.length === 0 ? (
              <Card className="p-12 text-center">
                <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No saved jobs yet</p>
                <Link href="/jobs"><Button className="mt-4">Browse Jobs</Button></Link>
              </Card>
            ) : savedGigs.map((gig) => (
              <Card key={gig.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/jobs/${gig.id}`} className="text-base font-bold text-foreground hover:text-primary line-clamp-1">{gig.title}</Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      by {gig.creator_name} · {gig.category_name || gig.job_type}
                      {(gig.budget_min || gig.budget_max) && ` · ₹${(gig.budget_min || gig.budget_max)?.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant[gig.status] || 'outline'} className="capitalize">{gig.status}</Badge>
                    <Button size="sm" variant="outline" className="bg-transparent text-xs h-7 text-destructive" onClick={() => handleUnsave(gig.id)}>Remove</Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Notifications</h2>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" className="bg-transparent" onClick={handleMarkAllRead}>
                  Mark all read
                </Button>
              )}
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : notifications.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No notifications yet</p>
              </Card>
            ) : notifications.map((n) => (
              <Card key={n.id} className={`p-4 ${!n.is_read ? 'border-primary/30 bg-primary/5' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-primary' : 'bg-muted'}`} />
                  <div className="flex-1">
                    <div className="font-semibold text-foreground text-sm">{n.title}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{n.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
