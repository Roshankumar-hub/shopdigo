import 'server-only';
import { z } from 'zod';
import { db } from './store';
import { mediaNameFromUrl } from './media';
import { razorpayConfig, createRazorpayOrder, fetchRazorpayPayment, refundRazorpayPayment, verifyPaymentSignature } from './razorpay';
import type { SessionUser } from './types-session';

/**
 * Central action registry. Every privileged operation is declared here with its
 * allowed roles and is re-checked on the server. Ownership is enforced inside each
 * handler (sellers only touch their own products/order items; customers only their
 * own orders/addresses/cart).
 */

type Role = 'customer' | 'seller' | 'admin';
interface Ctx { user: SessionUser | null }
interface ActionDef { roles?: Role[] | 'public'; approvedSeller?: boolean; schema?: z.ZodTypeAny; handler: (ctx: Ctx & { user: SessionUser }, input: any) => unknown }

export class ActionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const id = z.string().min(1).max(64);
const money = z.number().nonnegative().max(10_000_000);
const pin = z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit PIN code');
const phone = z.string().regex(/^(\+91)?[6-9][0-9]{9}$/, 'Enter a valid 10-digit Indian mobile number');
const text = (max: number) => z.string().trim().min(1).max(max);
/** A product photo is either a photo uploaded through this app (/api/media/...) or an https URL. */
const productImageRef = z.string().max(300).refine(u => mediaNameFromUrl(u) !== null || (u.startsWith('https://') && z.string().url().safeParse(u).success),
  'Each image must be an uploaded photo or an https:// URL');

function requireUser(ctx: Ctx): SessionUser {
  if (!ctx.user) throw new ActionError('Please log in to continue', 401);
  return ctx.user;
}

function requireSeller(ctx: Ctx, needApproved = true) {
  const u = requireUser(ctx);
  if (!u.seller_id) throw new ActionError('Seller account required', 403);
  if (needApproved && u.seller_status !== 'approved') throw new ActionError('Your seller account is not approved yet', 403);
  return { user: u, sellerId: u.seller_id };
}

function requireAdmin(ctx: Ctx) {
  const u = requireUser(ctx);
  if (u.role !== 'admin') throw new ActionError('Forbidden', 403);
  return u;
}

const SELLER_ITEM_FLOW = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'] as const;

const addressSchema = z.object({
  label: text(20), name: text(80), phone, address_line1: text(120), address_line2: z.string().max(120).optional().default(''),
  city: text(60), state: text(60), pincode: pin, country: z.string().default('India'), is_default: z.boolean().optional().default(false),
});

const productSchema = z.object({
  id: id.optional(),
  name: text(150), category_id: id, brand_id: id.optional().nullable(), description: text(5000),
  specifications: z.record(z.string().max(60), z.string().max(300)).optional().default({}),
  mrp: z.number().positive().max(10_000_000), price: z.number().positive().max(10_000_000),
  stock: z.number().int().min(0).max(1_000_000), images: z.array(productImageRef).max(8).default([]),
  cod_available: z.boolean().default(true), delivery_days: z.number().int().min(1).max(30).default(5),
  return_window_days: z.number().int().min(0).max(60).default(7),
  submit: z.boolean().default(true),
}).refine(v => v.price <= v.mrp, { message: 'Selling price cannot exceed MRP', path: ['price'] });

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'product'; }

