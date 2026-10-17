import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/store';
import { setSessionCookie } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/ratelimit';


const schema = z.object({ email: z.string().email().max(120), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
  if (!rateLimit(`login:${ip}`, 30, 15 * 60_000)) {
    return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email and password' }, { status: 422 });
  const user = db.verifyLogin(parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  await setSessionCookie(db.createSession(user.id));
  return NextResponse.json({ data: user });
}
