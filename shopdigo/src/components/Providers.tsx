'use client';

import { AuthProvider, useAuth } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useUIStore } from '@/lib/store';
import AppBoot from '@/components/AppBoot';

// Waits for the session check first, so counts are never loaded for a stale logged-out state.
function CountSync() {
  const { user, loading } = useAuth();
  const refresh = useUIStore(s => s.refreshCounts);
  useEffect(() => { if (!loading) refresh(!!user); }, [user, loading, refresh]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CountSync />
      <AppBoot />
      {children}
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '10px', fontSize: '14px' } }} />
    </AuthProvider>
  );
}
