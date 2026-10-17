'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/client/api';
import { useAuth } from '@/lib/auth';
import { PageTitle, Field, Loading } from '@/components/ui';

const blank = { label: 'Home', name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', country: 'India', is_default: false };

export default function AccountPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<any[] | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});

  const load = () => api<any[]>('account.addresses').then(setAddresses).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^[1-9][0-9]{5}$/.test(editing.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code';
    if (!/^(\+91)?[6-9][0-9]{9}$/.test(editing.phone)) errs.phone = 'Enter a valid mobile number';
    setErr(errs);
    if (Object.keys(errs).length) return;
    try {
      const { id, user_id, created_at, ...data } = editing;
      void user_id; void created_at;
      await api('account.addressSave', { id, data: { ...data, phone: data.phone.startsWith('+91') ? data.phone : '+91' + data.phone } });
      toast.success('Address saved');
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    try { await api('account.addressDelete', { id }); toast.success('Address deleted'); load(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <PageTitle title="Profile" subtitle="Your contact details" />
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><dt className="text-gray-500">Name</dt><dd className="font-medium">{user?.name}</dd></div>
          <div><dt className="text-gray-500">Email</dt><dd className="font-medium">{user?.email}</dd></div>
          <div><dt className="text-gray-500">Mobile</dt><dd className="font-medium">{user?.phone || 'Not added'}</dd></div>
          <div><dt className="text-gray-500">Account type</dt><dd className="font-medium capitalize">{user?.role}{user?.seller_status ? ` · seller ${user.seller_status}` : ''}</dd></div>
        </dl>
        <p className="text-xs text-gray-500 mt-4">To change your email or password, contact support. Profile editing from this page is planned for the next release.</p>
      </section>

      <section className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Saved addresses</h2>
          <button className="btn-outline py-1.5 text-sm" onClick={() => { setEditing({ ...blank, name: user?.name || '' }); setErr({}); }}>+ Add address</button>
        </div>
        {!addresses && <Loading />}
        {addresses?.length === 0 && <p className="text-sm text-gray-500">No saved addresses yet.</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {addresses?.map(a => (
            <div key={a.id} className="border rounded-xl p-4 text-sm">
              <div className="flex justify-between"><span className="font-semibold">{a.name} <span className="text-xs bg-gray-100 px-1.5 rounded">{a.label}</span></span>{a.is_default && <span className="text-xs text-green-700">Default</span>}</div>
              <div className="text-gray-600 mt-1">{a.address_line1}{a.address_line2 ? ', ' + a.address_line2 : ''}, {a.city}, {a.state} – {a.pincode}</div>
              <div className="text-gray-600">{a.phone}</div>
              <div className="flex gap-3 mt-3">
                <button className="text-brand-700 hover:underline" onClick={() => { setEditing({ ...a }); setErr({}); }}>Edit</button>
                <button className="text-red-600 hover:underline" onClick={() => remove(a.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <form onSubmit={save} className="mt-6 border-t pt-6 grid md:grid-cols-2 gap-3" noValidate>
            <Field label="Full name" id="n"><input id="n" className="input-field" required value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Mobile" id="p" error={err.phone}><input id="p" className="input-field" required value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Address" id="l1"><input id="l1" className="input-field" required value={editing.address_line1} onChange={e => setEditing({ ...editing, address_line1: e.target.value })} /></Field></div>
            <div className="md:col-span-2"><Field label="Landmark" id="l2"><input id="l2" className="input-field" value={editing.address_line2 || ''} onChange={e => setEditing({ ...editing, address_line2: e.target.value })} /></Field></div>
            <Field label="City" id="c"><input id="c" className="input-field" required value={editing.city} onChange={e => setEditing({ ...editing, city: e.target.value })} /></Field>
            <Field label="State" id="s"><input id="s" className="input-field" required value={editing.state} onChange={e => setEditing({ ...editing, state: e.target.value })} /></Field>
            <Field label="PIN code" id="pc" error={err.pincode}><input id="pc" className="input-field" required maxLength={6} inputMode="numeric" value={editing.pincode} onChange={e => setEditing({ ...editing, pincode: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Label" id="lb"><select id="lb" className="input-field" value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })}><option>Home</option><option>Work</option><option>Other</option></select></Field>
            <label className="text-sm flex gap-2 items-center md:col-span-2"><input type="checkbox" checked={!!editing.is_default} onChange={e => setEditing({ ...editing, is_default: e.target.checked })} /> Make default address</label>
            <div className="md:col-span-2 flex gap-2"><button className="btn-primary">Save address</button><button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
