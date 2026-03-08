'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api, Application, ApplicationStatus } from '@/lib/api';
import {
  Loader2, Briefcase, CheckCircle2, Eye, Calendar,
  Gift, XCircle, Clock, MapPin, ChevronRight, ArrowLeft,
} from 'lucide-react';

const PIPELINE: { status: ApplicationStatus; label: string; icon: React.ElementType; color: string }[] = [
  { status: 'applied',              label: 'Applied',            icon: Briefcase,    color: 'text-muted-foreground' },
  { status: 'viewed',               label: 'Viewed',             icon: Eye,          color: 'text-blue-500' },
  { status: 'shortlisted',          label: 'Shortlisted',        icon: CheckCircle2, color: 'text-indigo-500' },
  { status: 'interview_scheduled',  label: 'Interview',          icon: Calendar,     color: 'text-amber-500' },
  { status: 'offer',                label: 'Offer',              icon: Gift,         color: 'text-emerald-500' },
  { status: 'rejected',             label: 'Rejected',           icon: XCircle,      color: 'text-destructive' },
];

const statusIndex = (s: ApplicationStatus) =>
  PIPELINE.findIndex(p => p.status === s);

function PipelineBadge({ status }: { status: ApplicationStatus }) {
  const step = PIPELINE.find(p => p.status === status);
  if (!step) return null;
  const Icon = step.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${step.color}`}>
      <Icon className="w-3.5 h-3.5" /> {step.label}
    </span>
  );
}

function ApplicationCard({ app }: { app: Application }) {
  const currentIdx = statusIndex(app.status);
  const isRejected = app.status === 'rejected';
  const isOffer    = app.status === 'offer';

  return (
    <div className={`bg-white border rounded-xl p-6 hover:shadow-md transition-all ${isOffer ? 'border-emerald-200 bg-emerald-50/30' : isRejected ? 'border-border' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <Link href={`/jobs/${app.gig_id}`} className="text-base font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
            {app.gig_title}
          </Link>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {app.employer_name && <span>{app.employer_name}</span>}
            {app.company_name && (
              <span className="flex items-center gap-1">
                {app.company_name}
                {app.company_verified && <span className="text-primary">✓</span>}
              </span>
            )}
            {app.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.city}</span>}
            {app.is_remote && <span className="text-emerald-600 font-medium">Remote</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <PipelineBadge status={app.status} />
          <div className="text-[10px] text-muted-foreground mt-1">
            {new Date(app.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      {/* Pipeline progress bar */}
      {!isRejected && (
        <div className="mb-5">
          <div className="flex items-center gap-0">
            {PIPELINE.slice(0, 5).map((step, i) => {
              const Icon = step.icon;
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step.status} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex flex-col items-center gap-1 ${done ? step.color : 'text-muted-foreground/30'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${active ? 'border-primary bg-primary/10 scale-110' : done ? 'border-current bg-current/10' : 'border-muted-foreground/20 bg-transparent'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-medium whitespace-nowrap">{step.label}</span>
                  </div>
                  {i < 4 && (
                    <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < currentIdx ? 'bg-primary' : 'bg-muted-foreground/15'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info rows */}
      {app.status === 'interview_scheduled' && app.interview_date && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3 font-medium">
          <Calendar className="w-4 h-4" />
          Interview: {new Date(app.interview_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      )}

      {app.status === 'offer' && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 mb-3 font-semibold">
          <Gift className="w-4 h-4" /> Congratulations! You have received an offer.
        </div>
      )}

      {app.status === 'rejected' && app.rejection_reason && (
        <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-3">
          <span className="font-medium text-foreground">Feedback: </span>{app.rejection_reason}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/60">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Applied {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <Link href={`/jobs/${app.gig_id}`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            View Job <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (!user || user.role !== 'worker') return;
    api.applications.mine().then(setApplications).catch(() => {}).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);

  const stats = {
    total: applications.length,
    active: applications.filter(a => !['rejected'].includes(a.status)).length,
    interviews: applications.filter(a => a.status === 'interview_scheduled').length,
    offers: applications.filter(a => a.status === 'offer').length,
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
          <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-1">Track</p>
          <h1 className="text-3xl font-bold text-foreground">My Applications</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time status of every job you&apos;ve applied to</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Applied', value: stats.total, color: 'text-foreground' },
            { label: 'Active',        value: stats.active,     color: 'text-primary' },
            { label: 'Interviews',   value: stats.interviews, color: 'text-amber-600' },
            { label: 'Offers',       value: stats.offers,     color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-border rounded-xl p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 [scrollbar-width:none]">
          {(['all', ...PIPELINE.map(p => p.status)] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white border border-border text-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {s === 'all' ? 'All' : PIPELINE.find(p => p.status === s)?.label}
              {s !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  {applications.filter(a => a.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-20 text-center bg-white">
            <div className="w-14 h-14 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground mb-1">
              {filter === 'all' ? 'No applications yet' : `No ${PIPELINE.find(p => p.status === filter)?.label.toLowerCase()} applications`}
            </p>
            <p className="text-sm text-muted-foreground mb-4">Start applying to jobs to track your progress here</p>
            <Link href="/jobs"><Button size="sm">Browse Jobs</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(app => <ApplicationCard key={app.id} app={app} />)}
          </div>
        )}
      </div>
    </div>
  );
}
