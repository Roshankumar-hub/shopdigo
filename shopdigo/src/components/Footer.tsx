import Link from 'next/link';
import Logo from './Logo';

const SUPPORT_EMAIL = 'support@shopdigo.example'; // placeholder: replace with the live support address before launch

export default function Footer() {
  const cols = [
    { title: 'Shop', links: [['Electronics', '/search?category=electronics'], ['Fashion', '/search?category=fashion'], ['Home & Kitchen', '/search?category=home-kitchen'], ['Books', '/search?category=books'], ['All products', '/search']] },
    { title: 'Sell', links: [['Become a seller', '/seller/register'], ['Seller centre', '/seller'], ['Seller policy', '/policies/seller']] },
    { title: 'Help', links: [['Help centre', '/help'], ['Track orders', '/account/orders'], ['Support tickets', '/account/support'], ['Returns policy', '/policies/returns']] },
    { title: 'Legal', links: [['Terms of use', '/policies/terms'], ['Privacy policy', '/policies/privacy'], ['Shipping policy', '/policies/shipping']] },
  ];
  return (
    <footer className="mt-16 bg-navy-900 text-navy-200">
      <div className="container-custom grid grid-cols-2 gap-8 py-12 md:grid-cols-5">
        <div className="col-span-2">
          <Logo size="sm" onDark />
          <p className="mt-3 text-sm text-navy-200">Everything you need, all in one place.</p>
          <p className="mt-4 text-sm">
            Email: <a className="underline hover:text-white" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <p className="mt-3 text-xs text-navy-200/80">SHOPDIGO is a marketplace. Sellers are independent businesses responsible for their own listings, stock and dispatch.</p>
        </div>
        {cols.map(c => (
          <div key={c.title}>
            <h2 className="mb-3 text-sm font-semibold text-white">{c.title}</h2>
            <ul className="space-y-2 text-sm">
              {c.links.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-white hover:underline">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-navy-200/80">
        © {new Date().getFullYear()} SHOPDIGO. All prices in Indian rupees (₹). Delivery across India.
      </div>
    </footer>
  );
}
