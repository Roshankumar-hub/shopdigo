'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { Loading, Empty } from '@/components/ui';
import { formatPrice, orderStatusLabel } from '@/lib/utils';

const STATUS_CLS: Record<string, string> = { active: 'bg-green-100 text-green-700', pending_approval: 'bg-amber-100 text-amber-700', draft: 'bg-gray-100 text-gray-700', rejected: 'bg-red-100 text-red-700', inactive: 'bg-gray-200 text-gray-600' };

export default function SellerProducts() {
  const [items, setItems] = useState<any[] | null>(null);
  const [edit, setEdit] = useState<Record<string, { stock: number; price: number }>>({});
  const load = () => api<any[]>('seller.products').then(setItems).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const saveStock = async (p: any) => {
    const e = edit[p.id];
    try { await api('seller.productStock', { productId: p.id, stock: e.stock, price: e.price }); toast.success('Inventory and price updated'); load(); }
    catch (err: any) { toast.error(err.message); }
  };
  const toggle = async (p: any) => {
    try { await api('seller.productSetActive', { productId: p.id, active: p.status !== 'active' && p.status !== 'pending_approval' }); toast.success('Listing updated'); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  if (!items) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <p className="text-sm text-gray-600">{items.length} listing{items.length !== 1 ? 's' : ''}. New and edited listings are reviewed by SHOPDIGO before they go live.</p>
        <Link href="/seller/products/new" className="btn-secondary py-2 text-sm">+ Add product</Link>
      </div>
      {items.length === 0 && <Empty title="No products yet" action={{ href: '/seller/products/new', label: 'Add your first product' }} />}
      {items.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr><th className="p-3">Product</th><th className="p-3">Status</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="border-t align-top">
                  <td className="p-3"><div className="font-medium line-clamp-2 max-w-xs">{p.name}</div><div className="text-xs text-gray-500">{p.category_name}</div>
                    {p.status === 'rejected' && <div className="text-xs text-red-600 mt-1">Rejected: {p.rejection_reason}</div>}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[p.status] || ''}`}>{orderStatusLabel(p.status)}</span></td>
                  <td className="p-3"><input aria-label={`Price for ${p.name}`} type="number" min={1} className="border rounded px-2 py-1 w-28" defaultValue={p.price} onChange={e => setEdit({ ...edit, [p.id]: { stock: edit[p.id]?.stock ?? p.stock, price: Number(e.target.value) } })} /></td>
                  <td className="p-3"><input aria-label={`Stock for ${p.name}`} type="number" min={0} className="border rounded px-2 py-1 w-24" defaultValue={p.stock} onChange={e => setEdit({ ...edit, [p.id]: { price: edit[p.id]?.price ?? p.price, stock: Number(e.target.value) } })} /></td>
                  <td className="p-3 space-y-2 whitespace-nowrap">
                    <button onClick={() => saveStock(p)} className="text-brand-700 font-medium hover:underline block">Save price & stock</button>
                    <Link href={`/seller/products/${p.id}`} className="text-brand-700 hover:underline block">Edit details</Link>
                    {(p.status === 'active' || p.status === 'pending_approval' || p.status === 'inactive') && <button onClick={() => toggle(p)} className="text-gray-600 hover:underline block">{p.status === 'inactive' ? 'Reactivate' : 'Deactivate'}</button>}
                    <span className="text-xs text-gray-400 block">{formatPrice(p.mrp)} MRP</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
