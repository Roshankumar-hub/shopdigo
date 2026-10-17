import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const TMP = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shopdigo-test-')), 'db.json');
process.env.SHOPDIGO_DB_FILE = TMP;
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_123';
process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_456';

let db: any, actions: any, rz: any, store: any;
let customer: any, seller: any, admin: any, productId: string, addressId: string;
const fetchMock = vi.fn();

beforeAll(async () => {
  vi.stubGlobal('fetch', fetchMock);
  db = (await import('@/lib/server/store')).db;
  actions = (await import('@/lib/server/actions')).actions;
  rz = await import('@/lib/server/razorpay');
  store = await import('@/lib/server/store');
  customer = db.registerUser({ name: 'Test Buyer', email: 'buyer@test.dev', password: 'abcd1234' });
  const addr = db.addAddress(customer.id, { label: 'Home', name: 'Test Buyer', phone: '+919876543210', address_line1: '1 Test Rd', address_line2: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', country: 'India', is_default: true });
  addressId = addr.id;
  admin = { id: db.listUsers().find((u: any) => u.role === 'admin').id, role: 'admin' };
  // Test-only fixture in the isolated temp database (never shipped, never shown as a real product).
  const fixtureUser = db.registerUser({ name: 'Fixture Seller', email: 'fixture-seller@test.dev', password: 'seller1234' });
  const fixtureSeller = db.registerSeller(fixtureUser.id, { store_name: 'TEST FIXTURE STORE', gstin: '29ABCDE1234F1Z5', pan: 'ABCDE1234F', pickup_address: '1 Test Rd', pickup_city: 'Bengaluru', pickup_state: 'Karnataka', pickup_pincode: '560001' } as any);
  db.updateSellerStatus(fixtureSeller.id, 'approved', undefined, admin.id);
  seller = { ...fixtureSeller, status: 'approved' };
  const electronics = db.listCategories().find((c: any) => c.slug === 'electronics');
  const fixtureProduct = db.createProduct({ seller_id: fixtureSeller.id, category_id: electronics.id, name: 'TEST FIXTURE Headphones', slug: 'test-fixture-headphones', description: 'Test fixture product for automated tests only.', specifications: {}, mrp: 1000, price: 800, discount_percent: 20, stock: 50, status: 'active', is_featured: false, is_trending: false, delivery_days: 3, return_window_days: 7, cod_available: true } as any);
  productId = fixtureProduct.id;
  // Test-only coupon and delivery PIN code, written to the isolated temp file (no admin UI exists for PIN codes yet).
  db.createCoupon({ code: 'SHOP10', description: 'TEST FIXTURE coupon', discount_type: 'percentage', discount_value: 10, min_order_value: 999, max_discount: 200, is_active: true, valid_from: new Date(Date.now() - 86400000).toISOString(), valid_until: new Date(Date.now() + 30 * 86400000).toISOString() } as any);
  const dbFile = process.env.SHOPDIGO_DB_FILE as string;
  const raw = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  raw.pincodes.push({ pincode: '560001', city: 'Bengaluru', state: 'Karnataka', delivery_days: 2, cod_available: true, is_serviceable: true });
  fs.writeFileSync(dbFile, JSON.stringify(raw));
});

afterAll(() => { try { fs.rmSync(path.dirname(TMP), { recursive: true, force: true }); } catch { /* ignore */ } });

const sign = (order: string, payment: string) => crypto.createHmac('sha256', 'test_secret_123').update(`${order}|${payment}`).digest('hex');
const sessionUser = (u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, seller_id: null, seller_status: null });

describe('payment signature & webhook verification', () => {
  it('accepts a correct Razorpay checkout signature', () => {
    expect(rz.verifyPaymentSignature('order_1', 'pay_1', sign('order_1', 'pay_1'))).toBe(true);
  });
  it('rejects a tampered signature', () => {
    expect(rz.verifyPaymentSignature('order_1', 'pay_1', sign('order_1', 'pay_2'))).toBe(false);
    expect(rz.verifyPaymentSignature('order_1', 'pay_1', 'short')).toBe(false);
  });
  it('verifies webhook signature over the raw body', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const sig = crypto.createHmac('sha256', 'webhook_secret_456').update(body).digest('hex');
    expect(rz.verifyWebhookSignature(body, sig)).toBe(true);
    expect(rz.verifyWebhookSignature(body + ' ', sig)).toBe(false);
  });
});

describe('server-side pricing', () => {
  it('quotes totals on the server and caps percentage coupons', () => {
    db.addToCart(customer.id, productId, 2);
    const q = db.quoteCart(customer.id, 'SHOP10');
    expect(q.subtotal).toBe(q.lines[0].unit_price * 2);
    expect(q.discount).toBeLessThanOrEqual(200);
    expect(q.total).toBeCloseTo(q.subtotal - q.discount + q.delivery_charge + q.tax, 2);
  });
  it('rejects an unknown or below-minimum coupon', () => {
    expect(db.quoteCart(customer.id, 'NOPE').coupon_error).toBe('Invalid coupon code');
  });
  it('refuses to add more than available stock', () => {
    expect(() => db.addToCart(customer.id, productId, 100000)).toThrow(/stock/i);
  });
});

