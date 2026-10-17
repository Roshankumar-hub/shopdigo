import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatPrice(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

export function discountPercent(mrp: number, price: number): number {
  if (mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff/1000), m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d > 30) return formatDate(iso);
  if (d > 0) return `${d} day${d>1?'s':''} ago`;
  if (h > 0) return `${h} hour${h>1?'s':''} ago`;
  if (m > 0) return `${m} minute${m>1?'s':''} ago`;
  return 'just now';
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

export function generateStarRating(rating: number) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half?1:0);
  return { full, half, empty };
}

export function orderStatusLabel(status: string): string {
  const labels: Record<string,string> = {
    placed: 'Order Placed', confirmed: 'Confirmed', processing: 'Processing',
    packed: 'Packed', shipped: 'Shipped', out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered', cancelled: 'Cancelled', return_requested: 'Return Requested',
    returned: 'Returned', refunded: 'Refunded', pending_approval: 'Pending Approval',
    approved: 'Approved', rejected: 'Rejected', suspended: 'Suspended',
    pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded_payment: 'Refunded',
    partially_refunded: 'Partially Refunded',
  };
  return labels[status] || status.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function orderStatusColor(status: string): string {
  const colors: Record<string,string> = {
    placed: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-yellow-100 text-yellow-700',
    packed: 'bg-orange-100 text-orange-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    out_for_delivery: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    return_requested: 'bg-amber-100 text-amber-700',
    returned: 'bg-gray-100 text-gray-700',
    refunded: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

export function classNames(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
