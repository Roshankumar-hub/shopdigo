import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/server/session';
import { confirmRazorpayPayment } from '@/lib/server/actions';


const schema = z.object({
  razorpay_order_id: z.string().min(3).max(80),
  razorpay_payment_id: z.string().min(3).max(80),
  razorpay_signature: z.string().min(10).max(200),
});

/** Called by the browser after Razorpay Checkout. Verifies signature + payment status server-side. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payment response' }, { status: 422 });
  try {
    const order = await confirmRazorpayPayment(parsed.data, user.id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ data: { order_id: order.id, payment_status: order.payment_status, order_status: order.status } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Payment verification failed' }, { status: e.status || 400 });
  }
}
