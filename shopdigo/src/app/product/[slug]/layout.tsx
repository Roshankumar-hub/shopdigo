import type { Metadata } from 'next';
import { db } from '@/lib/server/store';

/** Server-rendered SEO metadata for product pages (title, description, Open Graph image). */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = db.getProductBySlug(slug);
  if (!p) return { title: 'Product not found' };
  const description = (p.description || '').replace(/\s+/g, ' ').slice(0, 160);
  const image = p.images?.[0]?.url;
  return {
    title: p.name,
    description,
    openGraph: { title: p.name, description, type: 'website', images: image ? [{ url: image, alt: p.name }] : [] },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
