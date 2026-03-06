'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/navbar';
import { api, Gig, Worker } from '@/lib/api';
import { Briefcase, Users, TrendingUp, ArrowRight, Star, BadgeCheck, MapPin, Search } from 'lucide-react';

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

      {/* Hero */}
      <section className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 border border-primary/15 rounded-md text-primary text-xs font-semibold mb-6 tracking-wide">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              INDIA&apos;S PROFESSIONAL FREELANCE PLATFORM
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-5">
              Connecting Talent<br />with Opportunity
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              GigFlow is the trusted marketplace where skilled professionals and businesses collaborate to deliver exceptional results.
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mb-12">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by skill, job title, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <Button type="submit" className="h-11 px-6 font-semibold shrink-0">Search</Button>
            </form>

            <div className="flex flex-wrap items-center gap-8">
              {[
                { stat: '1,000+', label: 'Active Projects' },
                { stat: '500+', label: 'Verified Professionals' },
                { stat: '₹10L+', label: 'Payments Processed' },
              ].map((item, i) => (
                <div key={i} className={i > 0 ? 'border-l border-border pl-8' : ''}>
                  <div className="text-2xl font-bold text-foreground">{item.stat}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category quick links */}
      <section className="border-b border-border bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap mr-1 font-medium shrink-0">Browse:</span>
            {['Web Development', 'Design & Creative', 'Digital Marketing', 'Writing & Content', 'Mobile Apps', 'Data & Analytics', 'Finance & Accounting'].map((cat) => (
              <Link key={cat} href={`/jobs?search=${encodeURIComponent(cat)}`}>
                <span className="inline-flex items-center whitespace-nowrap px-3 py-1.5 bg-white border border-border rounded text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                  {cat}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Projects */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-7">
            <div>
              <h2 className="text-xl font-bold text-foreground">Latest Opportunities</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Recently posted projects from verified clients</p>
            </div>
            <Link href="/jobs">
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent text-xs h-8">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <Card className="h-full hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer p-5 group flex flex-col">
                    {job.category_name && (
                      <span className="inline-block text-[10px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded mb-3 uppercase tracking-widest w-fit">
                        {job.category_name}
                      </span>
                    )}
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2 text-sm leading-snug group-hover:text-primary transition-colors flex-1">
                      {job.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{job.description}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {job.is_remote ? 'Remote' : [job.city, job.state].filter(Boolean).join(', ') || 'Location Flexible'}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="font-semibold text-primary text-sm">{formatBudget(job)}</span>
                      <span className="text-xs text-muted-foreground">{job.total_bids || 0} proposals</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border-dashed">
              <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No projects posted yet.</p>
              <Link href="/jobs/post"><Button size="sm">Post the First Project</Button></Link>
            </Card>
          )}
        </div>
      </section>

      {/* Top Professionals */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-7">
            <div>
              <h2 className="text-xl font-bold text-foreground">Top Professionals</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Highly rated freelancers ready to work with you</p>
            </div>
            <Link href="/freelancers">
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent text-xs h-8">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {topFreelancers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topFreelancers.map((freelancer) => (
                <Link key={freelancer.id} href={`/freelancers/${freelancer.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer p-5">
                    <div className="flex items-center gap-3 mb-4">
                      {freelancer.avatar_url ? (
                        <img src={freelancer.avatar_url} alt={freelancer.name} className="w-11 h-11 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base">
                          {freelancer.name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground text-sm truncate">{freelancer.name}</span>
                          {freelancer.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        {freelancer.hourly_rate ? (
                          <p className="text-sm font-semibold text-primary">₹{Number(freelancer.hourly_rate).toLocaleString('en-IN')}/hr</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Rate negotiable</p>
                        )}
                      </div>
                    </div>

                    {freelancer.rating && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < Math.floor(freelancer.rating!) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-foreground">{Number(freelancer.rating).toFixed(1)}</span>
                        {freelancer.total_reviews && <span className="text-xs text-muted-foreground">({freelancer.total_reviews} reviews)</span>}
                      </div>
                    )}

                    {freelancer.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {freelancer.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-medium border border-border/50">
                            {skill}
                          </span>
                        ))}
                        {freelancer.skills.length > 3 && (
                          <span className="text-[11px] text-muted-foreground">+{freelancer.skills.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border-dashed">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No professionals listed yet.</p>
              <Link href="/auth/signup"><Button size="sm">Join as a Professional</Button></Link>
            </Card>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-1">How GigFlow Works</h2>
            <p className="text-sm text-muted-foreground">A streamlined process from posting to project completion</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: Briefcase, step: '01', title: 'Post a Project', description: 'Describe your requirements, set a budget, and specify the skills needed.' },
              { icon: Users, step: '02', title: 'Review Proposals', description: 'Receive bids from qualified professionals and evaluate their experience.' },
              { icon: TrendingUp, step: '03', title: 'Hire & Collaborate', description: 'Select the best candidate and work together using our platform.' },
              { icon: Star, step: '04', title: 'Deliver & Review', description: 'Approve the completed work and leave a professional review.' },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col">
                  <div className="w-10 h-10 bg-primary/8 border border-primary/20 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="text-xs font-bold text-muted-foreground mb-1.5 tracking-widest">{step.step}</div>
                  <h3 className="font-semibold text-foreground mb-2 text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-primary rounded-lg p-10 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1.5">Ready to get started?</h2>
              <p className="text-white/70 text-sm">Join thousands of professionals already building their careers on GigFlow.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/auth/signup">
                <Button className="bg-white text-primary hover:bg-white/90 font-semibold h-9 px-5 text-sm">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/jobs">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent font-semibold h-9 px-5 text-sm">
                  Browse Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs">G</span>
                </div>
                <span className="font-bold text-sm text-foreground">GigFlow</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                A professional marketplace connecting skilled freelancers with businesses across India.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider">For Clients</h4>
              <ul className="space-y-2">
                <li><Link href="/jobs/post" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Post a Project</Link></li>
                <li><Link href="/freelancers" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Find Professionals</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider">For Professionals</h4>
              <ul className="space-y-2">
                <li><Link href="/jobs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Browse Projects</Link></li>
                <li><Link href="/auth/signup" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Create Account</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider">Company</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© 2026 GigFlow Technologies Pvt. Ltd. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
