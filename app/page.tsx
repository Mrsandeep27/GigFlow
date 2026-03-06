'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/navbar';
import { api, Gig, Worker } from '@/lib/api';
import { Briefcase, Users, TrendingUp, ArrowRight, Star, BadgeCheck, MapPin, Search, ArrowUpRight } from 'lucide-react';

// Noise grain SVG for dark sections
const GRAIN_SVG = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredJobs, setFeaturedJobs] = useState<Gig[]>([]);
  const [topFreelancers, setTopFreelancers] = useState<Worker[]>([]);

  useEffect(() => {
    api.gigs.list({ limit: '4' }).then((r) => setFeaturedJobs(r.gigs)).catch(() => {});
    api.users.list({ limit: '3' }).then((r) => setTopFreelancers(r.workers)).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/jobs${searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : ''}`);
  };

  const formatBudget = (gig: Gig) => {
    const curr = gig.currency || '₹';
    if (gig.budget_min && gig.budget_max) return `${curr}${Number(gig.budget_min).toLocaleString('en-IN')} – ${curr}${Number(gig.budget_max).toLocaleString('en-IN')}`;
    if (gig.budget_max) return `Up to ${curr}${Number(gig.budget_max).toLocaleString('en-IN')}`;
    if (gig.budget_min) return `From ${curr}${Number(gig.budget_min).toLocaleString('en-IN')}`;
    return 'Negotiable';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ─── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'var(--hero-bg)' }}>
        {/* Ambient gradient orbs */}
        <div
          className="absolute top-[-15%] right-[-8%] w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.55 0.18 264 / 0.25), transparent 65%)', filter: 'blur(80px)' }}
        />
        <div
          className="absolute bottom-[-20%] left-[-8%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.54 0.13 210 / 0.18), transparent 65%)', filter: 'blur(70px)' }}
        />
        <div
          className="absolute top-[45%] left-[50%] w-[350px] h-[350px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.78 0.14 85 / 0.10), transparent 65%)', filter: 'blur(60px)' }}
        />

        {/* Grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_SVG, backgroundSize: '256px 256px', opacity: 0.038 }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">

          {/* Badge */}
          <div className="gig-fade-in mb-8 inline-flex">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full gig-pulse" style={{ background: 'var(--gold)' }} />
              <span className="text-[11px] font-semibold tracking-[0.14em] text-white/60 uppercase">India&apos;s Professional Marketplace</span>
            </div>
          </div>

          {/* Headline */}
          <h1
            className="gig-fade-in-up gig-delay-100 text-5xl sm:text-6xl lg:text-7xl font-display font-normal text-white leading-[1.05] mb-6 max-w-2xl"
            style={{ letterSpacing: '-0.03em' }}
          >
            Where Indian Talent<br />
            Meets{' '}
            <em className="not-italic" style={{ color: 'var(--gold)' }}>Opportunity.</em>
          </h1>

          {/* Subtext */}
          <p className="gig-fade-in-up gig-delay-200 text-lg text-white/50 leading-relaxed mb-10 max-w-lg font-light">
            GigFlow connects India&apos;s finest freelancers with businesses ready to grow — post a project, or find your next career-defining work.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="gig-fade-in-up gig-delay-300 flex gap-2 max-w-xl mb-14">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by skill, job title, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 bg-white border-0 shadow-2xl shadow-black/30 text-sm font-medium rounded-xl"
              />
            </div>
            <Button
              type="submit"
              className="h-12 px-7 font-semibold shrink-0 rounded-xl shadow-2xl shadow-black/30 text-black hover:opacity-90 transition-opacity"
              style={{ background: 'var(--gold)', color: 'oklch(0.13 0.025 264)' }}
            >
              Search
            </Button>
          </form>

          {/* Stats row */}
          <div className="gig-fade-in-up gig-delay-400 flex flex-wrap items-center gap-8">
            {[
              { stat: '1,000+', label: 'Active Projects' },
              { stat: '500+',   label: 'Verified Professionals' },
              { stat: '₹10L+',  label: 'Payments Processed' },
            ].map((item, i) => (
              <div key={i} className={i > 0 ? 'border-l border-white/10 pl-8' : ''}>
                <div className="text-2xl font-bold text-white">{item.stat}</div>
                <div className="text-xs text-white/35 mt-0.5 tracking-wide">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Category quick links ───────────────────────────────── */}
      <section className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap mr-2 shrink-0 uppercase tracking-[0.14em]">Browse:</span>
            {['Web Development', 'Design & Creative', 'Digital Marketing', 'Writing & Content', 'Mobile Apps', 'Data & Analytics', 'Finance & Accounting'].map((cat) => (
              <Link key={cat} href={`/jobs?search=${encodeURIComponent(cat)}`}>
                <span className="inline-flex items-center whitespace-nowrap px-3.5 py-1.5 bg-secondary border border-border rounded-full text-xs font-medium text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer">
                  {cat}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Latest Projects ────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-2">Opportunities</p>
              <h2 className="text-3xl font-bold text-foreground">Latest Projects</h2>
              <p className="text-sm text-muted-foreground mt-1">Recently posted from verified clients</p>
            </div>
            <Link href="/jobs">
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent text-xs h-8 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="group relative border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all bg-white cursor-pointer overflow-hidden h-full flex flex-col">
                    {/* Left accent bar */}
                    <div className="absolute top-0 left-0 w-[3px] h-full bg-border group-hover:bg-primary transition-colors rounded-l-xl" />
                    <div className="pl-3 flex flex-col flex-1">
                      {job.category_name && (
                        <span className="inline-block text-[10px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-md mb-3 uppercase tracking-[0.12em] w-fit">
                          {job.category_name}
                        </span>
                      )}
                      <h3 className="font-bold text-foreground mb-2 text-[15px] leading-snug group-hover:text-primary transition-colors line-clamp-2 flex-1">
                        {job.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{job.description}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-border/60">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-primary text-sm">{formatBudget(job)}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.is_remote ? 'Remote' : [job.city, job.state].filter(Boolean).join(', ') || 'Flexible'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{job.total_bids || 0} proposals</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary -mt-px transition-opacity" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl p-16 text-center">
              <div className="w-12 h-12 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">No projects posted yet.</p>
              <Link href="/jobs/post"><Button size="sm">Post the First Project</Button></Link>
            </div>
          )}
        </div>
      </section>

      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* ─── Top Professionals ──────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-2">Talent</p>
              <h2 className="text-3xl font-bold text-foreground">Top Professionals</h2>
              <p className="text-sm text-muted-foreground mt-1">Highly rated freelancers ready to collaborate</p>
            </div>
            <Link href="/freelancers">
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent text-xs h-8 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {topFreelancers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {topFreelancers.map((freelancer) => (
                <Link key={freelancer.id} href={`/freelancers/${freelancer.id}`}>
                  <div className="group bg-white border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer h-full">
                    <div className="flex items-center gap-4 mb-5">
                      {freelancer.avatar_url ? (
                        <img src={freelancer.avatar_url} alt={freelancer.name} className="w-14 h-14 rounded-full object-cover border-2 border-border group-hover:border-primary/30 transition-colors" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shrink-0">
                          {freelancer.name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-foreground text-sm truncate">{freelancer.name}</span>
                          {freelancer.is_verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                        {freelancer.hourly_rate ? (
                          <p className="text-sm font-bold text-primary">
                            ₹{Number(freelancer.hourly_rate).toLocaleString('en-IN')}
                            <span className="text-xs font-normal text-muted-foreground">/hr</span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Rate negotiable</p>
                        )}
                      </div>
                    </div>

                    {freelancer.rating && (
                      <div className="flex items-center gap-1.5 mb-4">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(freelancer.rating!) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/25'}`} />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-foreground">{Number(freelancer.rating).toFixed(1)}</span>
                        {freelancer.total_reviews && <span className="text-xs text-muted-foreground">({freelancer.total_reviews})</span>}
                      </div>
                    )}

                    {freelancer.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {freelancer.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="text-[11px] bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-medium border border-border/60">
                            {skill}
                          </span>
                        ))}
                        {freelancer.skills.length > 3 && (
                          <span className="text-[11px] text-muted-foreground self-center">+{freelancer.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl p-16 text-center bg-white">
              <div className="w-12 h-12 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">No professionals listed yet.</p>
              <Link href="/auth/signup"><Button size="sm">Join as a Professional</Button></Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-2">Process</p>
            <h2 className="text-3xl font-bold text-foreground">How GigFlow Works</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">A streamlined process from posting to project completion</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
            {[
              { icon: Briefcase,   step: '01', title: 'Post a Project',    description: 'Describe your requirements, set a budget, and specify the skills needed.' },
              { icon: Users,       step: '02', title: 'Review Proposals',  description: 'Receive bids from qualified professionals and evaluate their experience.' },
              { icon: TrendingUp,  step: '03', title: 'Hire & Collaborate',description: 'Select the best candidate and work together using our platform.' },
              { icon: Star,        step: '04', title: 'Deliver & Review',  description: 'Approve the completed work and leave a professional review.' },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative">
                  {i < 3 && (
                    <div className="hidden md:block absolute top-5 left-[calc(100%-1rem)] w-[calc(100%-1rem)] h-px bg-gradient-to-r from-border via-border to-transparent pointer-events-none" />
                  )}
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-primary/8 border border-primary/15 rounded-xl flex items-center justify-center shrink-0">
                        <Icon className="w-[18px] h-[18px] text-primary" />
                      </div>
                      <span
                        className="text-4xl font-display font-normal leading-none"
                        style={{ color: 'oklch(0.90 0.01 260)' }}
                      >
                        {step.step}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground mb-2 text-[13px] tracking-tight">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--hero-bg)' }}>
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.55 0.18 264 / 0.20), transparent 65%)', filter: 'blur(70px)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.78 0.14 85 / 0.12), transparent 65%)', filter: 'blur(60px)' }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRAIN_SVG, backgroundSize: '256px 256px', opacity: 0.038 }} />

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <p className="text-[10px] font-bold tracking-[0.16em] text-white/35 uppercase mb-5">Get Started Today</p>
          <h2
            className="text-4xl sm:text-5xl font-display font-normal text-white mb-4"
            style={{ letterSpacing: '-0.03em' }}
          >
            Ready to build something{' '}
            <em className="not-italic" style={{ color: 'var(--gold)' }}>great?</em>
          </h2>
          <p className="text-white/45 mb-10 max-w-md mx-auto text-sm leading-relaxed font-light">
            Join thousands of professionals already building their careers on GigFlow.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/auth/signup">
              <Button className="bg-white hover:bg-white/90 font-semibold h-11 px-8 shadow-xl shadow-black/20" style={{ color: 'oklch(0.13 0.025 264)' }}>
                Create Free Account
              </Button>
            </Link>
            <Link href="/jobs">
              <Button variant="outline" className="border-white/15 text-white hover:bg-white/8 bg-transparent font-semibold h-11 px-8">
                Browse Projects
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8" style={{ background: 'oklch(0.08 0.02 264)', borderTop: '1px solid oklch(1 0 0 / 0.05)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-10">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <span className="font-bold text-sm text-white">GigFlow</span>
              </div>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'oklch(1 0 0 / 0.30)' }}>
                A professional marketplace connecting skilled freelancers with businesses across India.
              </p>
            </div>
            {[
              {
                heading: 'For Clients',
                links: [{ label: 'Post a Project', href: '/jobs/post' }, { label: 'Find Professionals', href: '/freelancers' }],
              },
              {
                heading: 'For Professionals',
                links: [{ label: 'Browse Projects', href: '/jobs' }, { label: 'Create Account', href: '/auth/signup' }],
              },
              {
                heading: 'Company',
                links: [{ label: 'About Us', href: '#' }, { label: 'Contact', href: '#' }, { label: 'Privacy Policy', href: '#' }],
              },
            ].map((col) => (
              <div key={col.heading}>
                <h4 className="font-semibold mb-4 text-[10px] uppercase tracking-[0.14em]" style={{ color: 'oklch(1 0 0 / 0.40)' }}>
                  {col.heading}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-xs transition-colors" style={{ color: 'oklch(1 0 0 / 0.30)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(1 0 0 / 0.75)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(1 0 0 / 0.30)')}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6" style={{ borderTop: '1px solid oklch(1 0 0 / 0.06)' }}>
            <p className="text-xs" style={{ color: 'oklch(1 0 0 / 0.22)' }}>© 2026 GigFlow Technologies Pvt. Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              {['Terms of Service', 'Privacy Policy'].map((t) => (
                <Link key={t} href="#" className="text-xs transition-colors" style={{ color: 'oklch(1 0 0 / 0.22)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(1 0 0 / 0.55)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(1 0 0 / 0.22)')}>
                  {t}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
