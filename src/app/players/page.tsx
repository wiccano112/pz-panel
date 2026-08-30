import { getPlayersOverview } from '@/lib/playerUtils';
import PlayerManagerClient from '@/components/PlayerManagerClient';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const initialData = await getPlayersOverview();

  return (
    <div>
      <PlayerManagerClient initialData={initialData} />
    </div>
  );
}
