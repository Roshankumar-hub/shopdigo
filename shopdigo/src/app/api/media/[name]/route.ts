import { readProductImage } from '@/lib/server/media';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const img = readProductImage(name);
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(img.buf), {
    headers: {
      'Content-Type': img.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
