import 'server-only';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Local file storage for product photos. Files live outside /public (in data/uploads by default)
 * and are served only through /api/media/[name] after a type check. Production on Vercel or
 * multi-instance hosting must move this to Supabase Storage (or S3) - see README.
 */
export const MEDIA_URL_PREFIX = '/api/media/';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 8;

const UPLOAD_DIR = process.env.SHOPDIGO_UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'uploads');

const TYPES: Record<string, { mime: string; ext: string }> = {
  jpg: { mime: 'image/jpeg', ext: 'jpg' },
  png: { mime: 'image/png', ext: 'png' },
  webp: { mime: 'image/webp', ext: 'webp' },
};

/** Identifies the real image format from the file's leading bytes (never trusts the client's MIME type). */
export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return TYPES.jpg;
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return TYPES.png;
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return TYPES.webp;
  return null;
}

export function saveProductImage(buf: Buffer): string {
  const type = sniffImage(buf);
  if (!type) throw new Error('Unsupported file. Upload a JPG, PNG or WebP image.');
  if (buf.length > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB.');
  fs.mkdirSync(/*turbopackIgnore: true*/ UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${type.ext}`;
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), buf, { flag: 'wx' });
  return MEDIA_URL_PREFIX + name;
}

const NAME_RE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
/** Accepts only URLs this app issued. Returns the on-disk file name or null. */
export function mediaNameFromUrl(url: string): string | null {
  if (!url.startsWith(MEDIA_URL_PREFIX)) return null;
  const name = url.slice(MEDIA_URL_PREFIX.length);
  return NAME_RE.test(name) ? name : null;
}

export function readProductImage(name: string): { buf: Buffer; mime: string } | null {
  if (!NAME_RE.test(name)) return null;
  const file = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) return null;
  const ext = name.split('.').pop() as string;
  return { buf: fs.readFileSync(/*turbopackIgnore: true*/ file), mime: TYPES[ext].mime };
}
