'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import ProductImage from '@/components/ProductImage';
import StarRating from '@/components/StarRating';
import { api } from '@/lib/client/api';
import { useAuth } from '@/lib/auth';
import { useUIStore } from '@/lib/store';
import { Loading, Empty } from '@/components/ui';
import { formatPrice, discountPercent, formatDate } from '@/lib/utils';
import { HeartIcon } from '@heroicons/react/24/outline';
import { RECENT_VIEWS_KEY } from '@/lib/client/recent';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const refreshCounts = useUIStore(s => s.refreshCounts);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<string>('');
  const [pin, setPin] = useState('');
  const [delivery, setDelivery] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState({ rating: 5, title: '', body: '' });
  const [question, setQuestion] = useState('');
  const [compareList, setCompareList] = useState<string[]>([]);
  const wishlisted = useUIStore(s => (data?.product ? s.wishlistIds.includes(data.product.id) : false));

  const load = () => api('catalog.product', { slug }).then(d => { setData(d); setActive(0); }).catch(e => setErr(e.message));
  useEffect(() => { setData(null); setErr(''); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug]);
  useEffect(() => { try { setCompareList(JSON.parse(localStorage.getItem('shopdigo_compare') || '[]')); } catch { /* ignore */ } }, []);
  useEffect(() => {
    if (!data?.product) return;
    try {
      const prev: string[] = JSON.parse(localStorage.getItem(RECENT_VIEWS_KEY) || '[]');
      const next = [data.product.id, ...prev.filter(id => id !== data.product.id)].slice(0, 12);
      localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(next));
    } catch { /* storage unavailable: skip */ }
  }, [data]);

  const toggleCompare = () => {
    const list = compareList.includes(slug) ? compareList.filter(s => s !== slug) : [...compareList, slug].slice(-4);
    localStorage.setItem('shopdigo_compare', JSON.stringify(list));
    setCompareList(list);
    toast.success(list.includes(slug) ? 'Added to compare (max 4)' : 'Removed from compare');
  };

  if (err) return <div className="container-custom py-10"><Empty title="Product not found">{err}</Empty></div>;
  if (!data) return <div className="container-custom py-10"><Loading label="Loading product…" /></div>;
  const p = data.product;
  const images: string[] = (p.images || []).map((i: any) => i.url);
  const discount = discountPercent(p.mrp, p.price);
  const sizes = (p.variants || []).filter((v: any) => v.type === 'size');
  const selectedVariant = sizes.find((v: any) => v.id === variant);
  const maxQty = Math.max(0, Math.min(10, selectedVariant ? selectedVariant.stock : p.stock));
  const outOfStock = maxQty <= 0;

  const requireLogin = () => { toast('Please log in to continue'); router.push(`/login?next=${encodeURIComponent(`/product/${slug}`)}`); };

  const addToCart = async () => {
    if (!user) return requireLogin();
    if (sizes.length && !variant) return toast.error('Please select a size');
    setBusy(true);
    try {
      await api('cart.add', { productId: p.id, quantity: qty, variantId: variant || undefined });
      await refreshCounts(true);
      toast.success('Added to cart');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const buyNow = async () => {
    if (!user) return requireLogin();
    if (sizes.length && !variant) return toast.error('Please select a size');
    setBusy(true);
    try {
      await api('cart.add', { productId: p.id, quantity: qty, variantId: variant || undefined });
      await refreshCounts(true);
      router.push('/checkout');
    } catch (e: any) { toast.error(e.message); setBusy(false); }
  };

  const toggleWish = async () => {
    if (!user) return requireLogin();
    try {
      const r = await api<{ wishlisted: boolean }>('wishlist.toggle', { productId: p.id });
      toast.success(r.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist');
      await refreshCounts(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const checkPin = async () => {
    if (!/^[1-9][0-9]{5}$/.test(pin)) return toast.error('Enter a valid 6-digit PIN code');
    try { setDelivery(await api('catalog.delivery', { pincode: pin })); } catch (e: any) { toast.error(e.message); }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return requireLogin();
    try {
      await api('review.add', { productId: p.id, ...review });
      toast.success('Thanks for your review!');
      setReview({ rating: 5, title: '', body: '' });
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return requireLogin();
    try {
      await api('question.add', { productId: p.id, question });
      toast.success('Question posted');
      setQuestion('');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="container-custom py-6">
      <nav className="mb-4 text-xs text-gray-600" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="hover:underline">Home</Link></li><li aria-hidden="true">/</li>
          <li><Link href={`/search?category=${p.category_id}`} className="hover:underline">{p.category_name}</Link></li><li aria-hidden="true">/</li>
          <li className="line-clamp-1 max-w-[16rem] text-gray-800" aria-current="page">{p.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="grid gap-4 md:grid-cols-[72px_1fr]">
          <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col" role="group" aria-label="Product photos">
            {images.length === 0 && <div className="text-xs text-gray-500">No photos have been added by the seller.</div>}
            {images.map((src, i) => (
              <button key={src} type="button" onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === active}
                className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 ${i === active ? 'border-brand-600' : 'border-gray-200 hover:border-gray-300'}`}>
                <ProductImage src={src} alt="" />
              </button>
            ))}
          </div>
          <div className="order-1 relative aspect-[4/5] overflow-hidden rounded-card border border-gray-200 bg-white p-4 md:order-2">
            <ProductImage src={images[active]} alt={`${p.name}${images.length > 1 ? `, photo ${active + 1} of ${images.length}` : ''}`} priority className="transition-transform duration-200" />
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-brand-700">{p.brand_name}</div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{p.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            {p.review_count > 0
              ? <><StarRating rating={p.rating} size="md" showValue /><span>{p.review_count} {p.review_count === 1 ? 'rating' : 'ratings'} · {data.reviews.length} written reviews</span></>
              : <span>No ratings yet</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold text-gray-900">{formatPrice(p.price)}</span>
            {discount > 0 && <>
              <span className="text-lg text-gray-500 line-through">{formatPrice(p.mrp)}</span>
              <span className="text-lg font-semibold text-green-700">{discount}% off</span>
            </>}
          </div>
          <p className="text-xs text-gray-600">Price includes GST where the seller has applied it. Delivery charges are shown at checkout.</p>

          {sizes.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold">Size</div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                {sizes.map((v: any) => (
                  <button key={v.id} type="button" role="radio" aria-checked={variant === v.id} disabled={v.stock <= 0} onClick={() => { setVariant(v.id); setQty(1); }}
                    className={`min-w-[52px] rounded-lg border px-3 py-2 text-sm font-medium ${variant === v.id ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-300 hover:border-gray-400'} disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through`}>
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="text-sm" aria-live="polite">
              {outOfStock
                ? <span className="font-semibold text-red-700">Out of stock</span>
                : <span className="font-semibold text-green-700">In stock{p.stock <= 5 ? ` · only ${p.stock} left` : ''}</span>}
            </div>
            {!outOfStock && (
              <label className="flex items-center gap-2 text-sm">Quantity
                <select value={qty} onChange={e => setQty(Number(e.target.value))} className="rounded-lg border border-gray-300 px-2 py-1.5">
                  {Array.from({ length: maxQty }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" onClick={addToCart} disabled={busy || outOfStock} className="btn-outline py-3">Add to Cart</button>
            <button type="button" onClick={buyNow} disabled={busy || outOfStock} className="btn-secondary py-3">Buy now</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <button type="button" onClick={toggleWish} aria-pressed={wishlisted} className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
              {wishlisted ? <HeartSolid className="h-4 w-4 text-red-500" aria-hidden="true" /> : <HeartIcon className="h-4 w-4" aria-hidden="true" />}
              {wishlisted ? 'Saved to wishlist' : 'Add to wishlist'}
            </button>
            <button type="button" onClick={toggleCompare} className="font-medium text-brand-700 hover:underline">{compareList.includes(slug) ? '✓ In compare' : '+ Compare'}</button>
            {compareList.length > 0 && <Link href="/compare" className="font-medium text-brand-700 hover:underline">Compare ({compareList.length})</Link>}
          </div>

          <div className="card mt-6 space-y-3 p-4 text-sm">
            <div className="font-semibold">Delivery</div>
            <p className="text-gray-700">Ships within {p.delivery_days} day{p.delivery_days > 1 ? 's' : ''} from {p.seller_name || 'the seller'}. Check your PIN code for delivery options.</p>
            <div className="flex gap-2">
              <label htmlFor="pin" className="sr-only">Delivery PIN code</label>
              <input id="pin" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter PIN code" className="input-field max-w-[180px]" />
              <button type="button" onClick={checkPin} className="btn-outline py-2">Check</button>
            </div>
            {delivery && (delivery.serviceable
              ? <p className="text-green-700">Delivers to {delivery.city}, {delivery.state}. Courier time {delivery.delivery_days} day{delivery.delivery_days > 1 ? 's' : ''} after dispatch. {delivery.cod_available && p.cod_available ? 'Cash on Delivery available.' : 'Online payment only.'}</p>
              : <p className="text-red-700">{delivery.message || 'Sorry, we do not deliver to this PIN code yet.'}</p>)}
            <p className="text-gray-700">Sold by <span className="font-medium">{p.seller_name}</span> · {p.return_window_days}-day return window</p>
          </div>
        </div>
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <h2 className="mb-2 text-lg font-bold">Description</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{p.description}</p>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Specifications</h2>
            {Object.keys(p.specifications || {}).length === 0
              ? <p className="text-sm text-gray-600">The seller has not added specifications yet.</p>
              : <table className="w-full text-sm">
                <tbody>
                  {Object.entries(p.specifications || {}).map(([k, v]) => (
                    <tr key={k} className="border-b last:border-0"><th scope="row" className="w-1/3 py-2 pr-4 text-left font-medium text-gray-600">{k}</th><td className="py-2 text-gray-900">{String(v)}</td></tr>
                  ))}
                </tbody>
              </table>}
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Ratings & reviews</h2>
            {data.reviews.length === 0 && <p className="text-sm text-gray-600">No reviews yet. Be the first to review this product.</p>}
            <div className="space-y-4">
              {data.reviews.map((r: any) => (
                <div key={r.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center gap-2"><StarRating rating={r.rating} /><span className="text-sm font-semibold">{r.title}</span></div>
                  <p className="mt-1 text-sm text-gray-700">{r.body}</p>
                  <div className="mt-1 text-xs text-gray-600">{r.user_name} · {formatDate(r.created_at)} {r.is_verified_purchase && <span className="ml-2 font-medium text-green-700">✓ Verified purchase</span>}</div>
                </div>
              ))}
            </div>
            <form onSubmit={submitReview} className="mt-5 space-y-3 border-t pt-4" aria-label="Write a review">
              <div className="text-sm font-semibold">Write a review</div>
              <div className="flex flex-wrap gap-3">
                <label className="sr-only" htmlFor="rev-rating">Rating</label>
                <select id="rev-rating" value={review.rating} onChange={e => setReview(r => ({ ...r, rating: Number(e.target.value) }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                </select>
                <input aria-label="Review title" required maxLength={120} value={review.title} onChange={e => setReview(r => ({ ...r, title: e.target.value }))} placeholder="Title" className="input-field min-w-[180px] flex-1" />
              </div>
              <textarea aria-label="Review text" required minLength={5} maxLength={2000} value={review.body} onChange={e => setReview(r => ({ ...r, body: e.target.value }))} rows={3} placeholder="Share your experience" className="input-field" />
              <button className="btn-primary">Submit review</button>
            </form>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Questions & answers</h2>
            {data.questions.length === 0 && <p className="text-sm text-gray-600">No questions yet.</p>}
            <div className="space-y-4">
              {data.questions.map((q: any) => (
                <div key={q.id} className="text-sm">
                  <div className="font-medium">Q: {q.question}</div>
                  {q.answer ? <div className="mt-1 text-gray-700">A: {q.answer} <span className="text-xs text-gray-500">({q.answered_by_seller ? 'Seller' : 'Community'})</span></div> : <div className="mt-1 text-xs text-gray-600">Awaiting an answer from the seller.</div>}
                </div>
              ))}
            </div>
            <form onSubmit={submitQuestion} className="mt-4 flex gap-2">
              <label htmlFor="question" className="sr-only">Your question</label>
              <input id="question" required minLength={5} maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question about this product" className="input-field" />
              <button className="btn-outline whitespace-nowrap">Ask</button>
            </form>
          </div>
        </div>
      </section>

      {data.related.length > 0 && (
        <section className="mt-10" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-4 text-xl font-bold">Similar products</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">{data.related.slice(0, 4).map((r: any) => <ProductCard key={r.id} product={r} />)}</div>
        </section>
      )}
    </div>
  );
}
