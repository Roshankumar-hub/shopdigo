'use client';

import ProductImage from '@/components/ProductImage';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { Loading, Empty, PageTitle } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { useUIStore } from '@/lib/store';

export default function WishlistPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const refresh = useUIStore(s => s.refreshCounts);
  const load = () => api<any[]>('wishlist.list').then(setItems).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const remove = async (productId: string) => {
    await api('wishlist.toggle', { productId });
    toast.success('Removed from wishlist');
    load(); refresh(true);
  };
  const addToCart = async (productId: string) => {
    try { await api('cart.add', { productId, quantity: 1 }); toast.success('Added to cart'); refresh(true); } catch (e: any) { toast.error(e.message); }
  };

  if (!items) return <Loading />;
  if (items.length === 0) return <Empty title="Your wishlist is empty" action={{ href: '/', label: 'Discover products' }}>Tap the heart on any product to save it.</Empty>;
  return (
    <div>
      <PageTitle title={`Wishlist (${items.length})`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(w => w.product && (
          <div key={w.id} className="card p-4 flex gap-4">
            <Link href={`/product/${w.product.slug}`} className="w-24 h-24 bg-gray-100 rounded overflow-hidden flex-shrink-0"><ProductImage src={w.product.images?.[0]?.url} alt={w.product?.name || 'Product photo'} /></Link>
            <div className="flex-1 min-w-0">
              <Link href={`/product/${w.product.slug}`} className="text-sm font-medium line-clamp-2 hover:text-brand-600">{w.product.name}</Link>
              <div className="font-bold mt-1">{formatPrice(w.product.price)}</div>
              <div className="flex gap-3 mt-2 text-sm">
                <button onClick={() => addToCart(w.product_id)} className="text-brand-700 font-medium hover:underline">Move to cart</button>
                <button onClick={() => remove(w.product_id)} className="text-red-600 hover:underline">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
