import { NextResponse } from 'next/server';
import { verifyWebhookSignature, fetchRazorpayPayment } from '@/lib/server/razorpay';
import { db } from '@/lib/server/store';


/**
 * Razorpay webhook. Signature is checked against the RAW body with RAZORPAY_WEBHOOK_SECRET.
 * Handles payment.captured (marks paid) and payment.failed (releases stock).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature') || '';
  if (!verifyWebhookSignature(raw, sig)) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  const payment = event?.payload?.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ data: { ignored: true } });
  const local = db.getOrderByRazorpayOrderId(payment.order_id);
  if (!local) return NextResponse.json({ data: { ignored: true } });

  if (event.event === 'payment.captured') {
    // Re-verify with the API rather than trusting the webhook body alone.
    const verified = await fetchRazorpayPayment(payment.id);
    if (verified.order_id === payment.order_id && verified.status === 'captured' && verified.amount === Math.round(local.total * 100)) {
      db.markOrderPaid(local.id, payment.id);
    }
  } else if (event.event === 'payment.failed') {
    db.releaseUnpaidOrder(local.id, 'Online payment failed');
  }
  return NextResponse.json({ data: { received: true } });
}
