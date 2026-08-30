import { NextResponse } from 'next/server';
import { getServerStats, getServerUptime, getConnectedPlayers } from '@/lib/serverUtils';

export async function GET() {
  try {
    const [stats, uptime, players] = await Promise.all([
      getServerStats(),
      getServerUptime(),
      getConnectedPlayers(),
    ]);
    return NextResponse.json({ ...stats, uptime, players });
  } catch (error) {
    return NextResponse.json(
      { cpu: '0%', ram: '0B', net: '0B/s', uptime: null, players: 0, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
