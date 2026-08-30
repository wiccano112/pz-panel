"use client";

import { useActionState } from 'react';
import useSWR from 'swr';
import { handleServerAction } from '@/app/actions';
import { Play, Square, RotateCw, Server, CheckCircle2, Loader2, CircleOff } from 'lucide-react';

interface ServerStatusCardProps {
  initialStatus: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
};

export default function ServerStatusCard({ initialStatus }: ServerStatusCardProps) {
  const [state, formAction, isPending] = useActionState(handleServerAction, null);

  const { data } = useSWR('/api/stats', fetcher, {
    refreshInterval: 3000,
    fallbackData: { status: initialStatus },
  });

  const currentStatus: 'ONLINE' | 'STARTING' | 'OFFLINE' = data?.status || initialStatus;

  const isOnline = currentStatus === 'ONLINE';
  const isStarting = currentStatus === 'STARTING';
  const isOffline = currentStatus === 'OFFLINE';

  return (
    <div className="p-6 bg-zinc-900 shadow rounded-lg border border-zinc-700 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Server Status</h3>
          </div>

          {/* Status Badge */}
          {isOnline && (
            <span className="flex items-center space-x-1.5 px-3 py-1 text-xs font-bold rounded-full text-emerald-300 bg-emerald-950/70 border border-emerald-700 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE (READY)</span>
            </span>
          )}

          {isStarting && (
            <span className="flex items-center space-x-1.5 px-3 py-1 text-xs font-bold rounded-full text-amber-300 bg-amber-950/70 border border-amber-700 shadow-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>BOOTING / LOADING</span>
            </span>
          )}

          {isOffline && (
            <span className="flex items-center space-x-1.5 px-3 py-1 text-xs font-bold rounded-full text-rose-300 bg-rose-950/70 border border-rose-800 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>OFFLINE</span>
            </span>
          )}
        </div>

        {/* Status Subtitle Note */}
        <p className="text-xs text-zinc-400 mb-6">
          {isOnline && (
            <span className="flex items-center space-x-1 text-emerald-400/90">
              <CheckCircle2 className="w-3.5 h-3.5 inline" />
              <span>Ports 16261/16262 open. Players can join now.</span>
            </span>
          )}
          {isStarting && (
            <span className="flex items-center space-x-1 text-amber-300/90">
              <Loader2 className="w-3.5 h-3.5 inline animate-spin" />
              <span>Java starting: downloading workshop mods & initializing world...</span>
            </span>
          )}
          {isOffline && (
            <span className="flex items-center space-x-1 text-zinc-500">
              <CircleOff className="w-3.5 h-3.5 inline" />
              <span>Container is stopped. Press Start to boot the server.</span>
            </span>
          )}
        </p>
      </div>

      {/* Control Buttons */}
      <div>
        <form action={formAction} className="grid grid-cols-3 gap-3">
          <button
            type="submit"
            name="actionType"
            value="start"
            disabled={isPending || !isOffline}
            className="flex items-center justify-center space-x-2 p-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Start</span>
          </button>

          <button
            type="submit"
            name="actionType"
            value="restart"
            disabled={isPending || isOffline}
            className="flex items-center justify-center space-x-2 p-2 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
            <span>Restart</span>
          </button>

          <button
            type="submit"
            name="actionType"
            value="stop"
            disabled={isPending || isOffline}
            className="flex items-center justify-center space-x-2 p-2 bg-rose-900 hover:bg-rose-800 text-rose-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm cursor-pointer"
          >
            <Square className="w-4 h-4" />
            <span>Stop</span>
          </button>
        </form>

        {state?.message && (
          <div className={`mt-4 p-2.5 rounded-md text-xs font-medium ${state.error ? 'bg-red-950/60 text-red-300 border border-red-800' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'}`}>
            {state.message}
          </div>
        )}
      </div>
    </div>
  );
}
