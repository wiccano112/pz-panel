"use client";

import useSWR from 'swr';
import { Activity, Clock, Cpu, HardDrive, Network, Users } from 'lucide-react';

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
      <div className="p-6 bg-zinc-900 shadow rounded-lg border border-red-700">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Metrics Error</h3>
        <p className="text-sm text-zinc-400">Failed to load server metrics.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-zinc-900 shadow rounded-lg border border-zinc-700">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">Server Metrics</h3>
      </div>
      
      {isLoading && status === 'RUNNING' ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
          <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
          <div className="h-4 bg-zinc-700 rounded w-5/6"></div>
          <div className="h-4 bg-zinc-700 rounded w-2/3"></div>
          <div className="h-4 bg-zinc-700 rounded w-1/3"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-md">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Cpu className="w-4 h-4" />
              <span className="text-sm font-medium">CPU Usage</span>
            </div>
            <span className="text-sm font-semibold text-white">{status === 'RUNNING' ? (data?.cpu || '0%') : 'Offline'}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-md">
            <div className="flex items-center space-x-2 text-zinc-300">
              <HardDrive className="w-4 h-4" />
              <span className="text-sm font-medium">RAM Usage</span>
            </div>
            <span className="text-sm font-semibold text-white">{status === 'RUNNING' ? (data?.ram || '0B') : 'Offline'}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-md">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Network className="w-4 h-4" />
              <span className="text-sm font-medium">Network I/O</span>
            </div>
            <span className="text-sm font-semibold text-white">{status === 'RUNNING' ? (data?.net || '0B / 0B') : 'Offline'}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-md">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Uptime</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {status === 'RUNNING' ? (data?.uptime ?? '—') : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-md">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Players Online</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {status === 'RUNNING' ? (data?.players ?? 0) : 'Offline'}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
