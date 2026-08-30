import { NextResponse } from 'next/server';
import { getServerStats } from '@/lib/serverUtils';

export async function GET() {
  const stats = await getServerStats();
  return NextResponse.json(stats);
}
