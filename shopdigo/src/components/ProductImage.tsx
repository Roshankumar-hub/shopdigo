'use client';

import { useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

/**
 * Product photo with a fixed 4:5 frame (the parent keeps the aspect ratio, so cards never shift
 * while images load). When a product has no photo, or the file fails to load, a clearly labelled
 * light placeholder is shown instead of a fake product picture.
 */
export default function ProductImage({
  src, alt, fit = 'contain', priority = false, className = '', label = 'Image unavailable.',
}: {
  src?: string | null; alt: string; fit?: 'contain' | 'cover'; priority?: boolean; className?: string; label?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div role="img" aria-label={`${label}: ${alt}`} className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-100 text-gray-400 ${className}`}>
        <PhotoIcon className="h-8 w-8" aria-hidden="true" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- uploaded and external product photos; sizes are controlled by the frame.
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setFailed(true)}
      className={`h-full w-full bg-white ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`}
    />
  );
}
