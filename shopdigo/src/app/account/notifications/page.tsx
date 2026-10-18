'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { Loading, Empty, PageTitle } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import { useUIStore } from '@/lib/store';

export default function NotificationsPage() {
  const [data, setData] = useState<any>(null);
  const refresh = useUIStore(s => s.refreshCounts);
  const load = () => api<any>('account.notifications').then(setData).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const read = async (id: string) => { await api('account.notificationRead', { id }); load(); refresh(true); };
  if (!data) return <Loading />;
  if (data.items.length === 0) return <Empty title="No notifications">Order and account updates will appear here.</Empty>;
  return (
    <div>
      <PageTitle title="Notifications" subtitle={`${data.unread} unread`} />
      <ul className="space-y-2">
        {data.items.map((n: any) => (
          <li key={n.id} className={`card p-4 flex gap-3 ${n.is_read ? 'opacity-70' : 'border-l-4 border-l-brand-600'}`}>
            <div className="flex-1">
              <div className="font-semibold text-sm">{n.title}</div>
              <div className="text-sm text-gray-600">{n.message}</div>
              <div className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</div>
              {n.link_url && <Link href={n.link_url} className="text-xs text-brand-700 hover:underline" onClick={() => read(n.id)}>View</Link>}
            </div>
            {!n.is_read && <button onClick={() => read(n.id)} className="text-xs text-gray-600 hover:underline whitespace-nowrap">Mark read</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
