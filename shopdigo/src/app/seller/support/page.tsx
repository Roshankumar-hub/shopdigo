'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { Field, Loading, Empty, PageTitle } from '@/components/ui';
import { formatDateTime, orderStatusLabel } from '@/lib/utils';

export default function SellerSupport() {
  const [tickets, setTickets] = useState<any[] | null>(null);
  const [f, setF] = useState({ subject: '', message: '' });
  const load = () => api<any[]>('seller.tickets').then(setTickets).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api('ticket.create', { ...f, category: 'seller' }); toast.success('Request sent to seller support'); setF({ subject: '', message: '' }); load(); }
    catch (err: any) { toast.error(err.message); }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="card p-5">
        <PageTitle title="Seller support" subtitle="Ask about listings, payouts, policies or account verification." />
        <form onSubmit={submit} className="space-y-3">
          <Field label="Subject" id="ss"><input id="ss" required minLength={3} maxLength={120} className="input-field" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} /></Field>
          <Field label="Message" id="sm"><textarea id="sm" required minLength={10} maxLength={3000} rows={4} className="input-field" value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></Field>
          <button className="btn-secondary">Send</button>
        </form>
      </section>
      <section className="card p-5">
        <h2 className="font-bold mb-3">Your requests</h2>
        {!tickets ? <Loading /> : tickets.length === 0 ? <Empty title="No requests yet" /> :
          <ul className="space-y-3 text-sm">{tickets.map(t => <li key={t.id} className="border rounded-lg p-3"><div className="flex justify-between"><span className="font-semibold">{t.subject}</span><span className="text-xs">{orderStatusLabel(t.status)}</span></div><div className="text-gray-600 mt-1">{t.message}</div><div className="text-xs text-gray-400 mt-1">{formatDateTime(t.created_at)}</div></li>)}</ul>}
      </section>
    </div>
  );
}
