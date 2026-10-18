import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/ratelimit';
import { saveProductImage, MAX_IMAGE_BYTES } from '@/lib/server/media';

export const runtime = 'nodejs';

/** Approved sellers and admins may upload product photos. Ownership is checked when the product is saved. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in to upload images' }, { status: 401 });
  const isApprovedSeller = !!user.seller_id && user.seller_status === 'approved';
  if (!isApprovedSeller && user.role !== 'admin') {
    return NextResponse.json({ error: 'Only approved sellers can upload product photos' }, { status: 403 });
  }
  if (!rateLimit(`upload:${user.id}`, 60, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many uploads. Please wait a few minutes.' }, { status: 429 });
  }
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'Image is larger than 5 MB.' }, { status: 413 });
  }
  let file: FormDataEntryValue | null = null;
  try {
    file = (await req.formData()).get('file');
  } catch {
    return NextResponse.json({ error: 'Send the image as multipart form data (field "file").' }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file received' }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: 'The selected file is empty' }, { status: 400 });
  try {
    const url = saveProductImage(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ data: { url } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 422 });
  }
}
