import { NextResponse } from 'next/server';
import { getServerStats } from '@/lib/serverUtils';

export async function GET() {
  try {
    const stats = await getServerStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { cpu: '0%', ram: '0B', net: '0B/s', error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
