import 'server-only';
import crypto from 'crypto';

/**
 * Razorpay REST integration (no SDK needed). Keys come from server env only:
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
 * Test-mode keys start with "rzp_test_".
 */

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    configured: !!keyId && !!keySecret,
    publicKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId,
  };
}

const API = 'https://api.razorpay.com/v1';

async function rzp(path: string, init?: RequestInit) {
  const cfg = razorpayConfig();
  if (!cfg.configured) throw new Error('Razorpay is not configured');
  const res = await fetch(API + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64'),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.description || `Razorpay error ${res.status}`);
  return body;
}

export async function createRazorpayOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
  return rzp('/orders', {
    method: 'POST',
    body: JSON.stringify({ amount: input.amountPaise, currency: 'INR', receipt: input.receipt, notes: input.notes }),
  }) as Promise<{ id: string; amount: number; currency: string }>;
}

export async function fetchRazorpayPayment(paymentId: string) {
  return rzp(`/payments/${encodeURIComponent(paymentId)}`) as Promise<{ id: string; order_id: string; amount: number; status: string; currency: string }>;
}

export async function refundRazorpayPayment(paymentId: string, amountPaise: number, receipt: string) {
  return rzp(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    body: JSON.stringify({ amount: amountPaise, speed: 'normal', receipt }),
  }) as Promise<{ id: string; status: string; amount: number }>;
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Checkout handler signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const cfg = razorpayConfig();
  if (!cfg.configured) return false;
  const expected = crypto.createHmac('sha256', cfg.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook_secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const cfg = razorpayConfig();
  if (!cfg.webhookSecret) return false;
  const expected = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}
