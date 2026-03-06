'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { api, Gig, Bid } from '@/lib/api';
import { Star, MapPin, Users, Eye, Loader2, CheckCircle } from 'lucide-react';

export default function JobDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = Number(params.id);

  const [gig, setGig] = useState<Gig | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showBidForm, setShowBidForm] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.gigs.get(id)
      .then(setGig)
      .catch(() => setError('Job not found'))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!gig || !user) return;
    if (user.role === 'employer' && gig.creator_id === user.id) {
      api.bids.forGig(id).then(setBids).catch(() => {});
    }
  }, [gig, user, id]);

  const handleSubmitBid = async () => {
    setBidLoading(true);
    setBidError('');
    try {
      await api.bids.create({
        gigId: id,
        amount: Number(bidAmount),
        message: bidMessage,
        delivery_days: deliveryDays ? Number(deliveryDays) : undefined,
      });
      setBidSuccess(true);
      setShowBidForm(false);
      setBidAmount(''); setBidMessage(''); setDeliveryDays('');
      api.gigs.get(id).then(setGig).catch(() => {});
    } catch (err: unknown) {
      setBidError(err instanceof Error ? err.message : 'Failed to place bid');
    } finally {
      setBidLoading(false);
    }
  };

  const handleAcceptBid = async (bidId: number) => {
    try { await api.bids.accept(bidId); api.bids.forGig(id).then(setBids); } catch {}
  };
  const handleRejectBid = async (bidId: number) => {
    try { await api.bids.reject(bidId); api.bids.forGig(id).then(setBids); } catch {}
  };

  const formatBudget = (g: Gig) => {
    const curr = g.currency || '₹';
    if (g.budget_min && g.budget_max) return `${curr}${Number(g.budget_min).toLocaleString('en-IN')} – ${curr}${Number(g.budget_max).toLocaleString('en-IN')}`;
    if (g.budget_max) return `Up to ${curr}${Number(g.budget_max).toLocaleString('en-IN')}`;
    if (g.budget_min) return `From ${curr}${Number(g.budget_min).toLocaleString('en-IN')}`;
    return 'Negotiable';
  };

  const isOwner = user && gig && user.role === 'employer' && gig.creator_id === user.id;
  const canBid = user && user.role === 'worker' && gig?.status === 'open';

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );

  if (error || !gig) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground text-lg">{error || 'Job not found'}</p>
        <Link href="/jobs"><Button>Browse Jobs</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/jobs" className="text-primary hover:underline mb-6 inline-block text-sm">
          ← Back to Jobs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {gig.category_name && (
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-full font-medium">
                    {gig.category_name}
                  </span>
                )}
                <span className={`px-3 py-1 text-xs rounded-full font-medium capitalize ${
                  gig.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                }`}>{gig.status}</span>
                {gig.is_remote && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">Remote</span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-5">{gig.title}</h1>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Budget</div>
                  <div className="font-bold text-foreground text-sm">{formatBudget(gig)}</div>
                  {gig.budget_type && <div className="text-xs text-muted-foreground capitalize mt-0.5">{gig.budget_type}</div>}
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Type</div>
                  <div className="font-bold text-foreground text-sm capitalize">{gig.job_type?.replace(/_/g, ' ')}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Proposals</div>
                  <div className="font-bold text-foreground text-sm flex items-center gap-1">
                    <Users className="w-3 h-3" />{gig.total_bids || 0}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Views</div>
                  <div className="font-bold text-foreground text-sm flex items-center gap-1">
                    <Eye className="w-3 h-3" />{gig.views || 0}
                  </div>
                </Card>
              </div>
            </div>

            {/* Client */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">About the Client</h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {(gig.creator_name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-foreground">{gig.creator_name}</div>
                  {gig.creator_rating && (
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.floor(gig.creator_rating!) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">{Number(gig.creator_rating).toFixed(1)}</span>
                    </div>
                  )}
                  {(gig.city || gig.state) && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />{[gig.city, gig.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Job Description</h2>
              <div className="text-foreground whitespace-pre-wrap leading-relaxed">{gig.description}</div>
            </Card>

            {/* Skills */}
            {gig.skills_required && gig.skills_required.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Skills Required</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.skills_required.map((skill) => (
                    <span key={skill} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Proposals — employer/owner view */}
            {isOwner && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Proposals {bids.length > 0 && `(${bids.length})`}
                </h2>
                {bids.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No proposals yet.</p>
                ) : (
                  <div className="space-y-4">
                    {bids.map((bid) => (
                      <div key={bid.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-foreground">{bid.bidder_name}</div>
                            {bid.bidder_rating && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {Number(bid.bidder_rating).toFixed(1)}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-primary">₹{Number(bid.amount).toLocaleString('en-IN')}</div>
                            {bid.delivery_days && <div className="text-xs text-muted-foreground">{bid.delivery_days} days</div>}
                          </div>
                        </div>
                        <p className="text-sm text-foreground mb-3 leading-relaxed">{bid.message}</p>
                        {bid.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAcceptBid(bid.id)}>Accept</Button>
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleRejectBid(bid.id)}>Reject</Button>
                          </div>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                            bid.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                          }`}>{bid.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {bidSuccess && (
                <div className="p-4 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Proposal submitted!
                </div>
              )}

              {canBid && !bidSuccess && (
                <>
                  <Button onClick={() => setShowBidForm(!showBidForm)} className="w-full h-12 text-base font-semibold">
                    {showBidForm ? 'Cancel' : 'Place a Bid'}
                  </Button>
                  {showBidForm && (
                    <Card className="p-5 space-y-4">
                      <h3 className="font-bold text-foreground">Your Proposal</h3>
                      {bidError && <p className="text-destructive text-sm">{bidError}</p>}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Bid Amount (₹) *</label>
                        <Input type="number" placeholder="e.g. 5000" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Delivery Days</label>
                        <Input type="number" placeholder="e.g. 7" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Cover Letter *</label>
                        <Textarea
                          placeholder="Why are you the best fit for this project?"
                          value={bidMessage}
                          onChange={(e) => setBidMessage(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                      <Button onClick={handleSubmitBid} className="w-full" disabled={bidLoading || !bidAmount || !bidMessage}>
                        {bidLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : 'Submit Proposal'}
                      </Button>
                    </Card>
                  )}
                </>
              )}

              {!user && (
                <Card className="p-5 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Sign in as a freelancer to bid on this job.</p>
                  <Link href="/auth/login"><Button className="w-full">Log In to Bid</Button></Link>
                  <Link href="/auth/signup"><Button variant="outline" className="w-full bg-transparent">Create Account</Button></Link>
                </Card>
              )}

              {user && user.role === 'employer' && !isOwner && (
                <Card className="p-5 bg-muted">
                  <p className="text-sm text-muted-foreground text-center">Only freelancers can bid on jobs.</p>
                </Card>
              )}

              {isOwner && (
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full bg-transparent">Manage in Dashboard</Button>
                </Link>
              )}

              <Card className="p-5">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted</span>
                    <span className="text-foreground">{new Date(gig.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {gig.deadline && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deadline</span>
                      <span className="text-foreground">{new Date(gig.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-foreground">
                      {gig.is_remote ? 'Remote' : [gig.city, gig.state].filter(Boolean).join(', ') || 'Not specified'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
