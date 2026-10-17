import { NextResponse } from 'next/server';
import { actions, ActionError } from '@/lib/server/actions';
import { getSessionUser } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/ratelimit';
import { db } from '@/lib/server/store';


/**
 * Single RPC-style entry point for the app. Authorization is enforced here
 * (role + seller approval) before the handler runs; handlers also check ownership.
 * Body: { action: string, payload?: object }
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
  if (!rateLimit(`action:${ip}`, 600, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }
  let body: { action?: string; payload?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const name = typeof body.action === 'string' ? body.action : '';
  const def = actions[name];
  if (!def) return NextResponse.json({ error: 'Unknown action' }, { status: 404 });

  const user = await getSessionUser();
  if (def.roles !== 'public') {
    if (!user) return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
    if (def.roles && !def.roles.includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (def.approvedSeller && user.seller_status !== 'approved') {
      return NextResponse.json({ error: 'Seller account not approved' }, { status: 403 });
    }
  }

  let input: unknown = body.payload ?? {};
  if (def.schema) {
    const parsed = def.schema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json({ error: first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input' }, { status: 422 });
    }
    input = parsed.data;
  }

  try {
    const result = await def.handler({ user: user as any }, input);
    return NextResponse.json({ data: result ?? null });
  } catch (err) {
    if (err instanceof ActionError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(`[action:${name}]`, err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
void db;
