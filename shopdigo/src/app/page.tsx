'use client';

import CatalogueEmptyState from '@/components/CatalogueEmptyState';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DeviceTabletIcon, ShoppingBagIcon, HomeIcon, BookOpenIcon, SparklesIcon, TrophyIcon, ArchiveBoxIcon, Squares2X2Icon,
  TruckIcon, ShieldCheckIcon, ArrowPathIcon, ChatBubbleLeftRightIcon, ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import ProductCard from '@/components/ProductCard';
import ProductImage from '@/components/ProductImage';
import { api } from '@/lib/client/api';
import { useUIStore } from '@/lib/store';
import { RECENT_VIEWS_KEY } from '@/lib/client/recent';
import { Loading } from '@/components/ui';

const CATEGORY_ICONS: Record<string, typeof HomeIcon> = {
  electronics: DeviceTabletIcon, fashion: ShoppingBagIcon, 'home-kitchen': HomeIcon, books: BookOpenIcon,
  beauty: SparklesIcon, sports: TrophyIcon, grocery: ArchiveBoxIcon,
};

function Section({ title, subtitle, href, children }: { title: string; subtitle?: string; href?: string; children: React.ReactNode }) {
  const id = `section-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section className="container-custom py-8" aria-labelledby={id}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id={id} className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        {href && <Link href={href} className="whitespace-nowrap text-sm font-semibold text-brand-700 hover:underline">View all</Link>}
      </div>
      {children}
    </section>
  );
}

function ProductRow({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {items.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [slide, setSlide] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);
  const [attempt, setAttempt] = useState(0);
  const markPageReady = useUIStore(s => s.markPageReady);

  // Reports to the startup splash once the catalogue has loaded or failed, so the splash never waits forever.
  useEffect(() => {
    let cancelled = false;
    setErr('');
    api('catalog.home')
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setErr('Please check your connection and try again.'); })
      .finally(() => { if (!cancelled) markPageReady(); });
    return () => { cancelled = true; };
  }, [attempt, markPageReady]);

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem(RECENT_VIEWS_KEY) || '[]');
      if (ids.length) api<any[]>('catalog.byIds', { ids }).then(list => {
        const order = new Map(ids.map((id, i) => [id, i]));
        setRecent([...list].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
      }).catch(() => setRecent([]));
    } catch { /* storage unavailable */ }
  }, []);

  const banners: any[] = data?.banners || [];
  useEffect(() => {
    if (banners.length < 2) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => setSlide(s => (s + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (err) return (
    <div className="container-custom py-16 text-center" role="alert">
      <h1 className="text-xl font-bold text-gray-900">We could not load the store</h1>
      <p className="mt-2 text-sm text-gray-600">{err}</p>
      <button type="button" onClick={() => setAttempt(a => a + 1)} className="btn-primary mt-6 px-6 py-3">Try again</button>
    </div>
  );
  if (!data) return <div className="container-custom py-10"><Loading label="Loading SHOPDIGO…" /></div>;
  const catalogueEmpty = (data.recommended || []).length === 0;

  const topCategories = (data.categories || []).filter((c: any) => !c.parent_id);
  const brands: any[] = data.brands || [];
  const trending: any[] = data.trending || [];
  const deals: any[] = data.offers || [];
  const popular: any[] = data.recommended || [];
  const newest: any[] = data.newest || [];
  const current = banners[slide];

  return (
    <div className="pb-6">
      {/* Hero */}
      {current && !catalogueEmpty && (
        <section className="container-custom pt-6" aria-roledescription="carousel" aria-label="Featured campaigns">
          <div className="relative overflow-hidden rounded-2xl bg-navy-900 text-white">
            <div className="grid min-h-[200px] items-center gap-6 p-7 sm:min-h-[240px] md:p-12">
              <div key={current.id} className="max-w-xl animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-200">SHOPDIGO</p>
                <h1 className="mt-2 text-3xl font-extrabold leading-tight md:text-4xl">{current.title}</h1>
                {current.subtitle && <p className="mt-3 max-w-md text-navy-100">{current.subtitle}</p>}
                <Link href={current.link_url || '/search'} className="mt-6 inline-flex rounded-lg bg-white px-6 py-2.5 font-semibold text-navy-900 hover:bg-navy-100">
                  Shop now
                </Link>
              </div>
            </div>
            {banners.length > 1 && (
              <div className="absolute bottom-4 right-5 flex items-center gap-2">
                <button type="button" aria-label="Previous campaign" onClick={() => setSlide(s => (s - 1 + banners.length) % banners.length)} className="rounded-full bg-white/15 p-1.5 hover:bg-white/25"><ChevronLeftIcon className="h-4 w-4" aria-hidden="true" /></button>
                {banners.map((b, i) => (
                  <button key={b.id} type="button" aria-label={`Show campaign ${i + 1}`} aria-current={i === slide} onClick={() => setSlide(i)}
                    className={`h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
                ))}
                <button type="button" aria-label="Next campaign" onClick={() => setSlide(s => (s + 1) % banners.length)} className="rounded-full bg-white/15 p-1.5 hover:bg-white/25"><ChevronRightIcon className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Categories */}
      {topCategories.length > 0 && (
        <section className="container-custom py-8" aria-labelledby="section-shop-by-category">
          <h2 id="section-shop-by-category" className="mb-4 text-xl font-bold text-gray-900">Shop by category</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-7">
            {topCategories.map((c: any) => {
              const Icon = CATEGORY_ICONS[c.slug] || Squares2X2Icon;
              return (
                <Link key={c.id} href={`/search?category=${c.slug}`} className="group flex flex-col items-center rounded-card border border-gray-200 bg-white p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 group-hover:bg-brand-100"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                  <span className="mt-2 text-sm font-medium text-gray-800 group-hover:text-brand-700">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {catalogueEmpty && (
        <div className="container-custom py-10">
          <CatalogueEmptyState count={data.product_count ?? 0} />
        </div>
      )}

      {(data.featured || []).length > 0 && (
        <Section title="Featured Products" href="/search?sort=popularity">
          <ProductRow items={data.featured.slice(0, 4)} />
        </Section>
      )}

      {recent.length > 0 && (
        <Section title="Recently viewed" subtitle="Products you looked at on this device" href="/search">
          <ProductRow items={recent.slice(0, 4)} />
        </Section>
      )}

      {trending.length > 0 && (
        <Section title="Trending now" href="/search?sort=popularity">
          <ProductRow items={trending.slice(0, 4)} />
        </Section>
      )}

      {deals.length > 0 && (
        <Section title="Best deals" subtitle="Listed below MRP by the seller" href="/search?sort=discount">
          <ProductRow items={deals.slice(0, 4)} />
        </Section>
      )}

      {brands.length > 0 && (
        <Section title="Featured brands" href="/search">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {brands.slice(0, 6).map((b: any) => (
              <Link key={b.id} href={`/search?brand=${b.id}`} className="flex items-center justify-between rounded-card border border-gray-200 bg-white px-4 py-3 shadow-card hover:border-brand-200">
                <span className="font-semibold text-gray-900">{b.name}</span>
                <span className="text-xs text-gray-500">{b.product_count}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {popular.length > 0 && (
        <Section title="Popular picks" subtitle="Available products from our sellers" href="/search">
          <ProductRow items={popular.slice(0, 4)} />
        </Section>
      )}

      {newest.length > 0 && (
        <Section title="Recently added" href="/search?sort=newest">
          <ProductRow items={newest.slice(0, 4)} />
        </Section>
      )}

      {/* Benefits: only services the platform actually offers */}
      <section className="container-custom py-8" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading" className="sr-only">Why shop with SHOPDIGO</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [TruckIcon, 'Delivery to your PIN code', 'Check delivery time for your PIN code on any product page before you buy.'],
            [ShieldCheckIcon, 'Secure online payments', 'Pay with Razorpay. Your order is confirmed only after the payment is verified on our server.'],
            [ArrowPathIcon, 'Returns on eligible items', 'Each product shows its return window. Raise a request from your orders page.'],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof TruckIcon;
            return (
              <div key={title as string} className="card flex gap-4 p-5">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><I className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h3 className="font-semibold text-gray-900">{title as string}</h3>
                  <p className="mt-1 text-sm text-gray-600">{text as string}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden="true" />
          Need help? <Link href="/help" className="font-semibold text-brand-700 hover:underline">Visit the help centre</Link> or <Link href="/account/support" className="font-semibold text-brand-700 hover:underline">raise a support ticket</Link>.
        </p>
      </section>
    </div>
  );
}
