import ServerStatusCard from '@/components/ServerStatusCard';
import ServerMetricsCard from '@/components/ServerMetricsCard';
import ServerLogsCard from '@/components/ServerLogsCard';
import { getServerStatus } from '@/lib/serverUtils';
 
export const dynamic = 'force-dynamic';
 
export default async function DashboardPage() {
  const status = await getServerStatus();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>
      
      {/* Status & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ServerStatusCard initialStatus={status} />
        <ServerMetricsCard status={status} />
      </div>

      {/* Live Server Logs Stream */}
      <ServerLogsCard />
    </div>
  );
}
