'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { orderStatusLabel, orderStatusColor } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${orderStatusColor(status)}`}>{orderStatusLabel(status)}</span>;
}

export function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'admin' | 'seller' }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login?next=' + encodeURIComponent(window.location.pathname));
    else if (role === 'admin' && user.role !== 'admin') router.replace('/');
    else if (role === 'seller' && !user.seller_id) router.replace('/seller/register');
  }, [user, loading, role, router]);
  if (loading) return <Loading />;
  if (!user) return <Loading label="Redirecting to login…" />;
  if (role === 'admin' && user.role !== 'admin') return <Loading label="Access denied" />;
  if (role === 'seller' && !user.seller_id) return <Loading label="Seller account required" />;
  return <>{children}</>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="container-custom py-16 text-center text-gray-500" role="status">
      <div className="inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3" />
      <div className="text-sm">{label}</div>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="card p-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="text-sm text-gray-500 mt-1">{children}</div>}
      {action && <Link href={action.href} className="btn-primary inline-block mt-4">{action.label}</Link>}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold font-display">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function Field({ label, error, children, id }: { label: string; error?: string; children: React.ReactNode; id?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  );
}
