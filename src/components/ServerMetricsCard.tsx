"use client";

import useSWR from 'swr';
import { Activity, Cpu, HardDrive, Network } from 'lucide-react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

interface ServerMetricsCardProps {
  status: string;
}

export default function ServerMetricsCard({ status }: ServerMetricsCardProps) {
  const { data, error, isLoading } = useSWR(
    status === 'RUNNING' ? '/api/stats' : null, 
    fetcher, 
    { refreshInterval: 3000 }
  );

  if (error) {
    return (
      <div className="p-6 bg-white shadow rounded-lg border border-red-200">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Metrics Error</h3>
        <p className="text-sm text-slate-600">Failed to load server metrics.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white shadow rounded-lg border border-slate-200">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-slate-800">Server Metrics</h3>
      </div>
      
      {isLoading && status === 'RUNNING' ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-4 bg-slate-200 rounded w-5/6"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
            <div className="flex items-center space-x-2 text-slate-600">
              <Cpu className="w-4 h-4" />
              <span className="text-sm font-medium">CPU Usage</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{status === 'RUNNING' ? (data?.cpu || '0%') : 'Offline'}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
            <div className="flex items-center space-x-2 text-slate-600">
              <HardDrive className="w-4 h-4" />
              <span className="text-sm font-medium">RAM Usage</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{status === 'RUNNING' ? (data?.ram || '0B') : 'Offline'}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
            <div className="flex items-center space-x-2 text-slate-600">
              <Network className="w-4 h-4" />
              <span className="text-sm font-medium">Network I/O</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{status === 'RUNNING' ? (data?.net || '0B / 0B') : 'Offline'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
