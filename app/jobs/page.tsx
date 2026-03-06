'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, Gig, Category } from '@/lib/api';
import { MapPin, DollarSign, Briefcase, Clock, Star, Loader2 } from 'lucide-react';

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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Find Your Next Job</h1>
          <p className="text-muted-foreground">{total > 0 ? `${total} jobs available` : 'Browse and bid on projects'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-24 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-3">Search</h3>
                <Input
                  placeholder="Job title or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="mb-3"
                />
                <Button onClick={handleSearch} className="w-full">Search</Button>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Category</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => handleCategorySelect('')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(String(cat.id))}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${selectedCategory === String(cat.id) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Jobs List */}
          <div className="lg:col-span-3 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : gigs.length > 0 ? (
              <>
                {gigs.map((gig) => (
                  <Link key={gig.id} href={`/jobs/${gig.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer mb-4">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider">{gig.category_name || gig.job_type}</span>
                              {gig.is_remote && <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">Remote</span>}
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-1">{gig.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{gig.creator_name}</span>
                              {gig.creator_rating ? (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  {Number(gig.creator_rating).toFixed(1)}
                                </span>
                              ) : null}
                              {gig.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{gig.city}</span>}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xl font-bold text-primary">{formatBudget(gig)}</div>
                            <div className="text-sm text-muted-foreground">{gig.total_bids} bids</div>
                          </div>
                        </div>

                        <p className="text-foreground mb-4 line-clamp-2 text-sm">{gig.description}</p>

                        <div className="flex flex-wrap gap-2 items-center">
                          {gig.skills_required?.slice(0, 3).map((skill) => (
                            <span key={skill} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full font-medium">{skill}</span>
                          ))}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(gig.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchGigs(page - 1)} className="bg-transparent">Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchGigs(page + 1)} className="bg-transparent">Next</Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg font-medium">No jobs found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
