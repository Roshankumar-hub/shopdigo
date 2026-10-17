'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';
import { useUIStore } from '@/lib/store';
import Logo from '@/components/Logo';
import { Field } from '@/components/ui';
import AuthShell from '@/components/auth/AuthShell';
import ShopperIllustration from '@/components/auth/ShopperIllustration';
import PasswordField from '@/components/auth/PasswordField';
import {
  emailError, nameError, newPasswordError, normalisePhone, passwordChecks, phoneError,
} from '@/lib/auth-validation';

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'password' | 'terms', string>>;

function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { register } = useAuth();
  const refreshCounts = useUIStore(s => s.refreshCounts);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const checks = passwordChecks(form.password);
  const clear = (k: keyof Errors) => setErrors(e => ({ ...e, [k]: undefined }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const next: Errors = {
      name: nameError(form.name),
      email: emailError(form.email),
      phone: phoneError(form.phone),
      password: newPasswordError(form.password),
      terms: terms ? undefined : 'Please accept the Terms of Use and Privacy Policy to continue.',
    };
    setErrors(next);
    const firstBad = (['name', 'email', 'phone', 'password', 'terms'] as const).find(k => next[k]);
    if (firstBad) {
      document.getElementById(firstBad === 'terms' ? 'terms' : firstBad)?.focus();
      return;
    }
    setBusy(true);
    try {
      const u = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, phone: normalisePhone(form.phone), agreedTerms: true });
      await refreshCounts(true);
      toast.success(`Welcome to SHOPDIGO, ${u.name.split(' ')[0]}!`);
      const dest = sp.get('next') || '/';
      router.push(dest.startsWith('/') && !dest.startsWith('//') ? dest : '/');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const loginHref = `/login${sp.get('next') ? `?next=${encodeURIComponent(sp.get('next') as string)}` : ''}`;

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl bg-white/95 p-6 shadow-float ring-1 ring-white/70 backdrop-blur-sm sm:p-8">
      <div className="mb-6 flex justify-center"><Logo size="md" withTagline /></div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create your account</h1>
      <p className="mt-1 text-sm text-gray-600">Save your cart, track orders and check out faster.</p>

      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <Field label="Full name" id="name" error={errors.name}>
          <input id="name" value={form.name} autoComplete="name" aria-invalid={!!errors.name || undefined}
            onChange={e => { setForm({ ...form, name: e.target.value }); clear('name'); }} className="auth-input" />
        </Field>
        <Field label="Email" id="email" error={errors.email}>
          <input id="email" type="email" value={form.email} autoComplete="email" aria-invalid={!!errors.email || undefined}
            onChange={e => { setForm({ ...form, email: e.target.value }); clear('email'); }} className="auth-input" placeholder="you@example.com" />
        </Field>
        <Field label="Mobile number (optional)" id="phone" error={errors.phone}>
          <input id="phone" inputMode="tel" value={form.phone} autoComplete="tel" aria-invalid={!!errors.phone || undefined}
            onChange={e => { setForm({ ...form, phone: e.target.value }); clear('phone'); }} placeholder="98765 43210" className="auth-input" />
        </Field>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <PasswordField id="password" value={form.password} autoComplete="new-password" invalid={!!errors.password}
            describedBy="password-rules" onChange={v => { setForm({ ...form, password: v }); clear('password'); }} />
          <ul id="password-rules" className="mt-2 grid gap-1 text-xs text-gray-500 sm:grid-cols-3" aria-label="Password requirements">
            {[
              ['length', 'At least 8 characters'], ['letter', 'Includes a letter'], ['number', 'Includes a number'],
            ].map(([k, label]) => {
              const met = checks[k as keyof typeof checks];
              return (
                <li key={k} className={`flex items-center gap-1.5 transition-colors ${met ? 'text-emerald-700' : ''}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full ${met ? 'bg-emerald-100' : 'bg-gray-100'}`} aria-hidden="true">
                    {met && <CheckIcon className="h-3 w-3" />}
                  </span>
                  {label}
                </li>
              );
            })}
          </ul>
          {errors.password && <p role="alert" className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>

        <div>
          <label className="flex gap-3 text-sm text-gray-700">
            <input id="terms" type="checkbox" checked={terms} aria-invalid={!!errors.terms || undefined}
              onChange={e => { setTerms(e.target.checked); clear('terms'); }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <span>I agree to the <Link href="/policies/terms" className="font-medium text-brand-700 underline">Terms of Use</Link> and <Link href="/policies/privacy" className="font-medium text-brand-700 underline">Privacy Policy</Link>.</span>
          </label>
          {errors.terms && <p role="alert" className="mt-1 text-xs text-red-600">{errors.terms}</p>}
        </div>

        {err && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:translate-y-0 disabled:opacity-60"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href={loginHref} className="font-semibold text-brand-700 hover:underline">Log in</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell
      heading="Join SHOPDIGO"
      subheading="Create a free account to save your cart, track orders and check out faster."
      art={<ShopperIllustration className="h-auto w-full" />}
      form={<Suspense fallback={<div className="mx-auto h-96 w-full max-w-md rounded-3xl bg-white/95" />}><RegisterForm /></Suspense>}
    />
  );
}
