'use client';

import ProductImage from '@/components/ProductImage';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { Loading, RequireAuth, StatusBadge, PageTitle, Empty } from '@/components/ui';
import { formatPrice, formatDateTime, orderStatusLabel } from '@/lib/utils';

type Tab = 'overview' | 'sellers' | 'products' | 'orders' | 'coupons' | 'tickets' | 'customers' | 'audit';
const TABS: [Tab, string][] = [['overview', 'Overview'], ['sellers', 'Sellers'], ['products', 'Product moderation'], ['orders', 'Orders & refunds'], ['coupons', 'Coupons'], ['tickets', 'Support'], ['customers', 'Customers'], ['audit', 'Audit log']];

function AdminInner() {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loaders: Record<Tab, () => Promise<any>> = {
    overview: () => api('admin.overview'),
    sellers: () => api('admin.sellers'),
    products: () => api('admin.products', { status: 'pending_approval' }),
    orders: () => api('admin.orders'),
    coupons: () => api('admin.coupons'),
    tickets: () => api('admin.tickets'),
    customers: () => api('admin.customers'),
    audit: () => api('admin.audit'),
  };

  const load = async (t = tab) => {
    setLoading(true);
    setLoadError('');
    try { const r = await loaders[t](); setData((d: any) => ({ ...d, [t]: r })); }
    catch (e: any) { setLoadError(e.message); toast.error(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(tab); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  const act = async (fn: () => Promise<any>, ok: string) => {
    try { await fn(); toast.success(ok); await load(tab); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="container-custom py-6">
      <PageTitle title="Admin Dashboard" subtitle="Platform operations. Every action here is checked on the server and logged." />
      <nav className="flex gap-2 overflow-x-auto no-scrollbar mb-6 border-b" role="tablist" aria-label="Admin sections">
        {TABS.map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-600'}`}>{label}</button>
        ))}
      </nav>
      {loading && !data[tab] && <Loading />}
      {loadError && <div role="alert" className="card p-4 border-red-300 bg-red-50 text-red-700 text-sm mb-4">Could not load this section: {loadError}. <button className="underline ml-2" onClick={() => load(tab)}>Retry</button></div>}

      {tab === 'overview' && data.overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[['Customers', data.overview.stats.total_customers], ['Active sellers', data.overview.stats.total_sellers], ['Sellers awaiting approval', data.overview.stats.pending_sellers], ['Live products', data.overview.stats.total_products], ['Products awaiting review', data.overview.stats.pending_products], ['Orders', data.overview.stats.total_orders], ['Paid revenue', formatPrice(data.overview.stats.revenue)], ['Open tickets', data.overview.stats.open_tickets]].map(([l, v]) => (
              <div key={String(l)} className="card p-4"><div className="text-xs text-gray-500">{l}</div><div className="text-2xl font-bold mt-1">{v}</div></div>
            ))}
          </div>
          <section className="card p-5"><h2 className="font-bold mb-2">Recent admin actions</h2>
            {data.overview.audit.length === 0 ? <p className="text-sm text-gray-500">No actions yet.</p> :
              <ul className="text-sm divide-y">{data.overview.audit.map((a: any) => <li key={a.id} className="py-2 flex justify-between gap-3"><span>{a.action} · {a.entity_type} {a.entity_id?.slice(0, 8)}</span><span className="text-gray-500">{formatDateTime(a.created_at)}</span></li>)}</ul>}
          </section>
        </div>
      )}

      {tab === 'sellers' && data.sellers && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Store</th><th>Contact</th><th>GSTIN / PAN</th><th>Status</th><th>Commission</th><th>Actions</th></tr></thead>
            <tbody>{data.sellers.map((s: any) => (
              <tr key={s.id} className="border-t align-top">
                <td className="p-3"><div className="font-medium">{s.store_name}</div><div className="text-xs text-gray-500">{s.business_name} · {s.pickup_city}</div></td>
                <td className="p-3 text-xs">{s.contact_email}<br />{s.contact_phone}</td>
                <td className="p-3 text-xs">{s.gstin || '—'}<br />{s.pan || '—'}</td>
                <td className="p-3"><StatusBadge status={s.status} /></td>
                <td className="p-3">
                  <CommissionEditor value={s.commission_rate} onSave={rate => act(() => api('admin.sellerCommission', { sellerId: s.id, rate }), 'Commission updated')} />
                </td>
                <td className="p-3 space-x-2 whitespace-nowrap">
                  {s.status !== 'approved' && <button className="text-green-700 font-medium hover:underline" onClick={() => act(() => api('admin.sellerStatus', { sellerId: s.id, status: 'approved' }), 'Seller approved')}>Approve</button>}
                  {s.status !== 'rejected' && s.status !== 'approved' && <button className="text-red-600 hover:underline" onClick={() => { const r = prompt('Reason for rejection?'); if (r) act(() => api('admin.sellerStatus', { sellerId: s.id, status: 'rejected', reason: r }), 'Seller rejected'); }}>Reject</button>}
                  {s.status === 'approved' && <button className="text-red-600 hover:underline" onClick={() => { const r = prompt('Reason for suspension?'); if (r) act(() => api('admin.sellerStatus', { sellerId: s.id, status: 'suspended', reason: r }), 'Seller suspended'); }}>Suspend</button>}
                  {s.status === 'suspended' && <button className="text-green-700 hover:underline" onClick={() => act(() => api('admin.sellerStatus', { sellerId: s.id, status: 'approved' }), 'Seller reactivated')}>Reactivate</button>}
                </td>
              </tr>
            ))}</tbody></table>
        </div>
      )}

      {tab === 'products' && data.products && (
        data.products.length === 0 ? <Empty title="No products awaiting review" /> :
        <div className="space-y-3">{data.products.map((p: any) => (
          <div key={p.id} className="card p-4 flex flex-col md:flex-row gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden"><ProductImage src={p.images?.[0]?.url} alt={p?.name || 'Product photo'} /></div>
            <div className="flex-1"><div className="font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.seller_name} · {p.category_name} · {formatPrice(p.price)} (MRP {formatPrice(p.mrp)}) · stock {p.stock}</div><p className="text-sm text-gray-700 mt-2 line-clamp-3">{p.description}</p></div>
            <div className="flex md:flex-col gap-2">
              <button className="btn-primary py-1.5 text-sm" onClick={() => act(() => api('admin.productModerate', { productId: p.id, approve: true }), 'Product approved')}>Approve</button>
              <button className="btn-outline py-1.5 text-sm text-red-600 border-red-300" onClick={() => { const r = prompt('Reason for rejection?'); if (r) act(() => api('admin.productModerate', { productId: p.id, approve: false, reason: r }), 'Product rejected'); }}>Reject</button>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'orders' && data.orders && <OrdersTable orders={data.orders} onRefund={(o) => {
        const amt = prompt(`Refund amount in ₹ (max ${o.total}). Only online payments refund automatically.`, String(o.total));
        if (amt) act(() => api('admin.refund', { orderId: o.id, amountRupees: Number(amt) }), 'Refund initiated with gateway');
      }} />}

      {tab === 'coupons' && data.coupons && <CouponsPanel coupons={data.coupons} onCreate={(payload: any) => act(() => api('admin.couponCreate', payload), 'Coupon created')} />}

      {tab === 'tickets' && data.tickets && (
        data.tickets.length === 0 ? <Empty title="No support tickets" /> :
        <div className="space-y-3">{data.tickets.map((t: any) => (
          <div key={t.id} className="card p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{t.subject}</span><span className="text-xs text-gray-500">{t.user_name} · {t.category} · {formatDateTime(t.created_at)}</span></div>
            <p className="mt-1 text-gray-700">{t.message}</p>
            <div className="mt-3 flex gap-2 items-center">
              <label className="text-xs" htmlFor={`st-${t.id}`}>Status</label>
              <select id={`st-${t.id}`} value={t.status} onChange={e => act(() => api('admin.ticketStatus', { ticketId: t.id, status: e.target.value }), 'Ticket updated')} className="border rounded px-2 py-1 text-xs">
                {['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}
              </select>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'customers' && data.customers && (
        <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Name</th><th>Email</th><th>Joined</th></tr></thead>
          <tbody>{data.customers.map((c: any) => <tr key={c.id} className="border-t"><td className="p-3">{c.name}</td><td>{c.email}</td><td>{formatDateTime(c.created_at)}</td></tr>)}</tbody></table></div>
      )}

      {tab === 'audit' && data.audit && (
        <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">When</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>{data.audit.map((a: any) => <tr key={a.id} className="border-t"><td className="p-3 whitespace-nowrap">{formatDateTime(a.created_at)}</td><td>{a.action}</td><td className="text-xs">{a.entity_type} {a.entity_id}</td><td className="text-xs text-gray-500">{a.details ? JSON.stringify(a.details) : ''}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

function CommissionEditor({ value, onSave }: { value: number; onSave: (r: number) => void }) {
  const [v, setV] = useState(String(value));
  return (
    <div className="flex items-center gap-1">
      <input aria-label="Commission percent" type="number" min={0} max={50} step={0.5} value={v} onChange={e => setV(e.target.value)} className="border rounded px-2 py-1 w-20 text-sm" />
      <span>%</span>
      <button className="text-brand-700 text-xs hover:underline" onClick={() => onSave(Number(v))}>Save</button>
    </div>
  );
}

function OrdersTable({ orders, onRefund }: { orders: any[]; onRefund: (o: any) => void }) {
  const [q, setQ] = useState('');
  const list = orders.filter(o => !q || o.order_number.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <input aria-label="Search orders" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by order number" className="input-field max-w-xs" />
      <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Order</th><th>Date</th><th>Method</th><th>Payment</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
        <tbody>{list.map(o => (
          <tr key={o.id} className="border-t">
            <td className="p-3 font-medium">{o.order_number}</td>
            <td className="whitespace-nowrap">{formatDateTime(o.created_at)}</td>
            <td>{o.payment_method === 'cod' ? 'COD' : 'Razorpay'}</td>
            <td className="capitalize">{o.payment_status.replace('_', ' ')}</td>
            <td><StatusBadge status={o.status} /></td>
            <td>{formatPrice(o.total)}</td>
            <td>{o.payment_method === 'razorpay' && o.payment_status !== 'refunded' && o.razorpay_payment_id && <button className="text-red-600 hover:underline" onClick={() => onRefund(o)}>Refund</button>}</td>
          </tr>
        ))}</tbody></table></div>
    </div>
  );
}

function CouponsPanel({ coupons, onCreate }: { coupons: any[]; onCreate: (p: any) => void }) {
  const [f, setF] = useState({ code: '', description: '', discount_type: 'flat', discount_value: '', min_order_value: '0', max_discount: '', usage_limit: '', valid_until: '' });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      code: f.code.toUpperCase(), description: f.description, discount_type: f.discount_type, discount_value: Number(f.discount_value),
      min_order_value: Number(f.min_order_value || 0), max_discount: f.max_discount ? Number(f.max_discount) : undefined,
      usage_limit: f.usage_limit ? Number(f.usage_limit) : undefined, valid_until: new Date(f.valid_until).toISOString(),
    });
  };
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Valid until</th></tr></thead>
        <tbody>{coupons.map(c => <tr key={c.id} className="border-t"><td className="p-3 font-mono">{c.code}</td><td>{c.discount_type === 'percentage' ? `${c.discount_value}%` : formatPrice(c.discount_value)}</td><td>{formatPrice(c.min_order_value)}</td><td>{c.times_used}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td><td>{formatDateTime(c.valid_until)}</td></tr>)}</tbody></table></div>
      <form onSubmit={submit} className="card p-5 space-y-3 h-fit">
        <h2 className="font-bold">Create coupon</h2>
        <input aria-label="Code" required pattern="[A-Za-z0-9]{4,20}" placeholder="CODE (4–20 chars)" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} className="input-field uppercase" />
        <input aria-label="Description" required placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className="input-field" />
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="Discount type" value={f.discount_type} onChange={e => setF({ ...f, discount_type: e.target.value })} className="input-field"><option value="flat">Flat ₹</option><option value="percentage">Percent %</option></select>
          <input aria-label="Discount value" required type="number" min={1} placeholder="Value" value={f.discount_value} onChange={e => setF({ ...f, discount_value: e.target.value })} className="input-field" />
          <input aria-label="Minimum order" type="number" min={0} placeholder="Min order ₹" value={f.min_order_value} onChange={e => setF({ ...f, min_order_value: e.target.value })} className="input-field" />
          <input aria-label="Max discount" type="number" min={1} placeholder="Max discount ₹" value={f.max_discount} onChange={e => setF({ ...f, max_discount: e.target.value })} className="input-field" />
          <input aria-label="Usage limit" type="number" min={1} placeholder="Usage limit" value={f.usage_limit} onChange={e => setF({ ...f, usage_limit: e.target.value })} className="input-field" />
          <input aria-label="Valid until" required type="datetime-local" value={f.valid_until} onChange={e => setF({ ...f, valid_until: e.target.value })} className="input-field" />
        </div>
        <button className="btn-secondary w-full">Create coupon</button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  return <RequireAuth role="admin"><AdminInner /></RequireAuth>;
}
