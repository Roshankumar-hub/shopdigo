import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/server/store';
import { clearSessionCookie, SESSION_COOKIE } from '@/lib/server/session';


export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) db.destroySession(token);
  await clearSessionCookie();
  return NextResponse.json({ data: { ok: true } });
}
