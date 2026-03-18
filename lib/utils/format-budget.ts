import type { Gig } from '@/lib/api';

export function formatBudget(gig: Gig): string {
  const curr = gig.currency || '₹';
  if (gig.budget_min && gig.budget_max)
    return `${curr}${Number(gig.budget_min).toLocaleString('en-IN')} – ${curr}${Number(gig.budget_max).toLocaleString('en-IN')}`;
  if (gig.budget_max)
    return `Up to ${curr}${Number(gig.budget_max).toLocaleString('en-IN')}`;
  if (gig.budget_min)
    return `From ${curr}${Number(gig.budget_min).toLocaleString('en-IN')}`;
  return 'Negotiable';
}
