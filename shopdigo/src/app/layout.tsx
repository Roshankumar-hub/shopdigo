import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SplashScreen from '@/components/SplashScreen';

export const metadata: Metadata = {
  title: { default: 'SHOPDIGO – Everything You Need. All in One Place.', template: '%s | SHOPDIGO' },
  description: 'SHOPDIGO is a multi-vendor marketplace for India. Shop electronics, fashion, home and more from trusted sellers.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased">
        <SplashScreen />
        <Providers>
          <Header />
          <main className="flex-1 animate-fade-in">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
