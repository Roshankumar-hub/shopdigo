'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client/api';
import { Loading, StatusBadge } from '@/components/ui';
import { formatPrice, formatDate } from '@/lib/utils';

function Kpi({ label, value }: { label: string; value: string | number }) {
  return <div className="card p-4"><div className="text-xs text-gray-500">{label}</div><div className="text-2xl font-bold mt-1">{value}</div></div>;
}

export default function SellerDashboard() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('seller.dashboard').then(setD).catch(e => setErr(e.message)); }, []);
  if (err) return <p className="text-red-600">{err}</p>;
  if (!d) return <Loading />;
  const s = d.summary;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Delivered revenue" value={formatPrice(s.revenue)} />
        <Kpi label="Orders" value={s.order_count} />
        <Kpi label="Pending fulfilment" value={s.pending_count} />
        <Kpi label="Active products" value={s.product_count} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="font-bold mb-3">Pending fulfilment</h2>
          {d.pending.length === 0 ? <p className="text-sm text-gray-500">No pending items. Nice work!</p> :
            <ul className="text-sm divide-y">{d.pending.map((i: any) => (
              <li key={i.id} className="py-2 flex justify-between gap-2"><span className="line-clamp-1">{i.order_number} · {i.product?.name}</span><StatusBadge status={i.status} /></li>
            ))}</ul>}
          <Link href="/seller/orders" className="text-sm text-brand-700 font-medium hover:underline mt-3 inline-block">Manage orders →</Link>
        </section>
        <section className="card p-5">
          <h2 className="font-bold mb-3">Low-stock alerts (under 10 units)</h2>
          {d.lowStock.length === 0 ? <p className="text-sm text-gray-500">All active products are well stocked.</p> :
            <ul className="text-sm divide-y">{d.lowStock.map((p: any) => (
              <li key={p.id} className="py-2 flex justify-between"><span className="line-clamp-1">{p.name}</span><span className="text-red-600 font-semibold">{p.stock} left</span></li>
            ))}</ul>}
          <Link href="/seller/products" className="text-sm text-brand-700 font-medium hover:underline mt-3 inline-block">Update inventory →</Link>
        </section>
      </div>
      <section className="card p-5">
        <h2 className="font-bold mb-3">Ledger summary (net of commission)</h2>
        <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><dt className="text-gray-500">Gross sales</dt><dd className="font-semibold">{formatPrice(d.ledger.gross_sales)}</dd></div>
          <div><dt className="text-gray-500">Marketplace commission</dt><dd className="font-semibold">{formatPrice(Math.abs(d.ledger.commission))}</dd></div>
          <div><dt className="text-gray-500">Refunds</dt><dd className="font-semibold">{formatPrice(Math.abs(d.ledger.refunds))}</dd></div>
          <div><dt className="text-gray-500">Payouts made</dt><dd className="font-semibold">{formatPrice(Math.abs(d.ledger.payouts))}</dd></div>
          <div><dt className="text-gray-500">Net balance (ledger)</dt><dd className="font-semibold">{formatPrice(d.ledger.net_payable)}</dd></div>
        </dl>
        <p className="text-xs text-gray-500 mt-3">Ledger balances are accounting records. Settlement to your bank account happens only when an administrator records a processed payout.</p>
      </section>
      <section className="card p-5">
        <h2 className="font-bold mb-3">Recent orders</h2>
        {d.recentOrders.length === 0 ? <p className="text-sm text-gray-500">No orders yet. Share your store and products to get started.</p> :
          <ul className="text-sm divide-y">{d.recentOrders.map((o: any) => <li key={o.id} className="py-2 flex justify-between"><span>{o.order_number}</span><span className="text-gray-500">{formatDate(o.created_at)}</span></li>)}</ul>}
      </section>
    </div>
  );
}
