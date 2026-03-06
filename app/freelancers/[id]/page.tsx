'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { api, Worker, Review } from '@/lib/api';
import { Star, MapPin, Loader2, BadgeCheck, Briefcase, Calendar } from 'lucide-react';

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`${sz} ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
      ))}
    </div>
  );
}

export default function FreelancerProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [worker, setWorker] = useState<Worker | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.users.get(id)
      .then((w) => {
        setWorker(w);
        api.reviews.forUser(id).then(setReviews).catch(() => {});
      })
      .catch(() => setError('Freelancer not found'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );

  if (error || !worker) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground text-lg">{error || 'Freelancer not found'}</p>
        <Link href="/freelancers"><Button>Browse Freelancers</Button></Link>
      </div>
    </div>
  );

  const memberSince = worker.created_at
    ? new Date(worker.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/freelancers" className="text-primary hover:underline mb-6 inline-block text-sm">
          ← Back to Freelancers
        </Link>

        <Card className="p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {worker.avatar_url ? (
              <img src={worker.avatar_url} alt={worker.name} className="w-28 h-28 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-28 h-28 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-4xl shrink-0">
                {worker.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-3xl font-bold text-foreground">{worker.name}</h1>
                {worker.is_verified && (
                  <span className="flex items-center gap-1 text-primary text-sm font-medium">
                    <BadgeCheck className="w-5 h-5" /> Verified
                  </span>
                )}
              </div>
              {(worker.city || worker.state) && (
                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                  <MapPin className="w-4 h-4" />{[worker.city, worker.state].filter(Boolean).join(', ')}
                </div>
              )}
              {Number(worker.rating) > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <StarRow rating={Number(worker.rating)} size="md" />
                  <span className="font-bold text-foreground">{Number(worker.rating).toFixed(1)}</span>
                  {Number(worker.total_reviews) > 0 && <span className="text-muted-foreground text-sm">({worker.total_reviews} reviews)</span>}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {worker.hourly_rate && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Hourly Rate</div>
                    <div className="text-xl font-bold text-primary">₹{Number(worker.hourly_rate).toLocaleString('en-IN')}</div>
                  </div>
                )}
                {worker.total_jobs_completed != null && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Jobs Done</div>
                    <div className="text-xl font-bold text-foreground">{worker.total_jobs_completed}</div>
                  </div>
                )}
                {worker.total_reviews != null && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Reviews</div>
                    <div className="text-xl font-bold text-foreground">{worker.total_reviews}</div>
                  </div>
                )}
                {memberSince && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Member Since</div>
                    <div className="text-sm font-bold text-foreground">{memberSince}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {worker.bio && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">About</h2>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{worker.bio}</p>
              </Card>
            )}

            {worker.skills.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((skill) => (
                    <span key={skill} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Client Reviews {reviews.length > 0 && `(${reviews.length})`}
              </h2>
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-sm">No reviews yet.</p>
              ) : (
                <div className="space-y-5">
                  {reviews.map((review) => (
                    <div key={review.id} className="pb-5 border-b border-border last:border-0 last:pb-0">
                      <div className="flex items-start gap-3 mb-2">
                        {review.reviewer_avatar ? (
                          <img src={review.reviewer_avatar} alt={review.reviewer_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {review.reviewer_name[0]}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <div className="font-semibold text-foreground text-sm">{review.reviewer_name}</div>
                              {review.gig_title && (
                                <div className="text-xs text-muted-foreground">
                                  {review.gig_id
                                    ? <Link href={`/jobs/${review.gig_id}`} className="hover:text-primary">{review.gig_title}</Link>
                                    : review.gig_title}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <StarRow rating={review.rating} />
                              <span className="text-sm font-medium text-foreground">{review.rating}/5</span>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-foreground text-sm leading-relaxed italic mt-2">"{review.comment}"</p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {!user && (
                <Card className="p-5 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Sign in to contact this freelancer.</p>
                  <Link href="/auth/login"><Button className="w-full">Log In to Hire</Button></Link>
                </Card>
              )}
              {user && user.role === 'employer' && (
                <Link href="/jobs/post">
                  <Button className="w-full h-12 font-semibold">
                    <Briefcase className="w-4 h-4 mr-2" />Post a Job
                  </Button>
                </Link>
              )}
              {worker.is_verified && (
                <Card className="p-5 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                  <div className="flex items-center gap-2 mb-1">
                    <BadgeCheck className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-900 dark:text-green-400 text-sm">Verified Freelancer</span>
                  </div>
                  <p className="text-xs text-green-800 dark:text-green-500">Identity and credentials verified.</p>
                </Card>
              )}
              <Card className="p-5">
                <h3 className="font-semibold text-foreground mb-3 text-sm">Quick Stats</h3>
                <div className="space-y-3 text-sm">
                  {Number(worker.rating) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{Number(worker.rating).toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                  {worker.total_jobs_completed != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jobs Done</span>
                      <span className="font-semibold">{worker.total_jobs_completed}</span>
                    </div>
                  )}
                  {worker.hourly_rate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="font-semibold text-primary">₹{Number(worker.hourly_rate).toLocaleString('en-IN')}/hr</span>
                    </div>
                  )}
                  {memberSince && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Since</span>
                      <span className="font-semibold">{memberSince}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
