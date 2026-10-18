'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ProductCard from '@/components/ProductCard';
import { api } from '@/lib/client/api';
import { Empty } from '@/components/ui';
import CatalogueEmptyState from '@/components/CatalogueEmptyState';

const SORTS = [
  { v: 'relevance', l: 'Relevance' }, { v: 'popularity', l: 'Popularity' }, { v: 'price_low', l: 'Price: low to high' },
  { v: 'price_high', l: 'Price: high to low' }, { v: 'rating', l: 'Customer rating' }, { v: 'newest', l: 'Newest' }, { v: 'discount', l: 'Biggest discount' },
];

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-card border border-gray-200 bg-white">
          <div className="skeleton aspect-[4/5] w-full rounded-none" />
          <div className="space-y-2 p-3.5"><div className="skeleton h-3 w-1/3" /><div className="skeleton h-4 w-5/6" /><div className="skeleton h-5 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}

function FilterPanel({
  data, category, brand, minRating, inStock, priceDraft, setPriceDraft, update, clearAll, onApplyPrice,
}: {
  data: any; category: string; brand: string; minRating: string; inStock: boolean;
  priceDraft: { min: string; max: string }; setPriceDraft: (d: { min: string; max: string }) => void;
  update: (patch: Record<string, string | null>) => void; clearAll: () => void; onApplyPrice: () => void;
}) {
  const topCats = (data?.categories || []).filter((c: any) => !c.parent_id);
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-900">Category</legend>
        <div className="space-y-0.5 text-sm">
          <button type="button" onClick={() => update({ category: null })} aria-pressed={!category} className={`block w-full rounded-md px-2 py-1.5 text-left ${!category ? 'bg-brand-50 font-semibold text-brand-800' : 'text-gray-700 hover:bg-gray-50'}`}>All categories</button>
          {topCats.map((c: any) => (
            <button key={c.id} type="button" onClick={() => update({ category: c.id })} aria-pressed={category === c.id || category === c.slug}
              className={`block w-full rounded-md px-2 py-1.5 text-left ${category === c.id || category === c.slug ? 'bg-brand-50 font-semibold text-brand-800' : 'text-gray-700 hover:bg-gray-50'}`}>{c.name}</button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="brand-filter" className="mb-2 block text-sm font-semibold text-gray-900">Brand</label>
        <select id="brand-filter" value={brand} onChange={e => update({ brand: e.target.value || null })} className="input-field text-sm">
          <option value="">All brands</option>
          {data?.brands?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-900">Price (₹)</legend>
        <div className="flex items-center gap-2">
          <input aria-label="Minimum price" type="number" min={0} inputMode="numeric" placeholder="Min" value={priceDraft.min} onChange={e => setPriceDraft({ ...priceDraft, min: e.target.value })} className="input-field px-2.5 py-2 text-sm" />
          <span className="text-gray-400" aria-hidden="true">–</span>
          <input aria-label="Maximum price" type="number" min={0} inputMode="numeric" placeholder="Max" value={priceDraft.max} onChange={e => setPriceDraft({ ...priceDraft, max: e.target.value })} className="input-field px-2.5 py-2 text-sm" />
        </div>
        <button type="button" onClick={onApplyPrice} className="mt-2 text-sm font-semibold text-brand-700 hover:underline">Apply price</button>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-900">Customer rating</legend>
        {[['4', '4 stars & up'], ['3', '3 stars & up']].map(([r, label]) => (
          <button key={r} type="button" onClick={() => update({ minRating: minRating === r ? null : r })} aria-pressed={minRating === r}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${minRating === r ? 'bg-brand-50 font-semibold text-brand-800' : 'text-gray-700 hover:bg-gray-50'}`}>{label}</button>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input type="checkbox" checked={inStock} onChange={e => update({ inStock: e.target.checked ? '1' : null })} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
        In-stock items only
      </label>
      <button type="button" onClick={clearAll} className="text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline">Clear all filters</button>
    </div>
  );
}

export default function SearchClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const q = sp.get('q') || '';
  const category = sp.get('category') || '';
  const brand = sp.get('brand') || '';
  const sort = sp.get('sort') || 'relevance';
  const minPrice = sp.get('minPrice') || '';
  const maxPrice = sp.get('maxPrice') || '';
  const minRating = sp.get('minRating') || '';
  const inStock = sp.get('inStock') === '1';
  const page = Number(sp.get('page') || '1');

  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { setPriceDraft({ min: minPrice, max: maxPrice }); }, [minPrice, maxPrice]);

  useEffect(() => {
    let cancelled = false;
    setData(null); setErr('');
    api('catalog.search', {
      q: q || undefined, category: category || undefined, brand: brand || undefined, sort,
      minPrice: minPrice ? Number(minPrice) : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minRating: minRating ? Number(minRating) : undefined, inStock: inStock || undefined, page,
    }).then(r => { if (!cancelled) setData(r); }).catch(e => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [q, category, brand, sort, minPrice, maxPrice, minRating, inStock, page]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [sheetOpen]);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') next.delete(k); else next.set(k, v); }
    if (!('page' in patch)) next.delete('page');
    router.push(`/search?${next.toString()}`);
  };
  const clearAll = () => { setSheetOpen(false); router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search'); };
  const applyPrice = () => {
    const min = priceDraft.min && Number(priceDraft.min) >= 0 ? priceDraft.min : null;
    const max = priceDraft.max && Number(priceDraft.max) >= 0 ? priceDraft.max : null;
    if (min && max && Number(min) > Number(max)) { setErr('Minimum price cannot be more than maximum price'); return; }
    update({ minPrice: min, maxPrice: max });
  };

  const categoryObj = useMemo(() => data?.categories?.find((c: any) => c.id === category || c.slug === category), [data, category]);
  const brandObj = useMemo(() => data?.brands?.find((b: any) => b.id === brand), [data, brand]);
  const titleText = q ? `Results for “${q}”` : categoryObj?.name || 'All products';

  const chips: { label: string; clear: () => void }[] = [];
  if (categoryObj) chips.push({ label: categoryObj.name, clear: () => update({ category: null }) });
  if (brandObj) chips.push({ label: brandObj.name, clear: () => update({ brand: null }) });
  if (minPrice || maxPrice) chips.push({ label: `₹${minPrice || '0'} – ${maxPrice ? `₹${maxPrice}` : 'any'}`, clear: () => update({ minPrice: null, maxPrice: null }) });
  if (minRating) chips.push({ label: `${minRating}★ & up`, clear: () => update({ minRating: null }) });
  if (inStock) chips.push({ label: 'In stock', clear: () => update({ inStock: null }) });
  const hasFilters = chips.length > 0;
  // True only when the whole marketplace has no published products. Filters are then hidden.
  const catalogueEmpty = !!data && data.catalogue_total === 0;

  const panel = (
    <FilterPanel data={data} category={category} brand={brand} minRating={minRating} inStock={inStock}
      priceDraft={priceDraft} setPriceDraft={setPriceDraft} update={update} clearAll={clearAll} onApplyPrice={applyPrice} />
  );

  return (
    <div className="container-custom py-6">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="hover:underline">Home</Link></li>
          <li aria-hidden="true">/</li>
          {categoryObj ? <li><Link href="/search" className="hover:underline">All products</Link></li> : null}
          {categoryObj ? <><li aria-hidden="true">/</li><li className="text-gray-700" aria-current="page">{categoryObj.name}</li></> : <li className="text-gray-700" aria-current="page">{q ? 'Search' : 'All products'}</li>}
        </ol>
      </nav>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{titleText}</h1>
          <p className="text-sm text-gray-600" aria-live="polite">{data ? `${data.total} ${data.total === 1 ? 'product' : 'products'}` : 'Searching…'}</p>
        </div>
        {!catalogueEmpty && <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSheetOpen(true)} className="btn-outline py-2 text-sm lg:hidden" aria-haspopup="dialog">
            <AdjustmentsHorizontalIcon className="h-5 w-5" aria-hidden="true" /> Filters{hasFilters ? ` (${chips.length})` : ''}
          </button>
          <label htmlFor="sort" className="hidden text-sm text-gray-600 sm:block">Sort by</label>
          <select id="sort" value={sort} onChange={e => update({ sort: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            {SORTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>}
      </div>

      {chips.length > 0 && !catalogueEmpty && (
        <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map(c => (
            <button key={c.label} type="button" onClick={c.clear} className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100">
              {c.label} <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">remove filter</span>
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-xs font-semibold text-gray-700 underline-offset-2 hover:underline">Clear all</button>
        </div>
      )}

      <div className={catalogueEmpty ? '' : 'grid gap-6 lg:grid-cols-[230px_1fr]'}>
        {!catalogueEmpty && <aside className="hidden h-fit rounded-card border border-gray-200 bg-white p-5 shadow-card lg:sticky lg:top-40 lg:block" aria-label="Filters">
          {panel}
        </aside>}

        <section aria-label="Products" className={catalogueEmpty ? 'w-full' : ''}>
          {err && <div role="alert" className="card border-red-200 bg-red-50 p-5 text-sm text-red-700">{err}</div>}
          {!data && !err && <GridSkeleton />}
          {catalogueEmpty && <CatalogueEmptyState count={0} />}
          {data && !catalogueEmpty && data.items.length === 0 && (data.total > 0 || hasFilters) && (
            <Empty title="No products match these filters">
              <span>Try a different keyword, a wider price range, or </span>
              <button type="button" onClick={clearAll} className="font-semibold text-brand-700 underline">clear all filters</button>.
            </Empty>
          )}
          {data && data.items.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {data.items.map((p: any, i: number) => <ProductCard key={p.id} product={p} priority={i < 2 && page === 1} />)}
              </div>
              {data.pages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
                  <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="btn-outline py-2 text-sm disabled:opacity-40">Previous</button>
                  <span className="text-sm text-gray-700">Page {page} of {data.pages}</span>
                  <button type="button" disabled={page >= data.pages} onClick={() => update({ page: String(page + 1) })} className="btn-outline py-2 text-sm disabled:opacity-40">Next</button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-float animate-slide-up">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold">Filters</h2>
              <button type="button" onClick={() => setSheetOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-100" aria-label="Close filters"><XMarkIcon className="h-6 w-6" aria-hidden="true" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{panel}</div>
            <div className="border-t px-5 py-4">
              <button type="button" onClick={() => setSheetOpen(false)} className="btn-primary w-full">Show {data ? data.total : ''} products</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
