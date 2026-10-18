'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  MagnifyingGlassIcon, ShoppingCartIcon, HeartIcon, UserCircleIcon, Bars3Icon, XMarkIcon, BellIcon, ClockIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';
import Logo from './Logo';
import ProductImage from './ProductImage';
import { useAuth } from '@/lib/auth';
import { useUIStore } from '@/lib/store';
import { api } from '@/lib/client/api';

const CATEGORY_LINKS = [
  { href: '/search?category=electronics', label: 'Electronics' },
  { href: '/search?category=fashion', label: 'Fashion' },
  { href: '/search?category=home-kitchen', label: 'Home & Kitchen' },
  { href: '/search?category=beauty', label: 'Beauty' },
  { href: '/search?category=grocery', label: 'Grocery' },
  { href: '/search?category=books', label: 'Books' },
  { href: '/search?category=sports', label: 'Sports' },
];

function Badge({ n, tone }: { n: number; tone: 'brand' | 'accent' }) {
  if (n <= 0) return null;
  return (
    <span className={`absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${tone === 'accent' ? 'bg-accent-600' : 'bg-brand-600'}`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount, wishlistCount, unread, mobileMenuOpen, setMobileMenuOpen, recentSearches, addRecentSearch } = useUIStore();
  const [q, setQ] = useState('');
  const [suggest, setSuggest] = useState<any[]>([]);
  const [focus, setFocus] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileMenuOpen(false); setAcctOpen(false); setFocus(false); }, [pathname, setMobileMenuOpen]);

  useEffect(() => {
    if (!q.trim()) { setSuggest([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      api<any>('catalog.search', { q: q.trim() })
        .then(r => { if (!cancelled) setSuggest(r.items.slice(0, 5)); })
        .catch(() => { if (!cancelled) setSuggest([]); });
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocus(false);
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAcctOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setFocus(false); setAcctOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  const submit = (term: string) => {
    const t = term.trim();
    if (!t) return;
    addRecentSearch(t);
    setFocus(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const onLogout = async () => {
    await logout();
    router.push('/');
  };

  const searchBox = (id: string, mobile: boolean) => (
    <form onSubmit={e => { e.preventDefault(); submit(q); }} role="search" className="relative">
      <label htmlFor={id} className="sr-only">Search products</label>
      <div className="flex items-center rounded-lg border border-gray-300 bg-white transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30">
        <MagnifyingGlassIcon className="ml-3 h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          autoComplete="off"
          placeholder={mobile ? 'Search products and brands' : 'Search for phones, shoes, books and more'}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-500"
        />
        <button type="submit" className="m-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">Search</button>
      </div>
    </form>
  );

  const suggestions = focus && (q.trim() || recentSearches.length > 0) && (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-float">
      {!q.trim() && (
        <div className="p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500"><ClockIcon className="h-3.5 w-3.5" aria-hidden="true" /> Recent searches</div>
          {recentSearches.map(s => (
            <button key={s} type="button" onClick={() => submit(s)} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50">{s}</button>
          ))}
        </div>
      )}
      {q.trim() && suggest.map(p => (
        <Link key={p.id} href={`/product/${p.slug}`} onClick={() => { addRecentSearch(q); setFocus(false); }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
          <div className="h-10 w-8 shrink-0 overflow-hidden rounded bg-gray-100"><ProductImage src={p.images?.[0]?.url} alt={p.name} /></div>
          <span className="line-clamp-1 text-sm text-gray-800">{p.name}</span>
        </Link>
      ))}
      {q.trim() && <button type="button" onClick={() => submit(q)} className="w-full border-t px-3 py-2.5 text-left text-sm font-medium text-brand-700 hover:bg-brand-50">Search for “{q.trim()}”</button>}
    </div>
  );

  return (
    <header className="z-40 border-b border-gray-200 bg-white md:sticky md:top-0">
      <div className="container-custom flex items-center gap-3 py-3 md:gap-6">
        <button type="button" className="-ml-2 rounded-lg p-2 md:hidden" aria-label="Open menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}>
          <Bars3Icon className="h-6 w-6 text-gray-800" aria-hidden="true" />
        </button>
        <Logo size="sm" />
        <div ref={boxRef} className="relative hidden max-w-2xl flex-1 sm:block">
          {searchBox('site-search', false)}
          {suggestions}
        </div>
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <div ref={acctRef} className="relative hidden md:block">
            <button type="button" onClick={() => setAcctOpen(o => !o)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100" aria-expanded={acctOpen} aria-haspopup="menu">
              <UserCircleIcon className="h-7 w-7 text-gray-600" aria-hidden="true" />
              <span className="leading-tight">
                <span className="block text-[11px] text-gray-500">{user ? `Hi, ${user.name.split(' ')[0]}` : 'Hello, sign in'}</span>
                <span className="flex items-center gap-0.5 font-semibold text-gray-900">Account <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" /></span>
              </span>
            </button>
            {acctOpen && (
              <div role="menu" className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-gray-200 bg-white py-2 shadow-float">
                {user ? (
                  <>
                    <Link role="menuitem" href="/account" className="block px-4 py-2 text-sm hover:bg-gray-50">My profile & addresses</Link>
                    <Link role="menuitem" href="/account/orders" className="block px-4 py-2 text-sm hover:bg-gray-50">My orders</Link>
                    <Link role="menuitem" href="/account/notifications" className="block px-4 py-2 text-sm hover:bg-gray-50">
                      Notifications {unread > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{unread}</span>}
                    </Link>
                    <Link role="menuitem" href="/account/support" className="block px-4 py-2 text-sm hover:bg-gray-50">Support tickets</Link>
                    {user.seller_id ? <Link role="menuitem" href="/seller" className="block px-4 py-2 text-sm hover:bg-gray-50">Seller centre</Link> : <Link role="menuitem" href="/seller/register" className="block px-4 py-2 text-sm hover:bg-gray-50">Become a seller</Link>}
                    {user.role === 'admin' && <Link role="menuitem" href="/admin" className="block px-4 py-2 text-sm hover:bg-gray-50">Admin dashboard</Link>}
                    <button role="menuitem" onClick={onLogout} className="block w-full border-t px-4 py-2 pt-2.5 text-left text-sm text-red-600 hover:bg-gray-50">Log out</button>
                  </>
                ) : (
                  <Link role="menuitem" href="/login" className="block px-4 py-2 text-sm font-medium text-brand-700 hover:bg-gray-50">Log in / register</Link>
                )}
              </div>
            )}
          </div>
          <Link href="/account/wishlist" aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ''}`} className="relative rounded-lg p-2 hover:bg-gray-100">
            <HeartIcon className="h-6 w-6 text-gray-800" aria-hidden="true" />
            <Badge n={wishlistCount} tone="brand" />
          </Link>
          <Link href="/account/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative rounded-lg p-2 hover:bg-gray-100 md:hidden">
            <BellIcon className="h-6 w-6 text-gray-800" aria-hidden="true" />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </Link>
          <Link href="/cart" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`} className="relative flex items-center gap-1.5 rounded-lg p-2 hover:bg-gray-100">
            <ShoppingCartIcon className="h-6 w-6 text-gray-800" aria-hidden="true" />
            <span className="hidden text-sm font-semibold text-gray-900 md:inline">Cart</span>
            <Badge n={cartCount} tone="accent" />
          </Link>
        </div>
      </div>

      {/* Mobile: full-width search on its own row */}
      <div className="relative px-4 pb-3 sm:hidden">
        {searchBox('mobile-search', true)}
        {suggestions}
      </div>

      {/* Category navigation (desktop) */}
      <nav aria-label="Categories" className="hidden border-t border-gray-100 bg-white md:block">
        <div className="container-custom no-scrollbar flex gap-6 overflow-x-auto py-2 text-sm">
          {CATEGORY_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap font-medium text-gray-700 hover:text-brand-700">{l.label}</Link>
          ))}
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="absolute bottom-0 left-0 top-0 w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-float animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <Logo size="sm" />
              <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 hover:bg-gray-100"><XMarkIcon className="h-6 w-6" aria-hidden="true" /></button>
            </div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Shop by category</div>
            <div className="flex flex-col text-[15px]">
              {CATEGORY_LINKS.map(l => <Link key={l.href} href={l.href} className="border-b border-gray-100 py-3 text-gray-800">{l.label}</Link>)}
            </div>
            <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Your account</div>
            <div className="flex flex-col text-[15px]">
              <Link href="/account/orders" className="border-b border-gray-100 py-3">My orders</Link>
              <Link href="/account/wishlist" className="border-b border-gray-100 py-3">Wishlist</Link>
              <Link href="/account/support" className="border-b border-gray-100 py-3">Support</Link>
              {user && user.role !== 'admin' && <Link href={user.seller_id ? '/seller' : '/seller/register'} className="border-b border-gray-100 py-3">{user.seller_id ? 'Seller centre' : 'Sell on SHOPDIGO'}</Link>}
              {user?.role === 'admin' && <Link href="/admin" className="border-b border-gray-100 py-3">Admin dashboard</Link>}
              {user
                ? <button type="button" onClick={onLogout} className="py-3 text-left text-red-600">Log out</button>
                : <Link href="/login" className="py-3 font-semibold text-brand-700">Log in / register</Link>}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
