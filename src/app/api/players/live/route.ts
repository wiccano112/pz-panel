import { getPlayersOverview } from '@/lib/playerUtils';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPlayersOverview();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/players/live:', error);
    return NextResponse.json(
      {
        connectedPlayers: [],
        whitelist: [],
        bannedSteamIds: [],
        bannedIps: [],
        error: 'Failed to retrieve player overview',
      },
      { status: 500 }
    );
  }
}