export const actions: Record<string, ActionDef> = {
  /* ---------- public / shopping ---------- */
  'catalog.home': {
    roles: 'public',
    handler: () => {
      const products = db.listProducts({ sort: 'popularity' });
      const newest = db.listProducts({ sort: 'newest' });
      const deals = products.filter(p => p.discount_percent > 0).sort((a, b) => b.discount_percent - a.discount_percent);
      return {
        banners: db.listBanners(),
        categories: db.listCategories(),
        brands: db.listBrandsWithCounts().slice(0, 12),
        featured: products.filter(p => p.is_featured).slice(0, 8),
        trending: products.filter(p => p.is_trending).slice(0, 8),
        newest: newest.slice(0, 8),
        offers: deals.slice(0, 8),
        recommended: products.slice(0, 8),
        product_count: products.length,
      };
    },
  },
  'catalog.search': {
    roles: 'public',
    schema: z.object({
      q: z.string().max(100).optional(), category: z.string().max(100).optional(), brand: z.string().max(100).optional(),
      minPrice: z.number().min(0).optional(), maxPrice: z.number().min(0).optional(), minRating: z.number().min(0).max(5).optional(),
      sort: z.enum(['relevance', 'popularity', 'price_low', 'price_high', 'newest', 'rating', 'discount']).optional(),
      inStock: z.boolean().optional(), page: z.number().int().min(1).max(100).optional(),
    }),
    handler: (_c, input) => {
      let items = db.listProducts({ search: input.q, category: input.category, brand: input.brand, minPrice: input.minPrice, maxPrice: input.maxPrice, minRating: input.minRating, sort: input.sort });
      if (input.inStock) items = items.filter(p => p.stock > 0);
      const page = input.page || 1, size = 20;
      // catalogue_total counts every published product, so the UI can tell an empty marketplace from an empty filter result.
      const catalogue_total = db.listProducts({}).length;
      return { total: items.length, catalogue_total, page, pages: Math.max(1, Math.ceil(items.length / size)), items: items.slice((page - 1) * size, page * size), brands: db.listBrandsWithCounts(), categories: db.listCategories() };
    },
  },
  'catalog.byIds': {
    roles: 'public',
    schema: z.object({ ids: z.array(id).max(20) }),
    handler: (_c, { ids }) => db.listProductsByIds(ids),
  },
  'catalog.product': {
    roles: 'public',
    schema: z.object({ slug: text(120) }),
    handler: (_c, { slug }) => {
      const p = db.getProductBySlug(slug);
      if (!p) throw new ActionError('Product not found', 404);
      const related = db.listProducts({ category: p.category_id }).filter(x => x.id !== p.id).slice(0, 8);
      return { product: p, reviews: db.listReviews(p.id), questions: db.listQuestions(p.id), related };
    },
  },
  'catalog.delivery': {
    roles: 'public',
    schema: z.object({ pincode: pin }),
    handler: (_c, { pincode }) => {
      const s = db.checkPincode(pincode);
      if (!s) return { serviceable: false, message: 'Delivery data for this PIN code is not configured yet.' };
      return { serviceable: s.is_serviceable, city: s.city, state: s.state, delivery_days: s.delivery_days, cod_available: s.cod_available };
    },
  },
  'review.add': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ productId: id, rating: z.number().int().min(1).max(5), title: z.string().max(120).default(''), body: text(2000) }),
    handler: (ctx, input) => db.addReview(input.productId, ctx.user.id, input.rating, input.title, input.body),
  },
  'question.add': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ productId: id, question: text(500) }),
    handler: (ctx, input) => db.addQuestion(input.productId, ctx.user.id, input.question),
  },

  /* ---------- wishlist ---------- */
  'wishlist.list': { roles: ['customer', 'seller', 'admin'], handler: (ctx) => db.getWishlist(ctx.user.id) },
  'wishlist.toggle': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ productId: id }),
    handler: (ctx, { productId }) => ({ wishlisted: db.toggleWishlist(ctx.user.id, productId) }),
  },

  /* ---------- cart ---------- */
  'cart.get': {
    roles: ['customer', 'seller', 'admin'],
    handler: (ctx) => ({ cart: db.getCart(ctx.user.id), quote: db.quoteCart(ctx.user.id) }),
  },
  'cart.add': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ productId: id, quantity: z.number().int().min(1).max(10).default(1), variantId: id.optional() }),
    handler: (ctx, { productId, quantity, variantId }) => {
      try { db.addToCart(ctx.user.id, productId, quantity, variantId); } catch (e: any) { throw new ActionError(e.message); }
      return { cart: db.getCart(ctx.user.id) };
    },
  },
  'cart.update': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ itemId: id, quantity: z.number().int().min(0).max(10) }),
    handler: (ctx, { itemId, quantity }) => {
      try { db.updateCartItem(ctx.user.id, itemId, quantity); } catch (e: any) { throw new ActionError(e.message); }
      return { cart: db.getCart(ctx.user.id), quote: db.quoteCart(ctx.user.id) };
    },
  },
  'cart.remove': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ itemId: id }),
    handler: (ctx, { itemId }) => ({ cart: db.removeFromCart(ctx.user.id, itemId) }),
  },
  'cart.quote': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ couponCode: z.string().max(40).optional() }),
    handler: (ctx, { couponCode }) => db.quoteCart(ctx.user.id, couponCode),
  },

  /* ---------- account ---------- */
  'account.addresses': { roles: ['customer', 'seller', 'admin'], handler: (ctx) => db.listAddresses(ctx.user.id) },
  'account.addressSave': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ id: id.optional(), data: addressSchema }),
    handler: (ctx, { id: addrId, data }) => {
      if (addrId) {
        const existing = db.listAddresses(ctx.user.id).find(a => a.id === addrId);
        if (!existing) throw new ActionError('Address not found', 404);
        return db.updateAddress(addrId, data);
      }
      return db.addAddress(ctx.user.id, data);
    },
  },
  'account.addressDelete': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ id }),
    handler: (ctx, { id: addrId }) => {
      if (!db.listAddresses(ctx.user.id).some(a => a.id === addrId)) throw new ActionError('Address not found', 404);
      db.deleteAddress(addrId);
      return { ok: true };
    },
  },
  'account.notifications': {
    roles: ['customer', 'seller', 'admin'],
    handler: (ctx) => ({ items: db.listNotifications(ctx.user.id), unread: db.unreadCount(ctx.user.id) }),
  },
  'account.notificationRead': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ id }),
    handler: (ctx, { id: nId }) => {
      if (!db.listNotifications(ctx.user.id).some(n => n.id === nId)) throw new ActionError('Not found', 404);
      db.markNotificationRead(nId);
      return { ok: true };
    },
  },
  'ticket.create': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ subject: text(120), message: text(3000), category: z.enum(['order', 'payment', 'product', 'seller', 'other']), orderId: id.optional() }),
    handler: (ctx, input) => {
      if (input.orderId) {
        const o = db.getOrderById(input.orderId);
        if (!o || o.user_id !== ctx.user.id) throw new ActionError('Order not found', 404);
      }
      return db.createTicket(ctx.user.id, { subject: input.subject, message: input.message, category: input.category, order_id: input.orderId });
    },
  },
  'ticket.mine': { roles: ['customer', 'seller', 'admin'], handler: (ctx) => db.listTickets({ userId: ctx.user.id }) },

  /* ---------- checkout & orders ---------- */
  'order.create': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({
      addressId: id,
      paymentMethod: z.enum(['razorpay', 'cod']),
      couponCode: z.string().max(40).optional(),
      idempotencyKey: z.string().min(8).max(100),
    }),
    handler: (ctx, input) => {
      const addr = db.listAddresses(ctx.user.id).find(a => a.id === input.addressId);
      if (!addr) throw new ActionError('Please select a valid delivery address', 400);
      const svc = db.checkPincode(addr.pincode);
      if (!svc || !svc.is_serviceable) throw new ActionError('Sorry, we do not deliver to this PIN code yet');
      if (input.paymentMethod === 'cod' && !svc.cod_available) throw new ActionError('Cash on Delivery is not available for this PIN code');
      if (input.paymentMethod === 'razorpay' && !razorpayConfig().configured) {
        // Fail before creating any order so no stock is reserved.
        throw new ActionError('Online payments are not configured on this server yet. Please choose Cash on Delivery, or ask the administrator to add Razorpay keys.', 503);
      }
      let order;
      try {
        order = db.createOrder({ userId: ctx.user.id, addressId: addr.id, paymentMethod: input.paymentMethod, couponCode: input.couponCode, idempotencyKey: input.idempotencyKey });
      } catch (e: any) { throw new ActionError(e.message); }
      if (input.paymentMethod === 'cod') return { order, payment: null };

      // Razorpay: amount is computed from the server-side order total only.
      if (order.payment_status === 'paid') return { order, payment: null };
      if (!order.razorpay_order_id) {
        return createRazorpayForOrder(order.id, order.order_number, order.total);
      }
      return { order, payment: { keyId: razorpayConfig().publicKeyId, orderId: order.razorpay_order_id, amount: Math.round(order.total * 100), currency: 'INR' } };
    },
  },
  'order.list': { roles: ['customer', 'seller', 'admin'], handler: (ctx) => db.listOrdersForUser(ctx.user.id) },
  'order.get': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ id }),
    handler: (ctx, { id: oId }) => {
      const o = db.getOrderById(oId);
      if (!o || (o.user_id !== ctx.user.id && ctx.user.role !== 'admin')) throw new ActionError('Order not found', 404);
      return o;
    },
  },
  'order.retryPayment': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ id }),
    handler: (ctx, { id: oId }) => {
      const o = db.getOrderById(oId);
      if (!o || o.user_id !== ctx.user.id) throw new ActionError('Order not found', 404);
      if (o.payment_method !== 'razorpay' || o.payment_status === 'paid' || o.status === 'cancelled') throw new ActionError('This order cannot be paid now');
      if (!razorpayConfig().configured) throw new ActionError('Online payments are not configured on this server yet', 503);
      return createRazorpayForOrder(o.id, o.order_number, o.total, o.razorpay_order_id);
    },
  },
  'order.cancelItem': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ orderItemId: id, reason: text(300) }),
    handler: (ctx, { orderItemId, reason }) => {
      const oi = db.getOrderItemById(orderItemId);
      const o = oi ? db.getOrderById(oi.order_id) : null;
      if (!oi || !o || o.user_id !== ctx.user.id) throw new ActionError('Order item not found', 404);
      if (!['placed', 'confirmed', 'processing'].includes(oi.status)) throw new ActionError('This item can no longer be cancelled. Please request a return after delivery.');
      try { db.requestCancellation(orderItemId, reason); } catch (e: any) { throw new ActionError(e.message); }
      if (o.payment_status === 'paid') db.markItemRefundPending(orderItemId);
      return { ok: true, refund: o.payment_status === 'paid' ? 'Refund requested. It will be processed by the administrator and shown as completed only after the payment gateway confirms it.' : null };
    },
  },
  'order.requestReturn': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({ orderItemId: id, reason: text(300) }),
    handler: (ctx, { orderItemId, reason }) => {
      const oi = db.getOrderItemById(orderItemId);
      const o = oi ? db.getOrderById(oi.order_id) : null;
      if (!oi || !o || o.user_id !== ctx.user.id) throw new ActionError('Order item not found', 404);
      if (oi.status !== 'delivered' || !oi.delivered_at) throw new ActionError('Only delivered items can be returned');
      const info = db.getReturnWindowInfo(orderItemId);
      const deadline = new Date(oi.delivered_at).getTime() + (info?.window_days ?? 0) * 86400000;
      if (Date.now() > deadline) throw new ActionError('The return window for this item has closed');
      try { db.requestReturn(orderItemId, reason); } catch (e: any) { throw new ActionError(e.message); }
      return { ok: true };
    },
  },

  /* ---------- seller onboarding ---------- */
  'seller.register': {
    roles: ['customer', 'seller', 'admin'],
    schema: z.object({
      store_name: text(80), store_description: z.string().max(500).optional().default(''),
      business_name: text(120), contact_email: z.string().email(), contact_phone: phone,
      gstin: z.string().regex(/^[0-9A-Z]{15}$/, 'GSTIN must be 15 characters').optional().or(z.literal('')),
      pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN format is invalid').optional().or(z.literal('')),
      pickup_address: text(200), pickup_city: text(60), pickup_state: text(60), pickup_pincode: pin,
      bank_account_name: text(120), bank_account_number: z.string().regex(/^[0-9]{6,18}$/, 'Invalid account number'),
      bank_ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'), bank_name: text(80),
      agreed_terms: z.literal(true, { error: 'You must accept the seller agreement' }),
      agreed_privacy: z.literal(true, { error: 'You must accept the privacy policy' }),
    }),
    handler: (ctx, input) => {
      const { agreed_terms, agreed_privacy, ...data } = input;
      void agreed_terms; void agreed_privacy;
      if (ctx.user.role === 'admin') throw new ActionError('Administrators cannot register as sellers');
      const slug = slugify(data.store_name);
      if (db.getSellerByUserId(ctx.user.id)) throw new ActionError('You have already applied as a seller');
      if (db.listSellers().some(s => s.store_slug === slug)) throw new ActionError('This store name is taken. Please choose another.');
      try {
        return db.registerSeller(ctx.user.id, { ...data, store_slug: slug, gstin: data.gstin || undefined, pan: data.pan || undefined, bank_account_name: data.bank_account_name, bank_account_number: data.bank_account_number, bank_ifsc: data.bank_ifsc, bank_name: data.bank_name } as any);
      } catch (e: any) { throw new ActionError(e.message); }
    },
  },
  'seller.me': {
    roles: ['customer', 'seller', 'admin'],
    handler: (ctx) => ({ seller: db.getSellerByUserId(ctx.user.id) }),
  },

  /* ---------- seller centre (approved sellers only) ---------- */
  'seller.dashboard': {
    roles: ['seller'],
    approvedSeller: true,
    handler: (ctx) => {
      const { sellerId } = requireSeller(ctx);
      const orders = db.listOrdersForSeller(sellerId);
      const summary = db.getSellerDashboard(sellerId);
      const pending = orders.flatMap(o => o.items.filter(i => ['placed', 'confirmed', 'processing', 'packed'].includes(i.status)).map(i => ({ ...i, order_number: o.order_number, created_at: o.created_at })));
      const lowStock = db.listSellerProducts(sellerId).filter(p => p.stock < 10 && p.status === 'active');
      return { summary, pending: pending.slice(0, 10), lowStock, recentOrders: orders.slice(0, 5), ledger: db.getSellerLedgerSummary(sellerId) };
    },
  },
  'seller.products': {
    roles: ['seller'],
    approvedSeller: true,
    handler: (ctx) => db.listSellerProducts(requireSeller(ctx).sellerId),
  },
  'seller.productSave': {
    roles: ['seller'],
    approvedSeller: true,
    schema: z.object({ data: productSchema }),
    handler: (ctx, { data }) => {
      const { sellerId } = requireSeller(ctx);
      const discount = Math.round(((data.mrp - data.price) / data.mrp) * 100);
      const status = data.submit ? 'pending_approval' : 'draft';
      if (data.id) {
        const existing = db.getProductById(data.id);
        if (!existing || existing.seller_id !== sellerId) throw new ActionError('Product not found', 404); // never reveal other sellers' products
        const patch = { name: data.name, category_id: data.category_id, brand_id: data.brand_id || undefined, description: data.description, specifications: data.specifications, mrp: data.mrp, price: data.price, discount_percent: discount, stock: data.stock, cod_available: data.cod_available, delivery_days: data.delivery_days, return_window_days: data.return_window_days } as any;
        // Edits to live listings go back through moderation when content changes
        if (existing.status === 'active' && (data.name !== existing.name || data.description !== existing.description)) patch.status = 'pending_approval';
        else if (existing.status !== 'active' && data.submit) patch.status = 'pending_approval';
        const updated = db.updateProduct(data.id, patch);
        db.replaceProductImages(data.id, data.images);
        return db.getProductById(updated.id);
      }
      const p = db.createProduct({
        seller_id: sellerId, name: data.name, slug: `${slugify(data.name)}-${Math.random().toString(36).slice(2, 7)}`,
        category_id: data.category_id, brand_id: data.brand_id || undefined, description: data.description, specifications: data.specifications,
        mrp: data.mrp, price: data.price, discount_percent: discount, stock: data.stock, status: status as any,
        cod_available: data.cod_available, delivery_days: data.delivery_days, return_window_days: data.return_window_days,
        is_featured: false, is_trending: false, images: data.images, variants: [],
      } as any);
      return p;
    },
  },
  'seller.productStock': {
    roles: ['seller'],
    approvedSeller: true,
    schema: z.object({ productId: id, stock: z.number().int().min(0).max(1_000_000), price: z.number().positive().optional() }),
    handler: (ctx, { productId, stock, price }) => {
      const { sellerId } = requireSeller(ctx);
      const p = db.getProductById(productId);
      if (!p || p.seller_id !== sellerId) throw new ActionError('Product not found', 404);
      const patch: any = { stock };
      if (price !== undefined) {
        if (price > p.mrp) throw new ActionError('Selling price cannot exceed MRP');
        patch.price = price;
        patch.discount_percent = Math.round(((p.mrp - price) / p.mrp) * 100);
      }
      return db.updateProduct(productId, patch);
    },
  },
  'seller.productSetActive': {
    roles: ['seller'],
    approvedSeller: true,
    schema: z.object({ productId: id, active: z.boolean() }),
    handler: (ctx, { productId, active }) => {
      const { sellerId } = requireSeller(ctx);
      const p = db.getProductById(productId);
      if (!p || p.seller_id !== sellerId) throw new ActionError('Product not found', 404);
      if (active && p.status !== 'inactive' && p.status !== 'draft') throw new ActionError('Only inactive listings can be reactivated');
      return db.updateProduct(productId, { status: active ? 'pending_approval' : 'inactive' });
    },
  },
  'seller.orders': {
    roles: ['seller'],
    approvedSeller: true,
    handler: (ctx) => db.listOrdersForSeller(requireSeller(ctx).sellerId),
  },
  'seller.orderItemUpdate': {
    roles: ['seller'],
    approvedSeller: true,
    schema: z.object({ orderItemId: id, status: z.enum(['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']), trackingNumber: z.string().max(60).optional(), note: z.string().max(300).optional() }),
    handler: (ctx, { orderItemId, status, trackingNumber, note }) => {
      const { sellerId, user } = requireSeller(ctx);
      const oi = db.getOrderItemById(orderItemId);
      if (!oi || oi.seller_id !== sellerId) throw new ActionError('Order item not found', 404);
      const cur = oi.status;
      if (status === 'cancelled') {
        if (!['placed', 'confirmed', 'processing'].includes(cur)) throw new ActionError('Only unshipped items can be cancelled');
        db.requestCancellation(orderItemId, note || 'Cancelled by seller');
        return { ok: true };
      }
      const ci = SELLER_ITEM_FLOW.indexOf(status as any);
      const pi = SELLER_ITEM_FLOW.indexOf(cur as any);
      const expectedNext = cur === 'placed' ? 0 : pi + 1;
      if (ci !== expectedNext) throw new ActionError(`Invalid status change from ${cur} to ${status}`);
      if (status === 'shipped' && !trackingNumber) throw new ActionError('Please enter a tracking number (or courier reference) when marking as shipped');
      db.updateOrderItemStatus(orderItemId, status, note, user.id);
      if (trackingNumber) db.setTracking(orderItemId, trackingNumber);
      return { ok: true };
    },
  },
  'seller.returnDecision': {
    roles: ['seller'],
    approvedSeller: true,
    schema: z.object({ orderItemId: id, approve: z.boolean(), note: z.string().max(300).optional() }),
    handler: (ctx, { orderItemId, approve, note }) => {
      const { sellerId, user } = requireSeller(ctx);
      const oi = db.getOrderItemById(orderItemId);
      if (!oi || oi.seller_id !== sellerId) throw new ActionError('Order item not found', 404);
      if (oi.status !== 'return_requested') throw new ActionError('No return request pending for this item');
      if (approve) {
        db.updateOrderItemStatus(orderItemId, 'returned', note || 'Return approved', user.id);
        db.markItemRefundPending(orderItemId);
      } else {
        db.updateOrderItemStatus(orderItemId, 'delivered', note || 'Return rejected by seller', user.id);
      }
      return { ok: true };
    },
  },
  'seller.earnings': {
    roles: ['seller'],
    approvedSeller: true,
    handler: (ctx) => {
      const { sellerId } = requireSeller(ctx);
      return { summary: db.getSellerLedgerSummary(sellerId), ledger: db.getSellerLedger(sellerId), settlements: db.listSettlements(sellerId) };
    },
  },
  'seller.tickets': { roles: ['seller'], approvedSeller: true, handler: (ctx) => db.listTickets({ userId: ctx.user!.id }) },

  /* ---------- admin ---------- */
  'admin.overview': {
    roles: ['admin'],
    handler: (ctx) => { requireAdmin(ctx); return { stats: db.getAdminStats(), sellers: db.listAllSellers(), audit: db.listAuditLogs().slice(0, 20) }; },
  },
  'admin.sellers': { roles: ['admin'], handler: (ctx) => { requireAdmin(ctx); return db.listAllSellers(); } },
  'admin.sellerStatus': {
    roles: ['admin'],
    schema: z.object({ sellerId: id, status: z.enum(['approved', 'rejected', 'suspended', 'pending']), reason: z.string().max(300).optional() }),
    handler: (ctx, { sellerId, status, reason }) => {
      const admin = requireAdmin(ctx);
      if ((status === 'rejected' || status === 'suspended') && !reason) throw new ActionError('Please give a reason');
      db.updateSellerStatus(sellerId, status, reason, admin.id);
      return { ok: true };
    },
  },
  'admin.sellerCommission': {
    roles: ['admin'],
    schema: z.object({ sellerId: id, rate: z.number().min(0).max(50) }),
    handler: (ctx, { sellerId, rate }) => {
      const admin = requireAdmin(ctx);
      db.setSellerCommission(sellerId, rate);
      db.audit(admin.id, 'commission_changed', 'seller', sellerId, { rate });
      return { ok: true };
    },
  },
  'admin.products': { roles: ['admin'], schema: z.object({ status: z.string().optional() }).optional(), handler: (ctx, input) => { requireAdmin(ctx); return db.listAllProducts(input?.status ? { status: input.status } : undefined); } },
  'admin.productModerate': {
    roles: ['admin'],
    schema: z.object({ productId: id, approve: z.boolean(), reason: z.string().max(300).optional() }),
    handler: (ctx, { productId, approve, reason }) => {
      const admin = requireAdmin(ctx);
      if (!approve && !reason) throw new ActionError('Please give a reason for rejection');
      db.approveProduct(productId, approve, reason, admin.id);
      db.audit(admin.id, approve ? 'product_approved' : 'product_rejected', 'product', productId, { reason });
      return { ok: true };
    },
  },
  'admin.productFeature': {
    roles: ['admin'],
    schema: z.object({ productId: id, featured: z.boolean() }),
    handler: (ctx, { productId, featured }) => { const a = requireAdmin(ctx); db.toggleFeatured(productId, featured); db.audit(a.id, 'product_featured', 'product', productId, { featured }); return { ok: true }; },
  },
  'admin.orders': { roles: ['admin'], handler: (ctx) => { requireAdmin(ctx); return db.listAllOrders(); } },
  'admin.refund': {
    roles: ['admin'],
    schema: z.object({ orderId: id, amountRupees: z.number().positive().max(10_000_000) }),
    handler: async (ctx, { orderId, amountRupees }) => {
      const admin = requireAdmin(ctx);
      const o = db.getOrderById(orderId);
      if (!o) throw new ActionError('Order not found', 404);
      if (o.payment_method !== 'razorpay' || !o.razorpay_payment_id) throw new ActionError('Only online payments can be refunded automatically. Record COD refunds manually.');
      if (!razorpayConfig().configured) throw new ActionError('Razorpay is not configured, so the refund cannot be sent. Nothing was marked as refunded.', 503);
      if (amountRupees > o.total) throw new ActionError('Refund amount exceeds order total');
      // Gateway call first; local state only changes after the gateway accepts the refund request.
      const refund = await refundRazorpayPayment(o.razorpay_payment_id, Math.round(amountRupees * 100), o.order_number);
      db.setRefundStatus(orderId, amountRupees >= o.total ? 'refund_pending' : 'partially_refunded', refund.id);
      db.audit(admin.id, 'refund_initiated', 'order', orderId, { refund_id: refund.id, amount: amountRupees });
      return { ok: true, refund_id: refund.id, gateway_status: refund.status, note: 'Refund initiated with the gateway. Status will be confirmed by the payment webhook.' };
    },
  },
  'admin.tickets': { roles: ['admin'], handler: (ctx) => { requireAdmin(ctx); return db.listAllTickets(); } },
  'admin.ticketStatus': {
    roles: ['admin'],
    schema: z.object({ ticketId: id, status: z.enum(['open', 'in_progress', 'resolved', 'closed']) }),
    handler: (ctx, { ticketId, status }) => { requireAdmin(ctx); db.setTicketStatus(ticketId, status); return { ok: true }; },
  },
  'admin.coupons': { roles: ['admin'], handler: (ctx) => { requireAdmin(ctx); return db.listCouponsAll(); } },
  'admin.couponCreate': {
    roles: ['admin'],
    schema: z.object({
      code: z.string().regex(/^[A-Z0-9]{4,20}$/, 'Use 4-20 uppercase letters or digits'),
      description: text(150), discount_type: z.enum(['percentage', 'flat']), discount_value: z.number().positive(),
      min_order_value: money, max_discount: z.number().positive().optional(), usage_limit: z.number().int().positive().optional(),
      valid_until: z.string().datetime(),
    }).refine(v => v.discount_type !== 'percentage' || v.discount_value <= 100, { message: 'Percentage cannot exceed 100', path: ['discount_value'] }),
    handler: (ctx, input) => {
      const admin = requireAdmin(ctx);
      db.createCoupon({ ...input, is_active: true, valid_from: new Date().toISOString() } as any);
      db.audit(admin.id, 'coupon_created', 'coupon', input.code, {});
      return { ok: true };
    },
  },
  'admin.audit': { roles: ['admin'], handler: (ctx) => { requireAdmin(ctx); return db.listAuditLogs(); } },
  'admin.customers': { roles: ['admin'], handler: (ctx) => { requireAdmin(ctx); return db.listUsers().filter(u => u.role === 'customer'); } },
  'admin.reports': {
    roles: ['admin'],
    handler: (ctx) => {
      requireAdmin(ctx);
      const orders = db.listAllOrders();
      const byStatus: Record<string, number> = {};
      for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      const paidRevenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total, 0);
      return { stats: db.getAdminStats(), orders_by_status: byStatus, paid_revenue: paidRevenue, order_count: orders.length };
    },
  },
};

