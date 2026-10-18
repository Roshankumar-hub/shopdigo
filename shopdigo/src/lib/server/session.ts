import 'server-only';
import { cookies } from 'next/headers';
import { db } from './store';

export const SESSION_COOKIE = 'sd_session';
const isProd = process.env.NODE_ENV === 'production';

export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return db.getUserBySession(token);
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
}
