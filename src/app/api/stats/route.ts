import { NextResponse } from 'next/server';
import { getServerStats, getServerUptime, getConnectedPlayers, getServerStatus } from '@/lib/serverUtils';

export async function GET() {
  try {
    const [stats, uptime, players, status] = await Promise.all([
      getServerStats(),
      getServerUptime(),
      getConnectedPlayers(),
      getServerStatus(),
    ]);
    return NextResponse.json({ ...stats, uptime, players, status });
  } catch {
    return NextResponse.json(
      { cpu: '0%', ram: '0B', net: '0B/s', uptime: null, players: 0, status: 'OFFLINE', error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
