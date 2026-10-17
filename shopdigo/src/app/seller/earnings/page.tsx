'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { Loading, Empty } from '@/components/ui';
import { formatPrice, formatDateTime } from '@/lib/utils';

export default function EarningsPage() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api('seller.earnings').then(setD).catch(e => toast.error(e.message)); }, []);
  if (!d) return <Loading />;
  const s = d.summary;
  const rows = [
    ['Gross sales', s.gross_sales], ['Marketplace commission', s.commission], ['Refunds', s.refunds], ['Adjustments', s.adjustments], ['Payouts recorded', s.payouts],
  ];
  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="font-bold mb-3">Earnings breakdown</h2>
        <table className="w-full text-sm"><tbody>
          {rows.map(([k, v]) => <tr key={k as string} className="border-b last:border-0"><th className="py-2 text-left font-medium text-gray-600">{k}</th><td className="py-2 text-right">{formatPrice(Number(v))}</td></tr>)}
          <tr><th className="py-2 text-left font-bold">Net ledger balance</th><td className="py-2 text-right font-bold">{formatPrice(s.net_payable)}</td></tr>
        </tbody></table>
        <p className="text-xs text-gray-500 mt-3">Figures are ledger records of paid orders. They are not bank balances. Money is paid to your account only via a settlement recorded as processed by SHOPDIGO.</p>
      </section>
      <section className="card p-5">
        <h2 className="font-bold mb-3">Settlements</h2>
        {d.settlements.length === 0 ? <Empty title="No settlements yet">Settlement statements appear here once SHOPDIGO processes a payout cycle.</Empty> :
          <ul className="divide-y text-sm">{d.settlements.map((x: any) => <li key={x.id} className="py-2 flex justify-between"><span>{formatDateTime(x.created_at)} · {x.status}</span><span>{formatPrice(x.amount)}</span></li>)}</ul>}
      </section>
      <section className="card p-5">
        <h2 className="font-bold mb-3">Transaction ledger</h2>
        {d.ledger.length === 0 ? <Empty title="No transactions yet">Ledger entries are created when orders are paid.</Empty> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500"><tr><th className="py-2">Date</th><th>Type</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
            <tbody>{d.ledger.map((l: any) => (
              <tr key={l.id} className="border-t"><td className="py-2 whitespace-nowrap">{formatDateTime(l.created_at)}</td><td className="capitalize">{l.type}</td><td>{l.description}</td><td className={`text-right ${l.amount < 0 ? 'text-red-600' : ''}`}>{formatPrice(l.amount)}</td></tr>
            ))}</tbody>
          </table></div>}
      </section>
    </div>
  );
}
