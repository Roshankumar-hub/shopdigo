'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { useUIStore } from '@/lib/store';
import Logo from '@/components/Logo';
import { Field } from '@/components/ui';
import AuthShell from '@/components/auth/AuthShell';
import ShopperIllustration from '@/components/auth/ShopperIllustration';
import PasswordField from '@/components/auth/PasswordField';
import { emailError, loginPasswordError } from '@/lib/auth-validation';

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { login } = useAuth();
  const refreshCounts = useUIStore(s => s.refreshCounts);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({});
  const next = sp.get('next') || '/';
  const registerHref = `/register?next=${encodeURIComponent(next)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const eErr = emailError(email);
    const pErr = loginPasswordError(password);
    setFieldErr({ email: eErr, password: pErr });
    if (eErr || pErr) {
      document.getElementById(eErr ? 'email' : 'password')?.focus();
      return;
    }
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      await refreshCounts(true);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      router.push(next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl bg-white/95 p-6 shadow-float ring-1 ring-white/70 backdrop-blur-sm sm:p-8">
      <div className="mb-6 flex justify-center"><Logo size="md" withTagline /></div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Log in to your account</h1>
      <p className="mt-1 text-sm text-gray-600">See your orders, saved addresses and cart.</p>

      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <Field label="Email" id="email" error={fieldErr.email}>
          <input
            id="email" type="email" autoComplete="email" value={email} aria-invalid={!!fieldErr.email || undefined}
            onChange={e => { setEmail(e.target.value); if (fieldErr.email) setFieldErr(f => ({ ...f, email: undefined })); }}
            className="auth-input" placeholder="you@example.com"
          />
        </Field>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <Link href="/help" className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline">Forgot password?</Link>
          </div>
          <PasswordField
            id="password" value={password} autoComplete="current-password" invalid={!!fieldErr.password}
            describedBy={fieldErr.password ? 'password-error' : undefined}
            onChange={v => { setPassword(v); if (fieldErr.password) setFieldErr(f => ({ ...f, password: undefined })); }}
          />
          {fieldErr.password && <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">{fieldErr.password}</p>}
        </div>

        {err && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:translate-y-0 disabled:opacity-60"
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-gray-400" aria-hidden="true">
        <span className="h-px flex-1 bg-gray-200" />New to SHOPDIGO?<span className="h-px flex-1 bg-gray-200" />
      </div>
      <Link href={registerHref} className="flex w-full items-center justify-center rounded-xl border-2 border-brand-600 px-4 py-3 font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200">
        Create account
      </Link>

      <p className="mt-6 text-center text-xs text-gray-500">
        Password reset by email is not available yet. Contact support from the <Link href="/help" className="underline hover:text-gray-700">Help centre</Link>.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      heading="Welcome back to SHOPDIGO"
      subheading="Everything you need, all in one place. Log in to pick up where you left off."
      art={<ShopperIllustration className="h-auto w-full" />}
      form={<Suspense fallback={<div className="mx-auto h-96 w-full max-w-md rounded-3xl bg-white/95" />}><LoginForm /></Suspense>}
    />
  );
}
