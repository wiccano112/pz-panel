import { NextResponse } from 'next/server';
import { getServerStats, getServerUptime, getConnectedPlayers, getServerStatus, getGameVersion } from '@/lib/serverUtils';

export async function GET() {
  try {
    const [stats, uptime, players, status, gameVersion] = await Promise.all([
      getServerStats(),
      getServerUptime(),
      getConnectedPlayers(),
      getServerStatus(),
      getGameVersion(),
    ]);
    return NextResponse.json({ ...stats, uptime, players, status, gameVersion });
  } catch {
    return NextResponse.json(
      { cpu: '0%', ram: '0B', net: '0B/s', uptime: null, players: 0, status: 'OFFLINE', gameVersion: null, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
