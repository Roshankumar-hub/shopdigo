'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, postJSON } from '@/lib/client/api';
import { openRazorpayCheckout } from '@/lib/checkout';
import { useAuth } from '@/lib/auth';
import { useUIStore } from '@/lib/store';
import { RequireAuth, Loading, Empty, PageTitle, Field } from '@/components/ui';
import { formatPrice } from '@/lib/utils';

const EMPTY_ADDR = { label: 'Home', name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', country: 'India', is_default: false };

function CheckoutInner() {
  const router = useRouter();
  const { user } = useAuth();
  const refreshCounts = useUIStore(s => s.refreshCounts);
  const [addresses, setAddresses] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [showAddr, setShowAddr] = useState(false);
  const [addrForm, setAddrForm] = useState<any>({ ...EMPTY_ADDR, name: user?.name || '', phone: user?.phone?.replace('+91', '') || '' });
  const [addrErr, setAddrErr] = useState<Record<string, string>>({});
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>();
  const [quote, setQuote] = useState<any>(null);
  const [method, setMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [placing, setPlacing] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  // one idempotency key per checkout attempt; reused on retries so the server never double-creates
  const [idemKey] = useState(() => `chk_${crypto.randomUUID()}`);

  const loadAddresses = async () => {
    const list = await api<any[]>('account.addresses');
    setAddresses(list);
    setSelected(s => s || (list.find(a => a.is_default) || list[0])?.id || '');
    if (list.length === 0) setShowAddr(true);
  };

  useEffect(() => { loadAddresses().catch(e => toast.error(e.message)); }, []);

  const refreshQuote = async (code?: string) => {
    try {
      const q = await api<any>('cart.quote', { couponCode: code || undefined });
      setQuote(q);
      if (code && q.coupon_error) toast.error(q.coupon_error);
      if (code && q.coupon_applied) { setAppliedCoupon(q.coupon_applied); toast.success(`Coupon ${q.coupon_applied} applied`); }
    } catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { refreshQuote(appliedCoupon); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [appliedCoupon]);

  const selectedAddr = useMemo(() => addresses?.find(a => a.id === selected), [addresses, selected]);
  const hasBlocked = quote?.lines?.some((l: any) => !l.in_stock);
  const codBlocked = method === 'cod' && quote?.lines?.some((l: any) => !l.cod_available);

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^[1-9][0-9]{5}$/.test(addrForm.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code';
    if (!/^(\+91)?[6-9][0-9]{9}$/.test(addrForm.phone)) errs.phone = 'Enter a valid 10-digit mobile number';
    if (!addrForm.name || !addrForm.address_line1 || !addrForm.city || !addrForm.state) errs.form = 'Please fill all required fields';
    setAddrErr(errs);
    if (Object.keys(errs).length) return;
    try {
      const a = await api<any>('account.addressSave', { data: { ...addrForm, phone: addrForm.phone.startsWith('+91') ? addrForm.phone : '+91' + addrForm.phone } });
      toast.success('Address saved');
      setShowAddr(false);
      await loadAddresses();
      setSelected(a.id);
    } catch (e: any) { toast.error(e.message); }
  };

  const placeOrder = async () => {
    if (!selectedAddr) return toast.error('Please select a delivery address');
    setPlacing(true);
    setPaymentNote(null);
    try {
      const orderRes = await api<any>('order.create', { addressId: selectedAddr.id, paymentMethod: method, couponCode: appliedCoupon, idempotencyKey: idemKey });
      setPendingOrderId(orderRes.order.id);
      if (method === 'cod' || !orderRes.payment) {
        await refreshCounts(true);
        toast.success('Order placed!');
        router.push(`/account/orders/${orderRes.order.id}?placed=1`);
        return;
      }
      // Online payment: open Razorpay Checkout, then verify on the server.
      let result;
      try {
        result = await openRazorpayCheckout(orderRes.payment, { name: user?.name, email: user?.email, contact: selectedAddr.phone });
      } catch (err: any) {
        setPaymentNote(err.message);
        toast.error('Payment not completed');
        setPlacing(false);
        return;
      }
      const verified = await postJSON<any>('/api/payments/razorpay/verify', result);
      await refreshCounts(true);
      if (verified.payment_status === 'paid') {
        toast.success('Payment successful!');
        router.push(`/account/orders/${verified.order_id}?placed=1`);
      } else {
        setPaymentNote('Payment is being confirmed. We will update your order status shortly; check My Orders.');
        router.push(`/account/orders/${verified.order_id}`);
      }
    } catch (e: any) {
      toast.error(e.message);
      setPaymentNote(e.message);
    } finally {
      setPlacing(false);
    }
  };

  const retryPayment = async () => {
    if (!pendingOrderId) return;
    setPlacing(true);
    try {
      const r = await api<any>('order.retryPayment', { id: pendingOrderId });
      const result = await openRazorpayCheckout(r.payment, { name: user?.name, email: user?.email });
      const verified = await postJSON<any>('/api/payments/razorpay/verify', result);
      router.push(`/account/orders/${verified.order_id}?placed=1`);
    } catch (e: any) { toast.error(e.message); } finally { setPlacing(false); }
  };

  if (!addresses || !quote) return <Loading label="Preparing checkout…" />;
  if (quote.lines.length === 0 && !pendingOrderId) {
    return <div className="container-custom py-10"><Empty title="Nothing to checkout" action={{ href: '/', label: 'Continue shopping' }}>Your cart is empty.</Empty></div>;
  }

  return (
    <div className="container-custom py-6">
      <PageTitle title="Checkout" subtitle="Review your details and pay securely." />
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="addr-h">
            <div className="flex justify-between items-center mb-3">
              <h2 id="addr-h" className="font-bold">1. Delivery address</h2>
              {addresses.length > 0 && <button className="text-sm text-brand-700 font-medium hover:underline" onClick={() => setShowAddr(s => !s)}>{showAddr ? 'Cancel' : '+ Add new address'}</button>}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {addresses.map(a => (
                <label key={a.id} className={`border rounded-xl p-4 cursor-pointer text-sm ${selected === a.id ? 'border-brand-600 ring-1 ring-brand-600 bg-brand-50/40' : 'hover:border-gray-400'}`}>
                  <input type="radio" name="address" className="mr-2" checked={selected === a.id} onChange={() => setSelected(a.id)} />
                  <span className="font-semibold">{a.name}</span> <span className="text-xs bg-gray-100 px-1.5 rounded">{a.label}</span>
                  <div className="text-gray-600 mt-1">{a.address_line1}{a.address_line2 ? ', ' + a.address_line2 : ''}, {a.city}, {a.state} – <span className="font-medium">{a.pincode}</span></div>
                  <div className="text-gray-600">{a.phone}</div>
                </label>
              ))}
            </div>
            {showAddr && (
              <form onSubmit={saveAddress} className="grid md:grid-cols-2 gap-3 mt-4 border-t pt-4" noValidate>
                <Field label="Full name" id="a-name" error={addrErr.name}><input id="a-name" className="input-field" value={addrForm.name} onChange={e => setAddrForm({ ...addrForm, name: e.target.value })} required /></Field>
                <Field label="Mobile number" id="a-phone" error={addrErr.phone}><input id="a-phone" className="input-field" value={addrForm.phone} onChange={e => setAddrForm({ ...addrForm, phone: e.target.value })} placeholder="9876543210" required /></Field>
                <div className="md:col-span-2"><Field label="Address (house no., street, area)" id="a-l1"><input id="a-l1" className="input-field" value={addrForm.address_line1} onChange={e => setAddrForm({ ...addrForm, address_line1: e.target.value })} required /></Field></div>
                <div className="md:col-span-2"><Field label="Landmark (optional)" id="a-l2"><input id="a-l2" className="input-field" value={addrForm.address_line2} onChange={e => setAddrForm({ ...addrForm, address_line2: e.target.value })} /></Field></div>
                <Field label="City" id="a-city"><input id="a-city" className="input-field" value={addrForm.city} onChange={e => setAddrForm({ ...addrForm, city: e.target.value })} required /></Field>
                <Field label="State" id="a-state"><input id="a-state" className="input-field" value={addrForm.state} onChange={e => setAddrForm({ ...addrForm, state: e.target.value })} required /></Field>
                <Field label="PIN code" id="a-pin" error={addrErr.pincode}><input id="a-pin" className="input-field" inputMode="numeric" maxLength={6} value={addrForm.pincode} onChange={e => setAddrForm({ ...addrForm, pincode: e.target.value.replace(/\D/g, '') })} required /></Field>
                <Field label="Label" id="a-label"><select id="a-label" className="input-field" value={addrForm.label} onChange={e => setAddrForm({ ...addrForm, label: e.target.value })}><option>Home</option><option>Work</option><option>Other</option></select></Field>
                {addrErr.form && <p className="md:col-span-2 text-sm text-red-600">{addrErr.form}</p>}
                <div className="md:col-span-2"><button className="btn-primary">Save address</button></div>
              </form>
            )}
          </section>

          <section className="card p-5" aria-labelledby="pay-h">
            <h2 id="pay-h" className="font-bold mb-3">2. Payment method</h2>
            <div className="space-y-3">
              <label className={`flex gap-3 border rounded-xl p-4 cursor-pointer ${method === 'razorpay' ? 'border-brand-600 ring-1 ring-brand-600' : ''}`}>
                <input type="radio" name="pm" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')} />
                <div><div className="font-semibold">Pay online (UPI, Cards, Net Banking, Wallets)</div><div className="text-xs text-gray-500">Secured by Razorpay. Your order is confirmed only after the payment is verified.</div></div>
              </label>
              <label className={`flex gap-3 border rounded-xl p-4 cursor-pointer ${method === 'cod' ? 'border-brand-600 ring-1 ring-brand-600' : ''}`}>
                <input type="radio" name="pm" checked={method === 'cod'} onChange={() => setMethod('cod')} />
                <div><div className="font-semibold">Cash on Delivery</div><div className="text-xs text-gray-500">Available for eligible items and PIN codes. Pay when your order arrives.</div></div>
              </label>
            </div>
            {codBlocked && <p className="text-sm text-red-600 mt-3">Cash on Delivery is not available for one or more items in your cart.</p>}
          </section>

          {paymentNote && (
            <div role="alert" className="card p-4 border-amber-300 bg-amber-50 text-sm text-amber-900">
              <div>{paymentNote}</div>
              {pendingOrderId && method === 'razorpay' && <button onClick={retryPayment} disabled={placing} className="btn-outline mt-3 py-1.5">Retry payment</button>}
            </div>
          )}
        </div>

        <aside className="card p-5 h-fit lg:sticky lg:top-40 space-y-4">
          <h2 className="font-bold">Order summary</h2>
          <ul className="text-sm space-y-2 max-h-56 overflow-y-auto">
            {quote.lines.map((l: any) => (
              <li key={l.item_id} className="flex justify-between gap-2">
                <span className="line-clamp-2">{l.name} × {l.quantity} {!l.in_stock && <span className="text-red-600 block text-xs">Unavailable – update cart</span>}</span>
                <span className="whitespace-nowrap">{formatPrice(l.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input aria-label="Coupon code" value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" className="input-field" />
            <button className="btn-outline py-2" onClick={() => coupon.trim() ? (setAppliedCoupon(coupon.trim()), refreshQuote(coupon.trim())) : toast.error('Enter a coupon code')}>Apply</button>
          </div>
          {appliedCoupon && <button className="text-xs text-red-600 hover:underline" onClick={() => { setAppliedCoupon(undefined); setCoupon(''); }}>Remove coupon {appliedCoupon}</button>}
          <dl className="text-sm space-y-2 border-t pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(quote.subtotal)}</dd></div>
            {quote.discount > 0 && <div className="flex justify-between text-green-700"><dt>Discount</dt><dd>−{formatPrice(quote.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{quote.delivery_charge ? formatPrice(quote.delivery_charge) : 'Free'}</dd></div>
            <div className="flex justify-between"><dt>GST (5%)</dt><dd>{formatPrice(quote.tax)}</dd></div>
            <div className="flex justify-between font-bold text-base border-t pt-2"><dt>Amount payable</dt><dd>{formatPrice(quote.total)}</dd></div>
          </dl>
          <button onClick={placeOrder} disabled={placing || !selectedAddr || hasBlocked || codBlocked || quote.lines.length === 0} className="btn-secondary w-full py-3 disabled:opacity-50">
            {placing ? 'Processing…' : method === 'cod' ? `Place order (COD) · ${formatPrice(quote.total)}` : `Pay ${formatPrice(quote.total)}`}
          </button>
          {hasBlocked && <p className="text-xs text-red-600">Some items are out of stock. <Link href="/cart" className="underline">Update your cart</Link>.</p>}
          <p className="text-[11px] text-gray-500">By placing your order you agree to our <Link href="/policies/terms" className="underline">Terms</Link> and <Link href="/policies/returns" className="underline">Returns Policy</Link>.</p>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <RequireAuth><CheckoutInner /></RequireAuth>;
}
