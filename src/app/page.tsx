import ServerStatusCard from '@/components/ServerStatusCard';
import ServerMetricsCard from '@/components/ServerMetricsCard';
import { getServerStatus } from '@/lib/serverUtils';

export default async function DashboardPage() {
  const status = await getServerStatus();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ServerStatusCard initialStatus={status} />
        <ServerMetricsCard />
      </div>
    </div>
  );
}
