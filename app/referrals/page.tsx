'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { api, Referral, ReferralRequest } from '@/lib/api';
import {
  ArrowLeft, Users, Plus, Loader2, MapPin, Building2,
  CheckCircle2, XCircle, Clock, ChevronRight, X, Briefcase,
  Send, UserCheck, Gift,
} from 'lucide-react';

const statusColor: Record<string, string> = {
  open:     'text-emerald-600 bg-emerald-50 border-emerald-200',
  closed:   'text-muted-foreground bg-muted border-border',
  filled:   'text-blue-600 bg-blue-50 border-blue-200',
};

const reqStatusInfo: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: 'Pending',  color: 'text-amber-600',   icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-600', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-destructive', icon: XCircle },
};

interface PostForm {
  title: string;
  company: string;
  description: string;
  location: string;
  type: string;
  salary_range: string;
  referral_bonus: string;
}

const EMPTY_FORM: PostForm = {
  title: '', company: '', description: '', location: '',
  type: 'full-time', salary_range: '', referral_bonus: '',
};

export default function ReferralsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'browse' | 'mine' | 'requests'>('browse');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [mine, setMine] = useState<Referral[]>([]);
  const [requests, setRequests] = useState<ReferralRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (!user) return;
    loadAll();
  }, [user, authLoading]);

  async function loadAll() {
    setLoading(true);
    try {
      const [all, myOwn, reqs] = await Promise.all([
        api.referrals.list(),
        api.referrals.mine(),
        api.referrals.myRequests(),
      ]);
      setReferrals(all);
      setMine(myOwn);
      setRequests(reqs);
    } catch {}
    setLoading(false);
  }

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  const pendingRequestCount = requests.filter(r => r.status === 'pending').length;

  const handlePost = async () => {
    if (!form.title.trim() || !form.company.trim()) { setError('Title and company are required'); return; }
    setSaving(true); setError('');
    try {
      await api.referrals.create({
        position: form.title,
        company_name: form.company,
        description: form.description,
      });
      await loadAll();
      setForm(EMPTY_FORM);
      setShowForm(false);
      setTab('mine');
    } catch (e: any) {
      setError(e?.message || 'Failed to post referral');
    }
    setSaving(false);
  };

  const handleRequest = async (referralId: number) => {
    setRequestingId(referralId);
    try {
      await api.referrals.request(referralId, {});
      setReferrals(prev => prev.map(r => r.id === referralId ? { ...r, _requested: true } as any : r));
    } catch {}
    setRequestingId(null);
  };

  const handleAction = async (requestId: number, action: 'approve' | 'reject') => {
    setActionId(requestId);
    try {
      await api.referrals.respond(requestId, { status: action === 'approve' ? 'approved' : 'rejected' });
      await loadAll();
    } catch {}
    setActionId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 mb-4 text-muted-foreground hover:text-foreground h-8">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Button>
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-1">Network</p>
              <h1 className="text-3xl font-bold text-foreground">Referrals</h1>
              <p className="text-muted-foreground text-sm mt-1">Get referred or refer others — unlock hidden opportunities</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" /> Post Referral
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {([
            { id: 'browse', label: 'Browse', icon: Users },
            { id: 'mine',   label: 'My Posts', icon: Briefcase },
            { id: 'requests', label: 'Requests', icon: UserCheck },
          ] as const).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />{t.label}
                {t.id === 'requests' && pendingRequestCount > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingRequestCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Post Form */}
        {showForm && (
          <div className="bg-white border border-border rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground text-base">Post a Referral Opportunity</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(''); }}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Job Title *</label>
                  <Input placeholder="e.g. Senior React Developer" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Company *</label>
                  <Input placeholder="e.g. Razorpay" value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="h-9" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Description</label>
                <textarea rows={3} placeholder="What role is this? What are you looking for?"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Location</label>
                  <Input placeholder="Bangalore / Remote" value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Salary Range</label>
                  <Input placeholder="₹20L – ₹35L" value={form.salary_range}
                    onChange={e => setForm(f => ({ ...f, salary_range: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block flex items-center gap-1"><Gift className="w-3 h-3" /> Referral Bonus</label>
                  <Input placeholder="e.g. ₹50,000" value={form.referral_bonus}
                    onChange={e => setForm(f => ({ ...f, referral_bonus: e.target.value }))} className="h-9" />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="h-9 bg-transparent">Cancel</Button>
                <Button onClick={handlePost} disabled={saving} className="h-9 gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Post Referral
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Browse Tab */}
            {tab === 'browse' && (
              <div className="space-y-4">
                {referrals.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl py-20 text-center bg-white">
                    <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold text-foreground mb-1">No referrals posted yet</p>
                    <p className="text-sm text-muted-foreground">Be the first to post a referral opportunity</p>
                  </div>
                ) : referrals.map(r => (
                  <ReferralCard
                    key={r.id}
                    referral={r}
                    currentUserId={user.id}
                    onRequest={() => handleRequest(r.id)}
                    requesting={requestingId === r.id}
                  />
                ))}
              </div>
            )}

            {/* My Posts Tab */}
            {tab === 'mine' && (
              <div className="space-y-4">
                {mine.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl py-20 text-center bg-white">
                    <Briefcase className="w-8 h-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold text-foreground mb-1">No referrals posted</p>
                    <p className="text-sm text-muted-foreground mb-4">Post referral opportunities at your company</p>
                    <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5"><Plus className="w-4 h-4" />Post Referral</Button>
                  </div>
                ) : mine.map(r => (
                  <ReferralCard key={r.id} referral={r} currentUserId={user.id} isOwner />
                ))}
              </div>
            )}

            {/* Requests Tab */}
            {tab === 'requests' && (
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl py-20 text-center bg-white">
                    <UserCheck className="w-8 h-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold text-foreground mb-1">No referral requests</p>
                    <p className="text-sm text-muted-foreground">Requests for referrals you post will appear here</p>
                  </div>
                ) : requests.map(req => {
                  const info = reqStatusInfo[req.status] ?? reqStatusInfo.pending;
                  const Icon = info.icon;
                  return (
                    <div key={req.id} className="bg-white border border-border rounded-xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm">{req.requester_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Requesting referral for <span className="font-medium text-foreground">{req.referral_title}</span> at {req.referral_company}
                          </p>
                          {req.message && (
                            <p className="text-xs text-muted-foreground mt-2 bg-muted/40 rounded px-2.5 py-1.5 italic">"{req.message}"</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${info.color}`}>
                            <Icon className="w-3.5 h-3.5" />{info.label}
                          </span>
                          {req.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleAction(req.id, 'reject')}
                                disabled={actionId === req.id} className="h-7 px-3 text-xs bg-transparent text-destructive border-destructive/40 hover:bg-destructive hover:text-white">
                                {actionId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              </Button>
                              <Button size="sm" onClick={() => handleAction(req.id, 'approve')}
                                disabled={actionId === req.id} className="h-7 px-3 text-xs gap-1">
                                {actionId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                Approve
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReferralCard({
  referral, currentUserId, onRequest, requesting, isOwner,
}: {
  referral: Referral;
  currentUserId: number;
  onRequest?: () => void;
  requesting?: boolean;
  isOwner?: boolean;
}) {
  const isOwn = referral.poster_id === currentUserId;
  const statusCls = statusColor[referral.status] ?? statusColor.open;

  return (
    <div className="bg-white border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-foreground text-sm">{referral.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${statusCls}`}>
              {referral.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{referral.company}</span>
            {referral.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{referral.location}</span>}
          </div>
        </div>
        {!isOwn && !isOwner && referral.status === 'open' && (
          <Button size="sm" onClick={onRequest} disabled={requesting || referral._requested}
            className="shrink-0 h-8 px-4 text-xs gap-1.5">
            {requesting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {referral._requested ? 'Requested' : 'Request Referral'}
          </Button>
        )}
      </div>

      {referral.description && (
        <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2">{referral.description}</p>
      )}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/60">
        {referral.salary_range && (
          <span className="text-xs font-bold text-primary">{referral.salary_range}</span>
        )}
        {referral.referral_bonus && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Gift className="w-3 h-3" /> {referral.referral_bonus} bonus
          </span>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">
          by {referral.poster_name} · {new Date(referral.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
