'use client';

import ProductImage from '@/components/ProductImage';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { useAuth } from '@/lib/auth';
import { useUIStore } from '@/lib/store';
import { RequireAuth, Loading, Empty, PageTitle } from '@/components/ui';
import { formatPrice } from '@/lib/utils';

function CartInner() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refreshCounts = useUIStore(s => s.refreshCounts);
  const { user } = useAuth();

  const load = () => api('cart.get').then(setData).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const change = async (itemId: string, quantity: number) => {
    setBusy(itemId);
    try {
      const r = await api<any>('cart.update', { itemId, quantity });
      setData((d: any) => ({ ...d, cart: r.cart, quote: r.quote }));
      await refreshCounts(!!user);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const remove = async (itemId: string) => {
    setBusy(itemId);
    try {
      await api('cart.remove', { itemId });
      toast.success('Removed from cart');
      await load();
      await refreshCounts(!!user);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  if (!data) return <Loading label="Loading your cart…" />;
  const { cart, quote } = data;
  if (cart.items.length === 0) {
    return <div className="container-custom py-10"><Empty title="Your cart is empty" action={{ href: '/', label: 'Continue shopping' }}>Items you add to your cart will appear here.</Empty></div>;
  }
  const blocked = quote.lines.some((l: any) => !l.in_stock);

  return (
    <div className="container-custom py-6">
      <PageTitle title={`Shopping Cart (${cart.items.reduce((s: number, i: any) => s + i.quantity, 0)} items)`} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-3">
          {quote.lines.map((l: any) => {
            const item = cart.items.find((i: any) => i.id === l.item_id);
            return (
              <div key={l.item_id} className="card p-4 flex gap-4">
                <Link href={`/product/${item?.product?.slug || ''}`} className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  <ProductImage src={item?.product?.images?.[0]?.url} alt={item?.product?.name || 'Product photo'} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item?.product?.slug || ''}`} className="font-medium hover:text-brand-600 line-clamp-2">{l.name}</Link>
                  <div className="text-xs text-gray-500 mt-0.5">Sold by {item?.product?.seller_name}</div>
                  {!l.in_stock && <div className="text-sm text-red-600 font-medium mt-1">{l.available > 0 ? `Only ${l.available} left – reduce quantity` : 'Out of stock or unavailable'}</div>}
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <label className="text-sm flex items-center gap-1">Qty
                      <select aria-label={`Quantity for ${l.name}`} disabled={busy === l.item_id} value={l.quantity} onChange={e => change(l.item_id, Number(e.target.value))} className="border rounded-lg px-2 py-1">
                        {Array.from({ length: Math.max(10, l.quantity) }, (_, i) => i + 1).map(n => <option key={n}>{n}</option>)}
                      </select>
                    </label>
                    <button onClick={() => remove(l.item_id)} disabled={busy === l.item_id} className="text-sm text-red-600 hover:underline">Remove</button>
                  </div>
                </div>
                <div className="text-right font-semibold whitespace-nowrap">{formatPrice(l.line_total)}</div>
              </div>
            );
          })}
        </div>
        <aside className="card p-5 h-fit lg:sticky lg:top-40">
          <h2 className="font-bold mb-3">Price details</h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(quote.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{quote.delivery_charge ? formatPrice(quote.delivery_charge) : 'Free'}</dd></div>
            <div className="flex justify-between text-gray-600"><dt>Estimated GST (5%)</dt><dd>{formatPrice(quote.tax)}</dd></div>
            <div className="flex justify-between font-bold text-base border-t pt-2"><dt>Total (estimated)</dt><dd>{formatPrice(quote.total)}</dd></div>
          </dl>
          <p className="text-xs text-gray-500 mt-2">Final totals, coupons and delivery are re-validated at checkout.</p>
          {blocked
            ? <button disabled className="btn-primary w-full mt-4 opacity-50">Fix unavailable items to checkout</button>
            : <Link href="/checkout" className="btn-secondary w-full mt-4 block text-center">Proceed to Checkout</Link>}
        </aside>
      </div>
    </div>
  );
}

export default function CartPage() {
  return <RequireAuth><CartInner /></RequireAuth>;
}
