'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { useAuth } from '@/lib/auth';
import { Field, PageTitle } from '@/components/ui';

const FAQ = [
  ['How do I track my order?', 'Go to Account → Orders and open the order. The timeline shows each status update. Courier tracking appears once the seller adds a tracking number.'],
  ['How do I cancel or return an item?', 'Open the order and choose Cancel item (before it ships) or Request return (within the return window shown on the product).'],
  ['When is my refund processed?', 'Refunds for online payments are sent to the payment gateway by an administrator. SHOPDIGO shows a refund as completed only after the gateway confirms it.'],
  ['Is Cash on Delivery available?', 'COD is shown at checkout for eligible items and PIN codes.'],
  ['How do I become a seller?', 'Use Sell on SHOPDIGO, submit your business, tax and bank details, and wait for administrator approval. You can list products once approved.'],
];

export default function HelpPage() {
  const { user } = useAuth();
  const [f, setF] = useState({ subject: '', message: '', category: 'other' });
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api('ticket.create', f); setSent(true); toast.success('Message sent to support'); }
    catch (err: any) { toast.error(err.message); }
  };
  return (
    <div className="container-custom py-8 max-w-4xl">
      <PageTitle title="Help Centre & Contact" subtitle="Find quick answers, or send us a message." />
      <section className="space-y-3 mb-10">
        {FAQ.map(([q, a]) => (
          <details key={q} className="card p-4 group">
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="text-sm text-gray-600 mt-2">{a}</p>
          </details>
        ))}
      </section>
      <section className="card p-6" aria-labelledby="contact-h">
        <h2 id="contact-h" className="font-bold text-lg">Contact support</h2>
        <p className="text-sm text-gray-600 mt-1">Support: <a className="underline" href="mailto:support@shopdigo.example">support@shopdigo.example</a> (placeholder address; set your own in the README).</p>
        {!user ? (
          <p className="mt-4 text-sm">Please <Link href="/login?next=/help" className="text-brand-700 underline">log in</Link> to send a support ticket. This lets us link your request to your orders.</p>
        ) : sent ? (
          <p className="mt-4 text-green-700 text-sm">Thanks. Your ticket is in the queue. Track it under Account → Support.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <Field label="Topic" id="hc"><select id="hc" className="input-field" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}><option value="order">Order</option><option value="payment">Payment / refund</option><option value="product">Product</option><option value="seller">Seller</option><option value="other">Other</option></select></Field>
            <Field label="Subject" id="hs"><input id="hs" required minLength={3} maxLength={120} className="input-field" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} /></Field>
            <Field label="Message" id="hm"><textarea id="hm" required minLength={10} maxLength={3000} rows={4} className="input-field" value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></Field>
            <button className="btn-secondary">Send message</button>
          </form>
        )}
      </section>
    </div>
  );
}
