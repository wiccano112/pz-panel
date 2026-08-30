import { readServerProperties } from '@/lib/serverUtils';
import { readSpawnRegions } from '@/lib/spawnRegionUtils';
import ServerSettingsClient from '@/components/ServerSettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [initialProperties, initialSpawnRegions] = await Promise.all([
    readServerProperties(),
    readSpawnRegions(),
  ]);

  return (
    <div>
      <ServerSettingsClient
        initialProperties={initialProperties}
        initialSpawnRegions={initialSpawnRegions}
      />
    </div>
  );
}
