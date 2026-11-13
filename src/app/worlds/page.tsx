import { getFreezeCatalog } from '@/lib/freezeUtils';
import { getServerStatus } from '@/lib/serverUtils';
import { getLiveConnectedPlayers } from '@/lib/playerUtils';
import WorldFreezeClient from '@/components/WorldFreezeClient';

export const dynamic = 'force-dynamic';

export default async function WorldsPage() {
  const [catalog, serverStatus, connectedPlayers] = await Promise.all([
    getFreezeCatalog(),
    getServerStatus(),
    getLiveConnectedPlayers(),
  ]);

  return (
    <div>
      <WorldFreezeClient
        initialCatalog={catalog}
        initialServerStatus={serverStatus}
        initialConnectedPlayers={connectedPlayers}
      />
    </div>
  );
}
