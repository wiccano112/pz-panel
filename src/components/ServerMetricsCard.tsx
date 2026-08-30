"use client";

import useSWR from 'swr';
import { Activity, Clock, Cpu, HardDrive, Network, Users } from 'lucide-react';
import { METRICS_POLL_INTERVAL_MS } from '@/constants/game';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

interface ServerMetricsCardProps {
  status: string;
}

export default function ServerMetricsCard({ status: initialStatus }: ServerMetricsCardProps) {
  const { data, error, isLoading } = useSWR('/api/stats', fetcher, {
    refreshInterval: METRICS_POLL_INTERVAL_MS,
  });

  const currentStatus: string = data?.status || initialStatus;
  const isOnlineLike = currentStatus === 'ONLINE' || currentStatus === 'STARTING' || currentStatus === 'RUNNING';

  if (error && !data) {
    return (
      <div className="p-6 bg-zinc-900 shadow rounded-lg border border-red-800">
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
      
      {isLoading && !data ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-zinc-800 rounded-md"></div>
          <div className="h-10 bg-zinc-800 rounded-md"></div>
          <div className="h-10 bg-zinc-800 rounded-md"></div>
          <div className="h-10 bg-zinc-800 rounded-md"></div>
          <div className="h-10 bg-zinc-800 rounded-md"></div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2.5 bg-zinc-800/80 rounded-md border border-zinc-700/60">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium">CPU Usage</span>
            </div>
            <span className="text-sm font-semibold font-mono text-white">
              {isOnlineLike ? (data?.cpu || '0%') : 'Offline'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2.5 bg-zinc-800/80 rounded-md border border-zinc-700/60">
            <div className="flex items-center space-x-2 text-zinc-300">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">RAM Usage</span>
            </div>
            <span className="text-sm font-semibold font-mono text-white">
              {isOnlineLike ? (data?.ram || '0B') : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-zinc-800/80 rounded-md border border-zinc-700/60">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Network className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-medium">Network I/O</span>
            </div>
            <span className="text-sm font-semibold font-mono text-white">
              {isOnlineLike ? (data?.net || '0B / 0B') : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-zinc-800/80 rounded-md border border-zinc-700/60">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium">Uptime</span>
            </div>
            <span className="text-sm font-semibold font-mono text-white">
              {isOnlineLike ? (data?.uptime ?? '—') : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-zinc-800/80 rounded-md border border-zinc-700/60">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Users className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium">Players Online</span>
            </div>
            <span className="text-sm font-semibold font-mono text-white">
              {isOnlineLike ? (data?.players ?? 0) : 'Offline'}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
