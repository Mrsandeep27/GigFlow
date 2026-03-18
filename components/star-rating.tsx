import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
  reviewCount?: number;
}

export function StarRating({ rating, size = 'sm', showValue, reviewCount }: StarRatingProps) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  const numRating = Number(rating);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${sz} ${i < Math.floor(numRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/25'}`}
          />
        ))}
      </div>
      {showValue && <span className="text-xs font-bold text-foreground">{numRating.toFixed(1)}</span>}
      {reviewCount != null && reviewCount > 0 && (
        <span className="text-xs text-muted-foreground">({reviewCount})</span>
      )}
    </div>
  );
}
