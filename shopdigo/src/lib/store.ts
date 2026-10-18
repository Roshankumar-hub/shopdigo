'use client';

import { create } from 'zustand';
import { api } from './client/api';

export type CountsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UIState {
  countsStatus: CountsStatus;
  pageReady: boolean;
  markPageReady: () => void;
  cartCount: number;
  wishlistCount: number;
  wishlistIds: string[];
  unread: number;
  refreshCounts: (loggedIn: boolean) => Promise<void>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  countsStatus: 'idle',
  pageReady: false,
  markPageReady: () => set({ pageReady: true }),
  cartCount: 0,
  wishlistCount: 0,
  wishlistIds: [],
  unread: 0,
  refreshCounts: async (loggedIn) => {
    if (!loggedIn) { set({ cartCount: 0, wishlistCount: 0, wishlistIds: [], unread: 0, countsStatus: 'ready' }); return; }
    set({ countsStatus: 'loading' });
    try {
      const [cart, wish, notes] = await Promise.all([
        api<any>('cart.get'), api<any[]>('wishlist.list'), api<any>('account.notifications'),
      ]);
      set({ cartCount: cart.cart.items.reduce((s: number, i: any) => s + i.quantity, 0), wishlistCount: wish.length, wishlistIds: wish.map((w: any) => w.product_id), unread: notes.unread, countsStatus: 'ready' });
    } catch { set({ countsStatus: 'error' }); }
  },
  mobileMenuOpen: false,
  setMobileMenuOpen: v => set({ mobileMenuOpen: v }),
  recentSearches: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('shopdigo_recent_searches') || '[]') : [],
  addRecentSearch: q => {
    const list = [q, ...get().recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    if (typeof window !== 'undefined') localStorage.setItem('shopdigo_recent_searches', JSON.stringify(list));
    set({ recentSearches: list });
  },
}));
