import { StarIcon } from '@heroicons/react/20/solid';

export default function StarRating({ rating, size = 'sm', showValue = false, reviews, className = '' }: { rating: number; size?: 'sm' | 'md'; showValue?: boolean; reviews?: number; className?: string }) {
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const rounded = Math.round(rating * 2) / 2;
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <StarIcon key={i} className={`${sz} ${rounded >= i ? 'text-amber-400' : rounded >= i - 0.5 ? 'text-amber-300' : 'text-gray-300'}`} />
      ))}
      {showValue && <span className="ml-1 text-xs font-semibold text-gray-700">{rating.toFixed(1)}</span>}
      {typeof reviews === 'number' && <span className="ml-1 text-xs text-gray-500">({reviews.toLocaleString('en-IN')})</span>}
    </div>
  );
}
