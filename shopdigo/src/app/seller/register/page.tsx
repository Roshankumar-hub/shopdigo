'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { useAuth } from '@/lib/auth';
import { useUIStore } from '@/lib/store';
import { PageTitle, Field, RequireAuth } from '@/components/ui';

const init = {
  store_name: '', store_description: '', business_name: '', contact_email: '', contact_phone: '',
  gstin: '', pan: '', pickup_address: '', pickup_city: '', pickup_state: '', pickup_pincode: '',
  bank_account_name: '', bank_account_number: '', bank_ifsc: '', bank_name: '',
  agreed_terms: false, agreed_privacy: false,
};

function SellerRegisterInner() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const refreshCounts = useUIStore(s => s.refreshCounts);
  const [f, setF] = useState<any>({ ...init, contact_email: user?.email || '' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!f.agreed_terms || !f.agreed_privacy) errs.push('Accept the seller agreement and privacy policy');
    if (f.gstin && !/^[0-9A-Z]{15}$/.test(f.gstin)) errs.push('GSTIN must be 15 characters');
    if (f.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(f.pan)) errs.push('PAN format is invalid (e.g. ABCDE1234F)');
    setErrors(errs);
    if (errs.length) return;
    setBusy(true);
    try {
      await api('seller.register', { ...f, gstin: f.gstin || '', pan: f.pan || '' });
      await refreshUser();
      await refreshCounts(true);
      toast.success('Application submitted for review');
      router.push('/seller');
    } catch (err: any) { setErrors([err.message]); } finally { setBusy(false); }
  };

  return (
    <div className="container-custom py-6 max-w-4xl">
      <PageTitle title="Sell on SHOPDIGO" subtitle="Register your business. Our team verifies your details before your store goes live. Nothing is charged to list products during verification." />
      <form onSubmit={submit} noValidate className="space-y-6">
        <section className="card p-5 grid md:grid-cols-2 gap-4">
          <h2 className="md:col-span-2 font-bold">Store details</h2>
          <Field label="Store name *" id="sn"><input id="sn" className="input-field" required value={f.store_name} onChange={e => set('store_name', e.target.value)} /></Field>
          <Field label="Legal business name *" id="bn"><input id="bn" className="input-field" required value={f.business_name} onChange={e => set('business_name', e.target.value)} /></Field>
          <div className="md:col-span-2"><Field label="Store description" id="sd"><textarea id="sd" rows={2} className="input-field" value={f.store_description} onChange={e => set('store_description', e.target.value)} /></Field></div>
          <Field label="Contact email *" id="ce"><input id="ce" type="email" className="input-field" required value={f.contact_email} onChange={e => set('contact_email', e.target.value)} /></Field>
          <Field label="Contact phone *" id="cp"><input id="cp" className="input-field" required placeholder="+919876543210" value={f.contact_phone} onChange={e => set('contact_phone', e.target.value)} /></Field>
        </section>
        <section className="card p-5 grid md:grid-cols-2 gap-4">
          <h2 className="md:col-span-2 font-bold">Tax & verification</h2>
          <Field label="GSTIN (15 chars, recommended)" id="gst"><input id="gst" className="input-field uppercase" maxLength={15} value={f.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} /></Field>
          <Field label="PAN *" id="pan"><input id="pan" className="input-field uppercase" maxLength={10} required value={f.pan} onChange={e => set('pan', e.target.value.toUpperCase())} /></Field>
          <p className="md:col-span-2 text-xs text-gray-500">Verification uses the details you provide. Automatic GSTIN/PAN verification against government databases is not connected in this build; an administrator reviews submissions manually.</p>
        </section>
        <section className="card p-5 grid md:grid-cols-2 gap-4">
          <h2 className="md:col-span-2 font-bold">Pickup address</h2>
          <div className="md:col-span-2"><Field label="Address *" id="pa"><input id="pa" className="input-field" required value={f.pickup_address} onChange={e => set('pickup_address', e.target.value)} /></Field></div>
          <Field label="City *" id="pc"><input id="pc" className="input-field" required value={f.pickup_city} onChange={e => set('pickup_city', e.target.value)} /></Field>
          <Field label="State *" id="ps"><input id="ps" className="input-field" required value={f.pickup_state} onChange={e => set('pickup_state', e.target.value)} /></Field>
          <Field label="PIN code *" id="pp"><input id="pp" className="input-field" required maxLength={6} inputMode="numeric" value={f.pickup_pincode} onChange={e => set('pickup_pincode', e.target.value.replace(/\D/g, ''))} /></Field>
        </section>
        <section className="card p-5 grid md:grid-cols-2 gap-4">
          <h2 className="md:col-span-2 font-bold">Settlement bank account</h2>
          <Field label="Account holder name *" id="ban"><input id="ban" className="input-field" required value={f.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} /></Field>
          <Field label="Account number *" id="bac"><input id="bac" className="input-field" required value={f.bank_account_number} onChange={e => set('bank_account_number', e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="IFSC *" id="bif"><input id="bif" className="input-field uppercase" required maxLength={11} value={f.bank_ifsc} onChange={e => set('bank_ifsc', e.target.value.toUpperCase())} /></Field>
          <Field label="Bank name *" id="bnm"><input id="bnm" className="input-field" required value={f.bank_name} onChange={e => set('bank_name', e.target.value)} /></Field>
        </section>
        <section className="card p-5 space-y-3 text-sm">
          <label className="flex gap-2"><input type="checkbox" checked={f.agreed_terms} onChange={e => set('agreed_terms', e.target.checked)} /> I accept the <Link href="/policies/seller" className="underline">Seller Agreement and Seller Policy</Link>, including commission and settlement terms.</label>
          <label className="flex gap-2"><input type="checkbox" checked={f.agreed_privacy} onChange={e => set('agreed_privacy', e.target.checked)} /> I consent to SHOPDIGO processing my business details as described in the <Link href="/policies/privacy" className="underline">Privacy Policy</Link>.</label>
        </section>
        {errors.length > 0 && <div role="alert" className="card p-4 border-red-300 bg-red-50 text-sm text-red-700">{errors.map(e => <div key={e}>• {e}</div>)}</div>}
        <button disabled={busy} className="btn-secondary px-8 py-3">{busy ? 'Submitting…' : 'Submit application'}</button>
      </form>
    </div>
  );
}

export default function SellerRegisterPage() {
  return <RequireAuth><SellerRegisterInner /></RequireAuth>;
}
