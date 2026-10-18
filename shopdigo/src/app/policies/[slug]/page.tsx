import Link from 'next/link';
import { notFound } from 'next/navigation';

const POLICIES: Record<string, { title: string; body: string[] }> = {
  terms: { title: 'Terms of Use', body: [
    'SHOPDIGO is a marketplace that connects customers with independent sellers. Sellers are responsible for their listings, pricing, stock and product quality.',
    'You must provide accurate information when placing orders. Prices are shown in Indian Rupees (₹) and are inclusive of GST where the seller has applied it; the final amount is shown at checkout.',
    'Orders may be cancelled or refused if an item is out of stock, a price error occurs, or payment cannot be verified.',
    'Use of the platform for unlawful or fraudulent activity is prohibited. Accounts may be suspended for violations.',
  ] },
  privacy: { title: 'Privacy Policy', body: [
    'We collect only the information needed to run the marketplace: name, email, mobile number, delivery addresses, order history and, for sellers, business, tax and bank details needed for settlements.',
    'Payment card details are never stored by SHOPDIGO. Online payments are processed by Razorpay.',
    'Passwords are stored as one-way bcrypt hashes. Session cookies are HTTP-only.',
    'Sellers receive only the delivery details required to fulfil an order. You may request access to or deletion of your data by contacting support; deletion is subject to legal record-keeping obligations.',
  ] },
  returns: { title: 'Returns & Refunds Policy', body: [
    'Each product shows its return window (in days) from the delivery date. Returns can be requested from your order page within that window.',
    'Requests are reviewed by the seller. Approved returns are refunded to the original payment method after the payment gateway confirms the refund. SHOPDIGO will not show a refund as completed before the gateway confirms it.',
    'Cancellation is available for items that have not yet shipped. Cancelled prepaid items are refunded through the same process.',
    'Cash on Delivery refunds are recorded manually by the administrator and paid by bank transfer to the details you provide.',
  ] },
  shipping: { title: 'Shipping Policy', body: [
    'Delivery is available to serviceable PIN codes across India. Check your PIN code on the product page before ordering.',
    'Estimated delivery is calculated from the seller dispatch time plus the courier transit time for your PIN code.',
    'Tracking updates come from the courier partner once a tracking number is added by the seller. SHOPDIGO does not display courier status until it is received.',
  ] },
  seller: { title: 'Seller Agreement & Policy', body: [
    'Sellers must be lawfully registered in India and hold valid GST and PAN details where applicable.',
    'Listings must be accurate, must not infringe intellectual property, and must comply with product safety laws. SHOPDIGO reviews listings before they go live.',
    'The marketplace commission is set per seller by SHOPDIGO and shown in the seller ledger. Settlements are paid only after an administrator records them as processed.',
    'Sellers must fulfil orders within their stated dispatch time, and must respond to return requests promptly.',
  ] },
};

export function generateStaticParams() { return Object.keys(POLICIES).map(slug => ({ slug })); }

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = POLICIES[slug];
  if (!p) notFound();
  return (
    <div className="container-custom py-8 max-w-3xl">
      <nav className="text-xs text-gray-500 mb-3"><Link href="/" className="hover:underline">Home</Link> / {p.title}</nav>
      <h1 className="text-3xl font-bold font-display mb-6">{p.title}</h1>
      <div className="space-y-4 text-gray-700 leading-relaxed">{p.body.map((t, i) => <p key={i}>{t}</p>)}</div>
      <p className="text-xs text-gray-500 mt-8">Last updated: placeholder text for demonstration. Have counsel review all policy text before launch.</p>
    </div>
  );
}
