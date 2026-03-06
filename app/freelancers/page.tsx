'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, Worker } from '@/lib/api';
import { Star, MapPin, Loader2, BadgeCheck } from 'lucide-react';

const RATE_FILTERS = [
  { label: 'All Rates', min: '', max: '' },
  { label: '₹0–500/hr', min: '0', max: '500' },
  { label: '₹500–1500/hr', min: '500', max: '1500' },
  { label: '₹1500–3000/hr', min: '1500', max: '3000' },
  { label: '₹3000+/hr', min: '3000', max: '' },
];

export default function FreelancersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [rateFilter, setRateFilter] = useState(RATE_FILTERS[0]);
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const fetchWorkers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
      if (search) params.search = search;
      if (skillFilter) params.skill = skillFilter;
      if (rateFilter.min) params.min_rate = rateFilter.min;
      if (rateFilter.max) params.max_rate = rateFilter.max;

      const res = await api.users.list(params);
      setWorkers(res.workers);
      setTotal(res.total);
    } catch {
      setWorkers([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, skillFilter, rateFilter, page]);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWorkers();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Find Top Talent</h1>
          <p className="text-muted-foreground">Browse and hire skilled freelancers for your projects</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-24 space-y-6">
              <form onSubmit={handleSearch}>
                <h3 className="font-semibold text-foreground mb-3">Search</h3>
                <Input
                  placeholder="Name or keyword..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-2"
                />
                <Input
                  placeholder="Skill (e.g. React)"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="mb-3"
                />
                <Button type="submit" className="w-full">Search</Button>
              </form>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Hourly Rate</h3>
                <div className="space-y-1">
                  {RATE_FILTERS.map((rate) => (
                    <button
                      key={rate.label}
                      onClick={() => { setRateFilter(rate); setPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        rateFilter.label === rate.label
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading...' : `${total} freelancer${total !== 1 ? 's' : ''} found`}
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : workers.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg mb-4">No freelancers found</p>
                <Button variant="outline" className="bg-transparent" onClick={() => { setSearch(''); setSkillFilter(''); setRateFilter(RATE_FILTERS[0]); setPage(1); }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-5">
                  {workers.map((worker) => (
                    <Link key={worker.id} href={`/freelancers/${worker.id}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="p-6">
                          <div className="flex items-start gap-5 mb-4">
                            {worker.avatar_url ? (
                              <img src={worker.avatar_url} alt={worker.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                                {worker.name[0].toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xl font-bold text-foreground">{worker.name}</h3>
                                {worker.is_verified && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
                              </div>
                              {Number(worker.rating) > 0 ? (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(Number(worker.rating)) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                                  ))}
                                  <span className="text-sm font-medium text-foreground">{Number(worker.rating).toFixed(1)}</span>
                                  {Number(worker.total_reviews) > 0 && <span className="text-xs text-muted-foreground">({worker.total_reviews} reviews)</span>}
                                  {Number(worker.total_jobs_completed) > 0 && (
                                    <><span className="text-muted-foreground">·</span><span className="text-xs text-muted-foreground">{worker.total_jobs_completed} jobs</span></>
                                  )}
                                </div>
                              ) : null}
                              {(worker.city || worker.state) && (
                                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {[worker.city, worker.state].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {worker.hourly_rate ? (
                                <>
                                  <div className="text-xl font-bold text-primary">₹{Number(worker.hourly_rate).toLocaleString('en-IN')}</div>
                                  <div className="text-xs text-muted-foreground">/hour</div>
                                </>
                              ) : (
                                <div className="text-sm text-muted-foreground">Negotiable</div>
                              )}
                            </div>
                          </div>

                          {worker.bio && (
                            <p className="text-foreground text-sm mb-4 line-clamp-2 leading-relaxed">{worker.bio}</p>
                          )}

                          {worker.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {worker.skills.slice(0, 6).map((skill) => (
                                <span key={skill} className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full font-medium">
                                  {skill}
                                </span>
                              ))}
                              {worker.skills.length > 6 && (
                                <span className="text-xs text-muted-foreground px-1 py-1">+{worker.skills.length - 6} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button variant="outline" className="bg-transparent" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">Page {page} of {totalPages}</span>
                    <Button variant="outline" className="bg-transparent" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
