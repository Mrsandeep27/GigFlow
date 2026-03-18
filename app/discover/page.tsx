'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { api, Worker } from '@/lib/api';
import { StarRating } from '@/components/star-rating';
import { Search, MapPin, BadgeCheck, Github, Linkedin, Globe, Loader2, Users, SlidersHorizontal } from 'lucide-react';

export default function DiscoverPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Worker[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');

  const fetch = useCallback(async (p = 1, s = search, sk = skill) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), limit: '12' };
      if (s) params.search = s;
      if (sk) params.skill = sk;
      const res = await api.candidates.discover(params);
      setCandidates(res.candidates);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [search, skill]);

  useEffect(() => { fetch(1); }, []);

  const handleSearch = () => fetch(1);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-2">Reverse Marketplace</p>
          <h1 className="text-4xl font-bold text-foreground mb-1.5">Discover Talent</h1>
          <p className="text-muted-foreground text-sm">
            Browse {total > 0 ? <strong className="text-foreground">{total}</strong> : 'professionals'} who are open to new opportunities
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search bar */}
        <div className="bg-white border border-border rounded-xl p-4 mb-8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, headline, or bio..." value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-10 h-10" />
          </div>
          <div className="relative sm:w-48">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Filter by skill..." value={skill} onChange={e => setSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-10 h-10" />
          </div>
          <Button onClick={handleSearch} className="h-10 px-6 shrink-0">Search</Button>
        </div>

        {/* Worker as discoverable CTA */}
        {user?.role === 'worker' && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground text-sm">Make yourself discoverable to recruiters</p>
              <p className="text-xs text-muted-foreground mt-0.5">Let employers find you and send direct offers</p>
            </div>
            <Link href="/profile?tab=discover">
              <Button size="sm" className="shrink-0">Set Up Profile</Button>
            </Link>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : candidates.length === 0 ? (
          <div className="bg-white border border-dashed border-border rounded-xl py-20 text-center">
            <div className="w-14 h-14 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground mb-1">No candidates found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {candidates.map(c => (
                <Link key={c.id} href={`/freelancers/${c.id}`}>
                  <div className="bg-white border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer h-full">
                    {/* Avatar + name */}
                    <div className="flex items-start gap-4 mb-4">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt={c.name} loading="lazy" className="w-14 h-14 rounded-full object-cover border-2 border-border shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shrink-0">
                          {c.name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-foreground text-sm truncate">{c.name}</span>
                          {c.is_verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                        {c.profile_headline && (
                          <p className="text-xs text-primary font-medium line-clamp-1">{c.profile_headline}</p>
                        )}
                        {c.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{c.city}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Salary */}
                    {(c.desired_salary_min || c.desired_salary_max) && (
                      <div className="text-sm font-bold text-primary mb-3">
                        ₹{c.desired_salary_min?.toLocaleString('en-IN')}
                        {c.desired_salary_max && ` – ₹${c.desired_salary_max.toLocaleString('en-IN')}`}
                        <span className="text-xs font-normal text-muted-foreground"> / year</span>
                      </div>
                    )}

                    {/* Rating */}
                    {c.rating && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <StarRating rating={c.rating} showValue />
                        {c.years_experience && <span className="text-xs text-muted-foreground">· {c.years_experience}yr exp</span>}
                      </div>
                    )}

                    {/* Skills */}
                    {c.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {c.skills.slice(0, 4).map(s => (
                          <span key={s} className="text-[11px] bg-secondary border border-border/60 px-2.5 py-0.5 rounded-full font-medium">{s}</span>
                        ))}
                        {c.skills.length > 4 && <span className="text-[11px] text-muted-foreground self-center">+{c.skills.length - 4}</span>}
                      </div>
                    )}

                    {/* Links */}
                    <div className="flex items-center gap-3 pt-3 border-t border-border/60">
                      {c.github_url && <Github className="w-4 h-4 text-muted-foreground hover:text-foreground" />}
                      {c.linkedin_url && <Linkedin className="w-4 h-4 text-muted-foreground hover:text-blue-600" />}
                      {c.total_jobs_completed && (
                        <span className="text-xs text-muted-foreground ml-auto">{c.total_jobs_completed} jobs done</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-3 mt-8">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetch(page - 1)} className="bg-transparent h-9 px-5">← Prev</Button>
                <span className="text-sm text-muted-foreground self-center">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetch(page + 1)} className="bg-transparent h-9 px-5">Next →</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
