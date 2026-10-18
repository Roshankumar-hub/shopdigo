'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RequireAuth } from '@/components/ui';

const tabs = [
  ['/account', 'Profile & Addresses'], ['/account/orders', 'Orders'], ['/account/wishlist', 'Wishlist'],
  ['/account/notifications', 'Notifications'], ['/account/support', 'Support'],
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <RequireAuth>
      <div className="container-custom py-6">
        <nav aria-label="Account" className="flex gap-2 overflow-x-auto no-scrollbar mb-6 border-b">
          {tabs.map(([href, label]) => {
            const active = href === '/account' ? pathname === '/account' : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>{label}</Link>
            );
          })}
        </nav>
        {children}
      </div>
    </RequireAuth>
  );
}
