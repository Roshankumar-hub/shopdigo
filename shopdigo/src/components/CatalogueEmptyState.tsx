import Link from 'next/link';

/**
 * Shown when the marketplace has no published products. It is decorative only: no product photo,
 * price, rating, seller name or delivery estimate is invented here.
 */
export default function CatalogueEmptyState({ count = 0 }: { count?: number }) {
  return (
    <section aria-labelledby="catalogue-empty-title" className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-amber-50 px-6 py-12 text-center shadow-card sm:px-12 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-100/60 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-amber-100/70 blur-3xl" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-200" aria-live="polite">
          {count} {count === 1 ? 'product' : 'products'}
        </span>

        <svg viewBox="0 0 240 200" className="mt-6 h-40 w-auto text-brand-600" aria-hidden="true" focusable="false">
          <ellipse cx="120" cy="180" rx="78" ry="9" fill="#e2e8f0" />
          <path d="M70 66 H170 L184 176 H56 Z" fill="#ffffff" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <path d="M96 66 V48 a24 24 0 0 1 48 0 V66" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="120" cy="112" r="5" fill="currentColor" opacity="0.35" />
          <path d="M76 90 H164" stroke="#c7d2fe" strokeWidth="2" strokeDasharray="4 6" />
          <path d="M196 26 l4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4 z" fill="#f59e0b" />
          <path d="M30 96 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#818cf8" />
          <circle cx="206" cy="128" r="4" fill="#fcd34d" />
          <circle cx="36" cy="150" r="3" fill="#a5b4fc" />
        </svg>

        <h2 id="catalogue-empty-title" className="mt-6 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Your next favourite find is coming soon.
        </h2>
        <p className="mt-3 max-w-md text-gray-600">
          We&apos;re bringing sellers to SHOPDIGO. Check back soon for exciting products and great deals.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/seller/register" className="btn-primary px-6 py-3 text-center">Become a Seller</Link>
          <Link href="/" className="btn-outline px-6 py-3 text-center">Continue Exploring</Link>
        </div>
      </div>
    </section>
  );
}
