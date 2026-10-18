/**
 * Identifiers of the sample records that earlier builds inserted into the database.
 * Used ONLY by the one-time migration in store.ts to remove them. Nothing here is shown in the UI.
 * Genuine records (added by real sellers or admins) never match these lists.
 */
export const SAMPLE_PRODUCT_SLUGS = new Set<string>([
  "apple-iphone-15-blue-128gb",
  "samsung-galaxy-s24-ultra-titanium-gray",
  "oneplus-12-flowy-emerald-256gb",
  "redmi-note-13-pro-coral-purple",
  "macbook-air-m3-midnight-256gb",
  "dell-xps-13-i7-13th-gen",
  "hp-pavilion-15-ryzen5",
  "sony-wh1000xm5-black",
  "boat-airdopes-141-white",
  "levis-511-slim-fit-blue-jeans",
  "nike-air-max-270-white-black",
  "adidas-ultraboost-22-black",
  "puma-classic-tshirts-navy-p3",
  "floral-a-line-midi-dress-pink",
  "anarkali-kurta-set-maroon",
  "prestige-electric-kettle-1.5l",
  "philips-air-fryer-hd9252",
  "memory-foam-pillow-pack2",
  "wooden-study-table-walnut",
  "psychology-of-money-morgan-housel",
  "atomic-habits-james-clear",
  "minimalist-niacinamide-serum",
  "yoga-mat-6mm-purple"
]);
export const SAMPLE_SELLER_STORES = new Set<string>(['TechMart India', 'FashionHut', 'Home Essentials']);
export const SAMPLE_BRANDS = new Set<string>(['Adidas', 'Apple', 'Dell', 'HP', 'Nike', 'OnePlus', 'Philips', 'Prestige', 'Puma', 'Samsung', 'Sony', 'Xiaomi', 'boAt', 'Levi\'s']);
export const SAMPLE_PINCODES = new Set<string>(['110001', '380001', '400001', '400058', '411001', '500001', '560001', '560025', '560095', '600001', '700001']);
export const SAMPLE_COUPON_CODES = new Set<string>(['WELCOME50', 'SHOP10', 'FREESHIP']);
export const SAMPLE_BANNER_TITLES = new Set<string>(['Shop electronics', 'Fashion for everyday', 'Home and kitchen essentials', 'Big Billion Days Sale', 'Mega Electronics Sale', 'Fashion Fiesta']);