/** Creates a Razorpay order for a local order, persisting only after the gateway returns an id. */
async function createRazorpayForOrder(localOrderId: string, receipt: string, totalRupees: number, existingRzpId?: string) {
  const amountPaise = Math.round(totalRupees * 100);
  let rzpId = existingRzpId;
  if (!rzpId) {
    const rzOrder = await createRazorpayOrder({ amountPaise, receipt, notes: { local_order_id: localOrderId } });
    rzpId = rzOrder.id;
    db.setRazorpayOrderId(localOrderId, rzpId);
  }
  const o = db.getOrderById(localOrderId)!;
  return { order: o, payment: { keyId: razorpayConfig().publicKeyId, orderId: rzpId, amount: amountPaise, currency: 'INR' } };
}

/** Server-side confirmation of a Razorpay checkout result. Browser success is never trusted by itself. */
export async function confirmRazorpayPayment(input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }, userId?: string) {
  const local = db.getOrderByRazorpayOrderId(input.razorpay_order_id);
  if (!local) throw new ActionError('Unknown payment order', 404);
  if (userId && local.user_id !== userId) throw new ActionError('Order not found', 404);
  if (local.payment_status === 'paid') return local;
  if (!verifyPaymentSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
    throw new ActionError('Payment signature verification failed', 400);
  }
  const pay = await fetchRazorpayPayment(input.razorpay_payment_id);
  if (pay.order_id !== input.razorpay_order_id) throw new ActionError('Payment does not belong to this order', 400);
  if (pay.amount !== Math.round(local.total * 100) || pay.currency !== 'INR') throw new ActionError('Payment amount mismatch', 400);
  if (pay.status !== 'captured' && pay.status !== 'authorized') {
    return local; // still pending / failed: do not mark paid
  }
  return db.markOrderPaid(local.id, input.razorpay_payment_id);
}

export const ACTION_NAMES = Object.keys(actions);
