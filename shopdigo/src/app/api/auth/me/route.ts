import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';


export async function GET() {
  return NextResponse.json({ data: await getSessionUser() });
}
