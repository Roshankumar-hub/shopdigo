'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { Loading, Empty, StatusBadge } from '@/components/ui';
import { formatPrice, formatDateTime, orderStatusLabel } from '@/lib/utils';

const NEXT: Record<string, string[]> = {
  placed: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['packed', 'cancelled'],
  packed: ['shipped'], shipped: ['out_for_delivery'], out_for_delivery: ['delivered'],
};

export default function SellerOrders() {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [tab, setTab] = useState<'open' | 'completed' | 'cancelled' | 'returns'>('open');
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => api<any[]>('seller.orders').then(setOrders).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);

  if (!orders) return <Loading />;
  const items = orders.flatMap(o => o.items.map((i: any) => ({ ...i, order_number: o.order_number, created_at: o.created_at, buyer_city: o.address?.city, payment_method: o.payment_method })));
  const filtered = items.filter(i => {
    if (tab === 'open') return ['placed', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery'].includes(i.status);
    if (tab === 'completed') return i.status === 'delivered';
    if (tab === 'cancelled') return i.status === 'cancelled';
    return ['return_requested', 'returned'].includes(i.status);
  });

  const move = async (item: any, status: string) => {
    setBusy(item.id);
    try {
      await api('seller.orderItemUpdate', { orderItemId: item.id, status, trackingNumber: tracking[item.id] || undefined });
      toast.success(`Marked ${orderStatusLabel(status)}`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const decide = async (item: any, approve: boolean) => {
    setBusy(item.id);
    try { await api('seller.returnDecision', { orderItemId: item.id, approve }); toast.success(approve ? 'Return approved. Refund is handled by the marketplace administrator.' : 'Return rejected'); load(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const downloadCsv = () => {
    const rows = [['Order', 'Date', 'Product', 'Qty', 'Amount', 'Status', 'Tracking'], ...items.map(i => [i.order_number, i.created_at, (i.product?.name || '').replace(/,/g, ' '), i.quantity, i.price * i.quantity, i.status, i.tracking_number || ''])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shopdigo-seller-orders.csv'; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <div role="tablist" className="flex gap-2 text-sm">
          {(['open', 'completed', 'cancelled', 'returns'] as const).map(t => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full capitalize ${tab === t ? 'bg-brand-600 text-white' : 'bg-gray-100'}`}>{t}</button>
          ))}
        </div>
        <button onClick={downloadCsv} className="btn-outline py-1.5 text-sm">Download CSV</button>
      </div>
      {filtered.length === 0 && <Empty title="Nothing here" />}
      <div className="space-y-3">
        {filtered.map(i => (
          <div key={i.id} className="card p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500">{i.order_number} · {formatDateTime(i.created_at)} · {i.payment_method === 'cod' ? 'COD' : 'Prepaid'} · Ship to {i.buyer_city}</div>
              <div className="font-medium mt-0.5">{i.product?.name} <span className="text-gray-500">× {i.quantity}</span></div>
              <div className="text-sm">{formatPrice(i.price * i.quantity)}</div>
              <div className="mt-1"><StatusBadge status={i.status} /></div>
              {i.tracking_number && <div className="text-xs mt-1">Tracking: <span className="font-mono">{i.tracking_number}</span></div>}
              {i.return_reason && <div className="text-xs text-gray-600 mt-1">Return reason: {i.return_reason}</div>}
            </div>
            <div className="flex flex-col gap-2 md:w-64">
              {(NEXT[i.status] || []).map(s => (
                <button key={s} disabled={busy === i.id} onClick={() => move(i, s)} className={s === 'cancelled' ? 'btn-outline py-1.5 text-sm text-red-600 border-red-300' : 'btn-primary py-1.5 text-sm'}>
                  {s === 'cancelled' ? 'Cancel item' : `Mark ${orderStatusLabel(s).toLowerCase()}`}
                </button>
              ))}
              {i.status === 'packed' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium" htmlFor={`trk-${i.id}`}>Courier tracking / AWB number</label>
                  <input id={`trk-${i.id}`} value={tracking[i.id] || ''} onChange={e => setTracking({ ...tracking, [i.id]: e.target.value })} className="input-field py-1.5 text-sm" maxLength={60} />
                  <button disabled={busy === i.id || !tracking[i.id]} onClick={() => move(i, 'shipped')} className="btn-primary py-1.5 text-sm w-full disabled:opacity-50">Mark shipped</button>
                </div>
              )}
              {i.status === 'return_requested' && (
                <div className="flex gap-2">
                  <button onClick={() => decide(i, true)} disabled={busy === i.id} className="btn-primary py-1.5 text-sm flex-1">Approve return</button>
                  <button onClick={() => decide(i, false)} disabled={busy === i.id} className="btn-outline py-1.5 text-sm flex-1">Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
