'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useUIStore } from '@/lib/store';

/** After this long, the splash is lifted even if something is still loading, and a notice explains why. */
const SLOW_MS = 12000;

/**
 * Decides when the startup splash (rendered in the HTML by SplashScreen) is lifted.
 * Ready = session check finished, cart/wishlist counts resolved, and (on the homepage only)
 * the homepage catalogue resolved or failed. The page is never hidden by a failure: the splash
 * lifts and a notice with a retry action appears instead.
 */
export default function AppBoot() {
  const pathname = usePathname();
  const { loading, authError, refreshUser } = useAuth();
  const countsStatus = useUIStore(s => s.countsStatus);
  const pageReady = useUIStore(s => s.pageReady);
  const refreshCounts = useUIStore(s => s.refreshCounts);
  const [timedOut, setTimedOut] = useState(false);
  const [done, setDone] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const needsHomepage = pathname === '/';
  const coreReady = !loading && (countsStatus === 'ready' || countsStatus === 'error');
  const ready = coreReady && (!needsHomepage || pageReady);

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), SLOW_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (done) return;
    if (ready || timedOut) {
      document.documentElement.dataset.boot = 'done';
      setDone(true);
    }
  }, [ready, timedOut, done]);

  if (!done) return null;

  const serviceIssue = authError || countsStatus === 'error';
  const slow = timedOut && !ready;
  if (!serviceIssue && !slow) return null;

  const retry = async () => {
    if (slow) { window.location.reload(); return; }
    setRetrying(true);
    try {
      const u = await refreshUser();
      await refreshCounts(!!u);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-[120] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-float sm:inset-x-auto sm:right-6 sm:bottom-6">
      <p className="flex-1">
        {slow
          ? 'This is taking longer than usual. Check your connection, then try again.'
          : 'We could not load your account details. Some features may be unavailable until you try again.'}
      </p>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  );
}
