import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * Fresh-database seed. Creates ONLY the category taxonomy and one administrator account.
 * It never creates products, sellers, reviews, ratings, images, coupons, banners, brands,
 * delivery PIN codes or demo customers. Every product must be added by an authorised seller
 * or admin (sellers: approved sellers, submissions go through admin approval).
 *
 * Admin credentials for local development come from SHOPDIGO_ADMIN_EMAIL / SHOPDIGO_ADMIN_PASSWORD.
 * If they are not set, a random password is generated and printed once to the server log.
 */
type DB = any;

const CATEGORIES: { name: string; slug: string; parent?: string }[] = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Mobiles', slug: 'mobiles', parent: 'electronics' },
  { name: 'Laptops', slug: 'laptops', parent: 'electronics' },
  { name: 'Audio', slug: 'audio', parent: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: "Men's Clothing", slug: 'mens-clothing', parent: 'fashion' },
  { name: "Women's Clothing", slug: 'womens-clothing', parent: 'fashion' },
  { name: 'Footwear', slug: 'footwear', parent: 'fashion' },
  { name: 'Home & Kitchen', slug: 'home-kitchen' },
  { name: 'Appliances', slug: 'appliances', parent: 'home-kitchen' },
  { name: 'Furniture', slug: 'furniture', parent: 'home-kitchen' },
  { name: 'Books', slug: 'books' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Grocery', slug: 'grocery' },
  { name: 'Sports & Fitness', slug: 'sports' },
];

export function seedData(): Omit<DB, 'sessions'> & { sessions?: unknown } {
  const now = new Date().toISOString();
  const adminEmail = process.env.SHOPDIGO_ADMIN_EMAIL || 'admin@shopdigo.com';
  const adminPassword = process.env.SHOPDIGO_ADMIN_PASSWORD || (() => {
    const generated = uuid().replace(/-/g, '').slice(0, 16);
    console.warn(`[SHOPDIGO] Generated admin password for ${adminEmail}: ${generated} (set SHOPDIGO_ADMIN_PASSWORD to choose your own)`);
    return generated;
  })();

  const idBySlug = new Map<string, string>();
  const categories = CATEGORIES.map(c => {
    const id = uuid();
    idBySlug.set(c.slug, id);
    return { id, name: c.name, slug: c.slug, image: '', parent_id: c.parent ? idBySlug.get(c.parent) : undefined, created_at: now };
  });

  return {
    users: [{ id: uuid(), name: 'SHOPDIGO Admin', email: adminEmail, password_hash: bcrypt.hashSync(adminPassword, 10), role: 'admin', created_at: now }],
    addresses: [], categories, brands: [], sellers: [], products: [], product_images: [], product_variants: [],
    carts: [], cart_items: [], wishlist: [], orders: [], order_items: [], order_status_history: [],
    reviews: [], questions: [], coupons: [], banners: [], ledger: [], settlements: [], tickets: [],
    notifications: [], audit_logs: [], pincodes: [], schema_version: 3,
  } as unknown as DB;
}
