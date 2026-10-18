'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RequireAuth, PageTitle, Empty } from '@/components/ui';
import { useAuth } from '@/lib/auth';

function Gate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user?.seller_id) return null;
  if (user.seller_status !== 'approved') {
    const msg = user.seller_status === 'pending' ? 'Your seller application is under review. You will be notified once an administrator approves it. Product listing and order management unlock after approval.'
      : user.seller_status === 'rejected' ? 'Your seller application was not approved. Check your notifications for the reason, or contact support.'
      : 'Your seller account is suspended. Contact support for details.';
    return <div className="container-custom py-10"><Empty title={`Seller account: ${user.seller_status}`}>{msg}</Empty></div>;
  }
  return <>{children}</>;
}

const tabs = [['/seller', 'Dashboard'], ['/seller/orders', 'Orders'], ['/seller/products', 'Products'], ['/seller/earnings', 'Earnings'], ['/seller/support', 'Support']];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/seller/register') return <>{children}</>;
  return (
    <RequireAuth role="seller">
      <Gate>
        <div className="container-custom py-6">
          <PageTitle title="Seller Centre" />
          <nav aria-label="Seller" className="flex gap-2 overflow-x-auto no-scrollbar mb-6 border-b">
            {tabs.map(([href, label]) => {
              const active = href === '/seller' ? pathname === '/seller' : pathname.startsWith(href);
              return <Link key={href} href={href} className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>{label}</Link>;
            })}
          </nav>
          {children}
        </div>
      </Gate>
    </RequireAuth>
  );
}
