import { NextResponse } from 'next/server';
import { getFreezeCatalog } from '@/lib/freezeUtils';
import { getServerStatus } from '@/lib/serverUtils';
import { getLiveConnectedPlayers } from '@/lib/playerUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [catalog, serverStatus, connectedPlayers] = await Promise.all([
      getFreezeCatalog(),
      getServerStatus(),
      getLiveConnectedPlayers(),
    ]);

    return NextResponse.json({
      catalog,
      serverStatus,
      connectedPlayers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch world catalog' },
      { status: 500 }
    );
  }
}
