export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placeholder for ServerStatusCard */}
        <div className="p-4 bg-white shadow rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-2">Server Status</h3>
          <p>Status: Loading...</p>
        </div>
        
        {/* Placeholder for ServerMetricsCard */}
        <div className="p-4 bg-white shadow rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-2">Server Metrics</h3>
          <p>CPU / RAM: Loading...</p>
        </div>
      </div>
    </div>
  );
}
