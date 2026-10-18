'use client';

import ProductImage from '@/components/ProductImage';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { Loading, Empty, PageTitle, StatusBadge, RequireAuth } from '@/components/ui';
import { formatPrice, formatDate, formatDateTime, orderStatusLabel } from '@/lib/utils';

const STEPS = ['placed', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

function Inner() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [err, setErr] = useState('');
  const [reasonFor, setReasonFor] = useState<{ id: string; type: 'cancel' | 'return' } | null>(null);
  const [reason, setReason] = useState('');

  const load = () => api('order.get', { id }).then(setOrder).catch(e => setErr(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const submitReason = async () => {
    if (!reasonFor || reason.trim().length < 3) return toast.error('Please describe the reason (at least 3 characters)');
    try {
      if (reasonFor.type === 'cancel') {
        const r = await api<any>('order.cancelItem', { orderItemId: reasonFor.id, reason });
        toast.success('Item cancelled');
        if (r.refund) toast(r.refund, { duration: 6000 });
      } else {
        await api('order.requestReturn', { orderItemId: reasonFor.id, reason });
        toast.success('Return requested. The seller will review it.');
      }
      setReasonFor(null); setReason(''); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const retry = async () => {
    try {
      const r = await api<any>('order.retryPayment', { id });
      const { openRazorpayCheckout } = await import('@/lib/checkout');
      const result = await openRazorpayCheckout(r.payment, { name: order.address?.name, contact: order.address?.phone });
      const { postJSON } = await import('@/lib/client/api');
      await postJSON('/api/payments/razorpay/verify', result);
      toast.success('Payment received');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (err) return <Empty title="Order not found">{err}</Empty>;
  if (!order) return <Loading />;

  const delivered = order.items.every((i: any) => i.status === 'delivered' || i.status === 'returned' || i.status === 'cancelled');
  const cancelled = order.status === 'cancelled';
  const idx = STEPS.indexOf(order.status);

  return (
    <div className="space-y-6">
      {sp.get('placed') && <div className="card p-5 border-green-300 bg-green-50"><div className="font-semibold text-green-800">Thank you! Your order {order.order_number} has been placed.</div><div className="text-sm text-green-700">We will send updates here and in your notifications.</div></div>}
      <div className="flex flex-wrap justify-between gap-3 items-start">
        <PageTitle title={`Order ${order.order_number}`} subtitle={`Placed on ${formatDateTime(order.created_at)}`} />
        <div className="flex gap-2 no-print">
          <button onClick={() => window.print()} className="btn-outline py-2 text-sm">Print invoice</button>
          <Link href="/account/support" className="btn-ghost text-sm">Need help?</Link>
        </div>
      </div>

      {order.payment_method === 'razorpay' && order.payment_status === 'pending' && !cancelled && (
        <div className="card p-4 border-amber-300 bg-amber-50 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>Payment for this order is pending. It is confirmed only after Razorpay verifies the payment.</span>
          <button onClick={retry} className="btn-secondary py-2 text-sm">Pay now</button>
        </div>
      )}

      <section className="card p-5" aria-label="Order status">
        <h2 className="font-bold mb-4">Order timeline</h2>
        {cancelled ? (
          <p className="text-red-600 font-medium">This order was cancelled.</p>
        ) : (
          <ol className="grid grid-cols-7 gap-1 text-[10px] md:text-xs text-center">
            {STEPS.map((s, i) => (
              <li key={s} className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full mb-1 ${idx >= i ? 'bg-brand-600' : 'bg-gray-200'}`} />
                <span className={idx >= i ? 'text-gray-900 font-medium' : 'text-gray-400'}>{orderStatusLabel(s)}</span>
              </li>
            ))}
          </ol>
        )}
        {order.history?.length > 0 && (
          <ul className="mt-6 space-y-3 border-t pt-4 text-sm">
            {order.history.slice().reverse().map((h: any) => {
              const item = order.items.find((i: any) => i.id === h.order_item_id);
              return (
                <li key={h.id} className="flex gap-3">
                  <span className="text-gray-400 whitespace-nowrap w-40">{formatDateTime(h.created_at)}</span>
                  <span><StatusBadge status={h.status} /> <span className="text-gray-600">{item?.product?.name ? `· ${item.product.name}` : ''}{h.note ? ` — ${h.note}` : ''}</span></span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-bold mb-3">Items</h2>
        <div className="divide-y">
          {order.items.map((i: any) => {
            const deadline = i.delivered_at && i.product ? new Date(i.delivered_at).getTime() + (i.product.return_window_days ?? 7) * 86400000 : 0;
            const canCancel = ['placed', 'confirmed', 'processing'].includes(i.status);
            const canReturn = i.status === 'delivered' && deadline > Date.now();
            return (
              <div key={i.id} className="py-4 flex flex-wrap gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0"><ProductImage src={i.product?.images?.[0]?.url} alt={i.product?.name || 'Product photo'} /></div>
                <div className="flex-1 min-w-[200px]">
                  <Link href={`/product/${i.product?.slug || ''}`} className="font-medium hover:text-brand-600">{i.product?.name || 'Product'}</Link>
                  <div className="text-xs text-gray-500">Sold by {i.product?.seller_name || 'seller'} · Qty {i.quantity} · {formatPrice(i.price)} each</div>
                  <div className="mt-1"><StatusBadge status={i.status} /></div>
                  {i.tracking_number && <div className="text-xs mt-1">Courier / tracking reference: <span className="font-mono">{i.tracking_number}</span> <span className="text-gray-500">(tracking updates are provided by the courier)</span></div>}
                  {i.delivered_at && <div className="text-xs text-gray-500">Delivered {formatDate(i.delivered_at)}</div>}
                  {i.cancellation_reason && <div className="text-xs text-gray-500">Note: {i.cancellation_reason}</div>}
                  {i.return_reason && <div className="text-xs text-gray-500">Return reason: {i.return_reason}</div>}
                  {reasonFor && reasonFor.id === i.id && (
                    <div className="mt-3 space-y-2">
                      <label htmlFor="reason" className="text-sm font-medium">{reasonFor.type === 'cancel' ? 'Why are you cancelling?' : 'Why are you returning this item?'}</label>
                      <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} rows={2} className="input-field" />
                      <div className="flex gap-2"><button onClick={submitReason} className="btn-primary py-1.5 text-sm">Submit</button><button onClick={() => setReasonFor(null)} className="btn-ghost text-sm">Back</button></div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  {canCancel && <button onClick={() => { setReasonFor({ id: i.id, type: 'cancel' }); setReason(''); }} className="btn-outline py-1.5">Cancel item</button>}
                  {canReturn && <button onClick={() => { setReasonFor({ id: i.id, type: 'return' }); setReason(''); }} className="btn-outline py-1.5">Request return</button>}
                  {i.status === 'delivered' && !canReturn && <span className="text-xs text-gray-500">Return window closed</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="card p-5 text-sm">
          <h2 className="font-bold mb-2">Delivery address</h2>
          {order.address ? <>
            <div className="font-medium">{order.address.name}</div>
            <div>{order.address.address_line1}{order.address.address_line2 ? ', ' + order.address.address_line2 : ''}</div>
            <div>{order.address.city}, {order.address.state} – {order.address.pincode}</div>
            <div>{order.address.phone}</div>
          </> : <p className="text-gray-500">Address unavailable</p>}
        </div>
        <div className="card p-5 text-sm">
          <h2 className="font-bold mb-2">Invoice summary</h2>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between"><dt>Discount {order.coupon_code && `(${order.coupon_code})`}</dt><dd>−{formatPrice(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{order.delivery_charge ? formatPrice(order.delivery_charge) : 'Free'}</dd></div>
            <div className="flex justify-between"><dt>GST (5%, estimated)</dt><dd>{formatPrice(order.tax)}</dd></div>
            <div className="flex justify-between font-bold border-t pt-2"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>
          <p className="mt-3">Payment: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'} · <span className="font-medium capitalize">{order.payment_status.replace('_', ' ')}</span></p>
          {order.razorpay_payment_id && <p className="text-xs text-gray-500">Payment ref: {order.razorpay_payment_id}</p>}
          {delivered && order.items.some((i: any) => i.status === 'delivered') && <p className="text-xs text-gray-500 mt-2">Returns: request within the return window shown above.</p>}
        </div>
      </section>
    </div>
  );
}

export default function OrderDetailPage() {
  return <RequireAuth><Inner /></RequireAuth>;
}
