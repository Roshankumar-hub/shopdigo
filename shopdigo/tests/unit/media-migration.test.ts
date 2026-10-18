import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'shopdigo-media-'));
process.env.SHOPDIGO_DB_FILE = path.join(DIR, 'db.json');
process.env.SHOPDIGO_UPLOAD_DIR = path.join(DIR, 'uploads');

let media: typeof import('@/lib/server/media');
let db: any;

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP'), Buffer.alloc(16)]);

beforeAll(async () => {
  media = await import('@/lib/server/media');
  db = (await import('@/lib/server/store')).db;
});

describe('image sniffing and storage', () => {
  it('recognises JPEG, PNG and WebP by their bytes', () => {
    expect(media.sniffImage(JPG)?.mime).toBe('image/jpeg');
    expect(media.sniffImage(PNG)?.mime).toBe('image/png');
    expect(media.sniffImage(WEBP)?.mime).toBe('image/webp');
  });

  it('rejects SVG, HTML and other files even when the file name looks like an image', () => {
    expect(media.sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(media.sniffImage(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(() => media.saveProductImage(Buffer.from('<svg></svg>'))).toThrow(/Unsupported file/);
  });

  it('saves an image under a random name and serves it back with the right type', () => {
    const url = media.saveProductImage(PNG);
    expect(url).toMatch(/^\/api\/media\/[0-9a-f-]{36}\.png$/);
    const img = media.readProductImage(url.slice('/api/media/'.length));
    expect(img?.mime).toBe('image/png');
    expect(img?.buf.length).toBe(PNG.length);
  });

  it('refuses oversized files', () => {
    const big = Buffer.concat([PNG, Buffer.alloc(media.MAX_IMAGE_BYTES)]);
    expect(() => media.saveProductImage(big)).toThrow(/larger than 5 MB/);
  });

  it('only accepts URLs this app issued (no traversal, no foreign paths)', () => {
    expect(media.mediaNameFromUrl('/api/media/../../package.json')).toBeNull();
    expect(media.mediaNameFromUrl('/api/media/not-a-uuid.png')).toBeNull();
    expect(media.mediaNameFromUrl('http://evil.example/x.png')).toBeNull();
    expect(media.readProductImage('../../package.json')).toBeNull();
  });
});

describe('legacy database migration', () => {
  it('removes generated artwork and invented reviews, and recomputes ratings from real reviews only', () => {
    const svg = 'data:image/svg+xml;utf8,%3Csvg%3E%3C/svg%3E';
    const legacy = {
      users: [], addresses: [], categories: [{ id: 'c1', name: 'Electronics', slug: 'electronics', image: svg }],
      brands: [], sellers: [], products: [
        { id: 'p1', slug: 'a', name: 'A', status: 'active', seller_id: 's', category_id: 'c1', mrp: 100, price: 90, stock: 5, rating: 4.9, review_count: 300, discount_percent: 10, description: 'd', created_at: '2024-01-01', updated_at: '2024-01-01' },
      ],
      product_images: [{ id: 'i1', product_id: 'p1', url: svg, position: 0 }, { id: 'i2', product_id: 'p1', url: '/api/media/x.png', position: 1 }],
      product_variants: [], reviews: [
        { id: 'r0', product_id: 'p1', user_id: 'u', user_name: 'Arjun S.', rating: 5, title: 't', body: 'b', created_at: '2024-01-01' },
        { id: 'r1', product_id: 'p1', user_id: 'u2', user_name: 'Real Customer', rating: 3, title: 't', body: 'b', created_at: '2024-01-02' },
      ],
      questions: [], banners: [{ id: 'b1', title: 'Big Billion Days Sale', subtitle: 'Up to 80% off', image: svg, position: 1, is_active: true }],
      wishlist: [], carts: [], cart_items: [], orders: [], order_items: [], order_status_history: [], coupons: [], notifications: [],
      support_tickets: [], audit_logs: [], ledger: [], settlements: [], pincodes: [], sessions: {}, order_counter: 0,
    };
    fs.writeFileSync(process.env.SHOPDIGO_DB_FILE as string, JSON.stringify(legacy));
    const products = db.listProducts({});
    const p = products.find((x: any) => x.id === 'p1');
    expect(p.images.map((i: any) => i.url)).toEqual(['/api/media/x.png']);
    expect(p.review_count).toBe(1);
    expect(p.rating).toBe(3);
    expect(db.listCategories().find((c: any) => c.id === 'c1').image).toBe('');
    // The first-release sample banner is removed; no discount copy survives.
    expect(db.listBanners().find((b: any) => b.id === 'b1')).toBeUndefined();
    const saved = JSON.parse(fs.readFileSync(process.env.SHOPDIGO_DB_FILE as string, 'utf8'));
    expect(saved.schema_version).toBe(3);
  });

  it('removes sample products, sellers, PIN codes and coupons, but keeps genuine records', () => {
    const sampleSlug = 'apple-iphone-15-blue-128gb';
    const legacy = {
      users: [{ id: 'su', name: 'Rahul Gupta', email: 'x@y.z', password_hash: 'h', role: 'seller', created_at: '2024-01-01' }],
      addresses: [], categories: [{ id: 'c1', name: 'Mobiles', slug: 'mobiles', image: '' }], brands: [{ id: 'b-apple', name: 'Apple', slug: 'apple' }, { id: 'b-real', name: 'Acme', slug: 'acme' }],
      sellers: [{ id: 's-sample', user_id: 'su', store_name: 'TechMart India', status: 'approved' }, { id: 's-real', user_id: 'u-real', store_name: 'Real Shop', status: 'approved' }],
      products: [
        { id: 'p-sample', slug: sampleSlug, name: 'Sample', status: 'active', seller_id: 's-sample', category_id: 'c1', brand_id: 'b-apple', mrp: 100, price: 90, stock: 5, description: 'd', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'p-real', slug: 'genuine-kettle', name: 'Genuine kettle', status: 'active', seller_id: 's-real', category_id: 'c1', brand_id: 'b-real', mrp: 100, price: 90, stock: 5, description: 'd', created_at: '2024-01-01', updated_at: '2024-01-01' },
      ],
      product_images: [], product_variants: [], reviews: [], questions: [], wishlist: [], cart_items: [],
      order_items: [], orders: [], coupons: [{ id: 'cp', code: 'SHOP10', times_used: 0 }], banners: [], pincodes: [{ pincode: '560001' }, { pincode: '682001' }],
      carts: [], ledger: [], settlements: [], tickets: [], notifications: [], audit_logs: [], sessions: {}, schema_version: 2,
    };
    fs.writeFileSync(process.env.SHOPDIGO_DB_FILE as string, JSON.stringify(legacy));
    const names = db.listProducts({}).map((p: any) => p.slug);
    expect(names).toEqual(['genuine-kettle']);
    expect(db.listBrandsWithCounts().map((b: any) => b.name)).toEqual(['Acme']);
    const raw = JSON.parse(fs.readFileSync(process.env.SHOPDIGO_DB_FILE as string, 'utf8'));
    expect(raw.pincodes.map((x: any) => x.pincode)).toEqual(['682001']);
    expect(raw.coupons).toEqual([]);
    expect(raw.sellers.map((s: any) => s.store_name)).toEqual(['Real Shop']);
    expect(raw.users[0].role).toBe('customer');
    expect(fs.existsSync((process.env.SHOPDIGO_DB_FILE as string).replace(/\.json$/, '.before-schema-v3.json'))).toBe(true);
  });

  it('seeds fresh databases with the category taxonomy and an admin only, never products', () => {
    fs.rmSync(process.env.SHOPDIGO_DB_FILE as string, { force: true });
    expect(db.listProducts({}).length).toBe(0);
    expect(db.listCategories().length).toBeGreaterThan(0);
    expect(db.listUsers().filter((u: any) => u.role === 'admin').length).toBe(1);
    expect(db.listBanners().length).toBe(0);
  });
});