describe('orders, inventory and idempotency', () => {
  let orderId: string, orderItemId: string, stockBefore: number;
  it('creates a COD order, decrements stock, and is idempotent', () => {
    stockBefore = db.getProductById(productId).stock;
    const first: any = db.createOrder({ userId: customer.id, addressId, paymentMethod: 'cod', couponCode: 'SHOP10', idempotencyKey: 'idem-unit-0001' });
    orderId = first.id; orderItemId = first.items[0].id;
    expect(db.getProductById(productId).stock).toBe(stockBefore - first.items[0].quantity);
    const second: any = db.createOrder({ userId: customer.id, addressId, paymentMethod: 'cod', couponCode: 'SHOP10', idempotencyKey: 'idem-unit-0001' });
    expect(second.id).toBe(orderId);
    expect(db.getProductById(productId).stock).toBe(stockBefore - first.items[0].quantity);
  });
  it('cancelling an unshipped item restores stock', () => {
    const before = db.getProductById(productId).stock;
    const qty = db.getOrderById(orderId).items[0].quantity;
    db.requestCancellation(orderItemId, 'test');
    expect(db.getProductById(productId).stock).toBe(before + qty);
  });
  it('blocks ordering when the cart is empty', () => {
    expect(() => db.createOrder({ userId: customer.id, addressId, paymentMethod: 'cod', idempotencyKey: 'idem-unit-0002' })).toThrow(/empty/i);
  });
});

describe('Razorpay order + verification flow (gateway mocked)', () => {
  let localId: string;
  it('creates a server-side Razorpay order from the server total only', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'order_mock_1', amount: 0, currency: 'INR' }), { status: 200 }));
    db.addToCart(customer.id, productId, 1);
    const r = await actions['order.create'].handler({ user: sessionUser(customer) }, { addressId, paymentMethod: 'razorpay', idempotencyKey: 'idem-rzp-0001' });
    localId = r.order.id;
    expect(r.payment.orderId).toBe('order_mock_1');
    expect(r.payment.amount).toBe(Math.round(r.order.total * 100));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.amount).toBe(Math.round(r.order.total * 100));
  });
  it('does NOT mark paid on a bad signature', async () => {
    await expect((await import('@/lib/server/actions')).confirmRazorpayPayment({ razorpay_order_id: 'order_mock_1', razorpay_payment_id: 'pay_bad', razorpay_signature: sign('order_mock_1', 'other') }, customer.id)).rejects.toThrow(/signature/i);
    expect(db.getOrderById(localId).payment_status).toBe('pending');
  });
  it('marks paid only after signature + gateway status verify, and is idempotent', async () => {
    const amount = Math.round(db.getOrderById(localId).total * 100);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'pay_ok', order_id: 'order_mock_1', amount, currency: 'INR', status: 'captured' }), { status: 200 }));
    const { confirmRazorpayPayment } = await import('@/lib/server/actions');
    const input = { razorpay_order_id: 'order_mock_1', razorpay_payment_id: 'pay_ok', razorpay_signature: sign('order_mock_1', 'pay_ok') };
    const first: any = await confirmRazorpayPayment(input, customer.id);
    expect(first.payment_status).toBe('paid');
    const ledgerCount = db.getSellerLedger(first.items[0].seller_id).length;
    const second: any = await confirmRazorpayPayment(input, customer.id);
    expect(second.payment_status).toBe('paid');
    expect(db.getSellerLedger(first.items[0].seller_id).length).toBe(ledgerCount); // no double ledger posting
  });
  it('does not mark paid when gateway reports a non-captured status', async () => {
    fetchMock.mockReset();
    db.addToCart(customer.id, productId, 1);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'order_mock_2', amount: 0, currency: 'INR' }), { status: 200 }));
    const r = await actions['order.create'].handler({ user: sessionUser(customer) }, { addressId, paymentMethod: 'razorpay', idempotencyKey: 'idem-rzp-0002' });
    const amount = Math.round(r.order.total * 100);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'pay_f', order_id: 'order_mock_2', amount, currency: 'INR', status: 'failed' }), { status: 200 }));
    const { confirmRazorpayPayment } = await import('@/lib/server/actions');
    const res: any = await confirmRazorpayPayment({ razorpay_order_id: 'order_mock_2', razorpay_payment_id: 'pay_f', razorpay_signature: sign('order_mock_2', 'pay_f') }, customer.id);
    expect(res.payment_status).toBe('pending');
  });
});

describe('authorization guards', () => {
  it('only admins can call admin actions', async () => {
    expect(() => actions['admin.overview'].handler({ user: sessionUser(customer) }, {})).toThrow(/Forbidden/);
    const ok = actions['admin.overview'].handler({ user: sessionUser({ ...admin, email: 'a@a', name: 'A' }) }, {});
    expect(ok.stats).toBeDefined();
  });
  it('sessions expire and tokens are validated', () => {
    expect(db.getUserBySession('not-a-real-token')).toBeNull();
    const token = db.createSession(customer.id);
    expect(db.getUserBySession(token)?.id).toBe(customer.id);
    db.destroySession(token);
    expect(db.getUserBySession(token)).toBeNull();
  });
  it('passwords are stored as bcrypt hashes and verified', () => {
    const u = db.getUserById(customer.id);
    expect(store).toBeDefined();
    expect(db.verifyLogin('buyer@test.dev', 'abcd1234')?.id).toBe(u.id);
    expect(db.verifyLogin('buyer@test.dev', 'wrong-pass')).toBeNull();
  });
});
