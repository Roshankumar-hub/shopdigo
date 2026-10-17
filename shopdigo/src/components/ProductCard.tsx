'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import StarRating from './StarRating';
import ProductImage from './ProductImage';
import { formatPrice, discountPercent } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client/api';
import { useUIStore } from '@/lib/store';

/**
 * Product tile used on every listing. Ratings, discounts, stock and dispatch times are shown only
 * when the database holds them; nothing is estimated on the client.
 */
export default function ProductCard({ product, priority = false }: { product: any; priority?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const refreshCounts = useUIStore(s => s.refreshCounts);
  const wishlisted = useUIStore(s => s.wishlistIds.includes(product.id));
  const [busy, setBusy] = useState(false);
  const image = product.images?.[0]?.url as string | undefined;
  const discount = discountPercent(product.mrp, product.price);
  const outOfStock = !(product.stock > 0);
  const href = `/product/${product.slug}`;

  const addToCart = async () => {
    if (!user) { toast('Please log in to add items to your cart'); router.push(`/login?next=${encodeURIComponent(href)}`); return; }
    setBusy(true);
    try {
      await api('cart.add', { productId: product.id, quantity: 1 });
      await refreshCounts(true);
      toast.success('Added to cart');
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };

  const toggleWishlist = async () => {
    if (!user) { toast('Log in to save items to your wishlist'); router.push(`/login?next=${encodeURIComponent(href)}`); return; }
    try {
      const r = await api<{ wishlisted: boolean }>('wishlist.toggle', { productId: product.id });
      await refreshCounts(true);
      toast.success(r.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-gray-200/80 bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-within:shadow-lift">
      <div className="relative">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
          <div className="aspect-[4/5] overflow-hidden bg-gray-50 p-3">
            <ProductImage src={image} alt={product.name} priority={priority} className="transition-transform duration-300 group-hover:scale-[1.03]" />
          </div>
        </Link>
        {discount > 0 && <span className="absolute left-2 top-2 rounded-md bg-accent-600 px-2 py-0.5 text-xs font-bold text-white">{discount}% off</span>}
        <button
          type="button"
          onClick={toggleWishlist}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wishlisted}
          className="absolute right-2 top-2 z-10 rounded-full bg-white p-2 shadow-sm ring-1 ring-gray-200 transition-transform hover:scale-110"
        >
          {wishlisted ? <HeartSolid className="h-5 w-5 text-red-500" aria-hidden="true" /> : <HeartIcon className="h-5 w-5 text-gray-700" aria-hidden="true" />}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        {product.brand_name && <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{product.brand_name}</div>}
        <h3 className="mt-0.5 min-h-[2.6rem] text-sm font-medium leading-snug text-gray-900 line-clamp-2">
          <Link href={href} className="hover:text-brand-700 focus:outline-none after:absolute after:inset-0 after:content-['']">{product.name}</Link>
        </h3>
        {product.review_count > 0 ? (
          <StarRating rating={product.rating} reviews={product.review_count} className="mt-1" />
        ) : (
          <div className="mt-1 text-xs text-gray-500">No ratings yet</div>
        )}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
          {discount > 0 && <span className="text-xs text-gray-500 line-through">{formatPrice(product.mrp)}</span>}
        </div>
        <div className="mt-1 text-xs">
          {outOfStock
            ? <span className="font-semibold text-red-700">Out of stock</span>
            : product.stock <= 5
              ? <span className="font-semibold text-amber-700">Only {product.stock} left</span>
              : <span className="font-medium text-green-700">In stock</span>}
          {product.delivery_days ? <span className="text-gray-600"> · Ships in {product.delivery_days} day{product.delivery_days > 1 ? 's' : ''}</span> : null}
        </div>
        {product.seller_name && <div className="mt-1 truncate text-[11px] text-gray-500">Sold by {product.seller_name}</div>}

        <button
          type="button"
          onClick={addToCart}
          disabled={busy || outOfStock}
          className="relative z-10 mt-3 w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-500"
        >
          {outOfStock ? 'Unavailable' : busy ? 'Adding…' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
