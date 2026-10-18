'use client';

import ProductImage from '@/components/ProductImage';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client/api';
import { Loading, Empty, PageTitle } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import StarRating from '@/components/StarRating';

export default function ComparePage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    const list: string[] = JSON.parse(localStorage.getItem('shopdigo_compare') || '[]');
    setSlugs(list);
    Promise.all(list.map(s => api<any>('catalog.product', { slug: s }).then(r => r.product).catch(() => null)))
      .then(res => setItems(res.filter(Boolean)));
  }, []);
  const remove = (slug: string) => {
    const next = slugs.filter(s => s !== slug);
    localStorage.setItem('shopdigo_compare', JSON.stringify(next));
    setSlugs(next);
    setItems(prev => (prev || []).filter(p => p.slug !== slug));
  };
  if (!items) return <Loading />;
  if (items.length === 0) return <div className="container-custom py-10"><Empty title="Nothing to compare" action={{ href: '/search', label: 'Browse products' }}>Use “+ Compare” on up to four products.</Empty></div>;
  const specKeys = Array.from(new Set(items.flatMap(p => Object.keys(p.specifications || {}))));
  return (
    <div className="container-custom py-6 overflow-x-auto">
      <PageTitle title="Compare products" />
      <table className="w-full text-sm min-w-[640px]">
        <tbody>
          <tr><th className="w-40 text-left p-2 align-top text-gray-500">Product</th>{items.map(p => <td key={p.id} className="p-2 align-top w-56"><Link href={`/product/${p.slug}`} className="font-semibold hover:text-brand-600">{p.name}</Link><div className="mt-2 w-32 h-32 bg-gray-100 rounded overflow-hidden"><ProductImage src={p.images?.[0]?.url} alt={p?.name || 'Product photo'} /></div><button onClick={() => remove(p.slug)} className="text-xs text-red-600 mt-2 hover:underline">Remove</button></td>)}</tr>
          <tr className="border-t"><th className="text-left p-2 text-gray-500">Price</th>{items.map(p => <td key={p.id} className="p-2 font-bold">{formatPrice(p.price)}</td>)}</tr>
          <tr className="border-t"><th className="text-left p-2 text-gray-500">Rating</th>{items.map(p => <td key={p.id} className="p-2"><StarRating rating={p.rating} reviews={p.review_count} /></td>)}</tr>
          <tr className="border-t"><th className="text-left p-2 text-gray-500">Seller</th>{items.map(p => <td key={p.id} className="p-2">{p.seller_name}</td>)}</tr>
          <tr className="border-t"><th className="text-left p-2 text-gray-500">Return window</th>{items.map(p => <td key={p.id} className="p-2">{p.return_window_days} days</td>)}</tr>
          {specKeys.map(k => <tr key={k} className="border-t"><th className="text-left p-2 text-gray-500">{k}</th>{items.map(p => <td key={p.id} className="p-2">{p.specifications?.[k] ?? '—'}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
