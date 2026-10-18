'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { postJSON } from './client/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'seller' | 'admin';
  seller_id: string | null;
  seller_status: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  /** True when the last session check could not reach the server. The user is not cleared, so a signed-in user is not shown as signed out. */
  authError: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: { name: string; email: string; password: string; phone?: string; agreedTerms: true }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error(`Session check failed (${res.status})`);
      const json = await res.json();
      setUser(json.data ?? null);
      setAuthError(false);
      return (json.data ?? null) as AuthUser | null;
    } catch {
      setAuthError(true);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const u = await postJSON<AuthUser>('/api/auth/login', { email, password });
    setUser(u);
    return u;
  };

  const register = async (data: any) => {
    const u = await postJSON<AuthUser>('/api/auth/register', data);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await postJSON('/api/auth/logout');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, authError, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
