'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, Gig, Category } from '@/lib/api';
import { MapPin, Briefcase, Clock, Star, Loader2, Search, SlidersHorizontal, ArrowUpRight } from 'lucide-react';

function formatBudget(gig: Gig) {
  const cur = gig.currency === 'INR' ? '₹' : '$';
  if (gig.budget_min && gig.budget_max) return `${cur}${gig.budget_min.toLocaleString()} – ${cur}${gig.budget_max.toLocaleString()}`;
  if (gig.budget_min) return `${cur}${gig.budget_min.toLocaleString()}+`;
  if (gig.budget_max) return `Up to ${cur}${gig.budget_max.toLocaleString()}`;
  return 'Negotiable';
}

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGigs = useCallback(async (p = 1, search = searchQuery, cat = selectedCategory) => {
    setIsLoading(true);
    try {
      const res = await api.gigs.list({
        page: String(p),
        limit: '10',
        ...(search ? { search } : {}),
        ...(cat ? { category: cat } : {}),
      });
      setGigs(res.gigs);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch {
      setGigs([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    api.gigs.categories().then(setCategories).catch(() => {});
    fetchGigs(1);
  }, []);

  const handleSearch = () => fetchGigs(1);
  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    fetchGigs(1, searchQuery, catId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Page header */}
      <div className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-2">Browse</p>
          <h1 className="text-4xl font-bold text-foreground mb-1.5">Find Your Next Project</h1>
          <p className="text-muted-foreground text-sm">
            {total > 0 ? (
              <span><strong className="text-foreground">{total}</strong> projects available right now</span>
            ) : (
              'Browse and bid on projects'
            )}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ─── Sidebar ──────────────────────────────────────────── */}
          <aside className="lg:col-span-1">
            <div className="bg-white border border-border rounded-xl p-5 sticky top-24 space-y-6">
              {/* Search */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground text-sm">Search</h3>
                </div>
                <Input
                  placeholder="Keyword or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="mb-2.5 h-9 text-sm"
                />
                <Button onClick={handleSearch} className="w-full h-9 text-sm font-semibold">Search</Button>
              </div>

              {/* Divider */}
              <div className="h-px bg-border" />

              {/* Categories */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground text-sm">Category</h3>
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleCategorySelect('')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      !selectedCategory
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted/60'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(String(cat.id))}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        selectedCategory === String(cat.id)
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-foreground hover:bg-muted/60'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ─── Job List ─────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
            ) : gigs.length > 0 ? (
              <div className="space-y-3">
                {gigs.map((gig) => (
                  <Link key={gig.id} href={`/jobs/${gig.id}`}>
                    <div className="group bg-white border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden mb-3">
                      {/* Left accent */}
                      <div className="absolute left-0 top-0 w-[3px] h-full bg-border group-hover:bg-primary transition-colors rounded-l-xl" />

                      <div className="pl-3">
                        {/* Top row: category + remote + budget */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(gig.category_name || gig.job_type) && (
                              <span className="text-[10px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-md uppercase tracking-[0.12em]">
                                {gig.category_name || gig.job_type}
                              </span>
                            )}
                            {gig.is_remote && (
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                Remote
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-primary leading-none">{formatBudget(gig)}</div>
                            <div className="text-xs text-muted-foreground mt-1">{gig.total_bids} proposals</div>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-[17px] font-bold text-foreground mb-1.5 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {gig.title}
                        </h3>

                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span className="font-medium text-foreground/70">{gig.creator_name}</span>
                          {gig.creator_rating ? (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {Number(gig.creator_rating).toFixed(1)}
                            </span>
                          ) : null}
                          {gig.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{gig.city}
                            </span>
                          )}
                          <span className="flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3" />
                            {new Date(gig.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{gig.description}</p>

                        {/* Skills + CTA */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-1.5">
                            {gig.skills_required?.slice(0, 4).map((skill) => (
                              <span key={skill} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-[11px] rounded-full font-medium border border-border/60">
                                {skill}
                              </span>
                            ))}
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => fetchGigs(page - 1)}
                      className="bg-transparent h-9 px-5"
                    >
                      ← Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page <strong className="text-foreground">{page}</strong> of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => fetchGigs(page + 1)}
                      className="bg-transparent h-9 px-5"
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-border rounded-xl py-24 text-center">
                <div className="w-14 h-14 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <p className="text-foreground font-semibold mb-1">No projects found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or category filter</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
