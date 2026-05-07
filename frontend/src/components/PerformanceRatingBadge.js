import React from 'react';
import { RATING_CONFIG } from '../utils/ratingConstants';

/**
 * Badge displaying a 1-4 performance rating.
 * @param {number|string} rating - 1 | 2 | 3 | 4
 * @param {boolean} showFull    - include the full label text (default false)
 */
export default function PerformanceRatingBadge({ rating, showFull = false }) {
  const n = Number(rating);
  const config = RATING_CONFIG[n];

  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
        Not rated
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bgClass} ${config.textClass} border ${config.borderClass}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${config.color === 'red' ? 'bg-red-500' : config.color === 'orange' ? 'bg-orange-500' : config.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'}`} />
      {n} — {config.shortLabel}{showFull ? ` — ${config.fullLabel}` : ''}
    </span>
  );
}
