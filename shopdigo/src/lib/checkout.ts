'use client';

declare global {
  interface Window { Razorpay?: any }
}

/** Loads Razorpay Checkout.js. Returns false if the script cannot be loaded. */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface PaymentPayload { keyId: string; orderId: string; amount: number; currency: string }

/**
 * Opens Razorpay Checkout. Resolves with the gateway response; the caller must
 * still verify it on the server (/api/payments/razorpay/verify). Never marks paid here.
 */
export async function openRazorpayCheckout(p: PaymentPayload, prefill: { name?: string; email?: string; contact?: string }) {
  const ok = await loadRazorpayScript();
  if (!ok || !window.Razorpay) throw new Error('Could not load the payment window. Check your connection and try again.');
  return new Promise<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: p.keyId,
      amount: p.amount,
      currency: p.currency,
      name: 'SHOPDIGO',
      description: 'Order payment',
      order_id: p.orderId,
      prefill,
      theme: { color: '#2563eb' },
      handler: (r: any) => resolve({ razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }),
      modal: { ondismiss: () => reject(new Error('Payment window closed before payment was completed. Your order is still pending; you can retry payment.')) },
    });
    rzp.on('payment.failed', (resp: any) => reject(new Error(resp?.error?.description || 'Payment failed')));
    rzp.open();
  });
}
