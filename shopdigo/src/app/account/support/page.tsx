'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { PageTitle, Field, Empty, Loading } from '@/components/ui';
import { formatDateTime, orderStatusLabel } from '@/lib/utils';

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[] | null>(null);
  const [form, setForm] = useState({ subject: '', message: '', category: 'order', orderId: '' });
  const [busy, setBusy] = useState(false);
  const load = () => api<any[]>('ticket.mine').then(setTickets).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('ticket.create', { ...form, orderId: form.orderId || undefined });
      toast.success('Support ticket created');
      setForm({ subject: '', message: '', category: 'order', orderId: '' });
      load();
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="card p-5">
        <PageTitle title="Raise a support ticket" subtitle="Our team responds within 24 hours on business days." />
        <form onSubmit={submit} className="space-y-3">
          <Field label="Topic" id="cat"><select id="cat" className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            <option value="order">Order / delivery</option><option value="payment">Payment / refund</option><option value="product">Product</option><option value="seller">Seller</option><option value="other">Other</option>
          </select></Field>
          <Field label="Subject" id="sub"><input id="sub" required minLength={3} maxLength={120} className="input-field" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Order number (optional)" id="ord"><input id="ord" className="input-field" placeholder="Order ID from your order page" value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value.trim() })} /></Field>
          <Field label="Message" id="msg"><textarea id="msg" required minLength={10} maxLength={3000} rows={4} className="input-field" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></Field>
          <button disabled={busy} className="btn-secondary">{busy ? 'Submitting…' : 'Submit ticket'}</button>
        </form>
      </section>
      <section className="card p-5">
        <h2 className="font-bold mb-3">Your tickets</h2>
        {!tickets && <Loading />}
        {tickets?.length === 0 && <Empty title="No tickets yet" />}
        <ul className="space-y-3">
          {tickets?.map(t => (
            <li key={t.id} className="border rounded-lg p-3 text-sm">
              <div className="flex justify-between gap-2"><span className="font-semibold">{t.subject}</span><span className="text-xs bg-gray-100 px-2 rounded-full h-fit">{orderStatusLabel(t.status)}</span></div>
              <div className="text-gray-600 mt-1">{t.message}</div>
              <div className="text-xs text-gray-400 mt-1">{formatDateTime(t.created_at)} · {t.category}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
