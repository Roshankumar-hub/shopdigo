import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/store';
import { setSessionCookie } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/ratelimit';


const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().regex(/^(\+91)?[6-9][0-9]{9}$/, 'Enter a valid 10-digit Indian mobile number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200)
    .regex(/[A-Za-z]/, 'Password must include a letter')
    .regex(/[0-9]/, 'Password must include a number'),
  agreedTerms: z.literal(true, { error: 'Please accept the Terms and Privacy Policy' }),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
  if (!rateLimit(`register:${ip}`, 30, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many sign-ups from this network. Try later.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  try {
    const user = db.registerUser({ name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone || undefined, password: parsed.data.password });
    await setSessionCookie(db.createSession(user.id));
    return NextResponse.json({ data: user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 409 });
  }
}
