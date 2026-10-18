'use client';

import ProductImage from '@/components/ProductImage';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { Loading, Empty, PageTitle, StatusBadge } from '@/components/ui';
import { formatPrice, formatDate } from '@/lib/utils';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<any[]>('order.list').then(setOrders).catch(e => setErr(e.message)); }, []);
  if (err) return <p className="text-red-600">{err}</p>;
  if (!orders) return <Loading />;
  if (orders.length === 0) return <Empty title="No orders yet" action={{ href: '/', label: 'Start shopping' }}>Your orders will show up here.</Empty>;
  return (
    <div>
      <PageTitle title="Your orders" />
      <div className="space-y-4">
        {orders.map(o => (
          <Link key={o.id} href={`/account/orders/${o.id}`} className="card block p-4 hover:border-brand-300">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <div><span className="text-gray-500">Order </span><span className="font-semibold">{o.order_number}</span></div>
              <div className="text-gray-500">Placed {formatDate(o.created_at)}</div>
            </div>
            <div className="mt-3 space-y-2">
              {o.items.map((i: any) => (
                <div key={i.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden"><ProductImage src={i.product?.images?.[0]?.url} alt={i.product?.name || 'Product photo'} /></div>
                  <div className="flex-1 min-w-0"><div className="text-sm line-clamp-1">{i.product?.name || 'Product'}</div><div className="text-xs text-gray-500">Qty {i.quantity}</div></div>
                  <StatusBadge status={i.status} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-sm"><span>{o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online payment'} · {o.payment_status}</span><span className="font-semibold">{formatPrice(o.total)}</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
