"use client";

import { useActionState } from 'react';
import { handleServerAction } from '@/app/actions';
import { Play, Square, RotateCw, Server } from 'lucide-react';

interface ServerStatusCardProps {
  initialStatus: string;
}

export default function ServerStatusCard({ initialStatus }: ServerStatusCardProps) {
  const [state, formAction, isPending] = useActionState(handleServerAction, null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'text-emerald-300 bg-emerald-950/50 border border-emerald-800';
      case 'OFFLINE':
      case 'EXITED': return 'text-rose-300 bg-rose-950/50 border border-rose-800';
      case 'RESTARTING': return 'text-amber-200 bg-amber-950/50 border border-amber-800';
      default: return 'text-zinc-300 bg-zinc-800 border border-zinc-700';
    }
  };

  const isOfflineLike = initialStatus === 'OFFLINE' || initialStatus === 'EXITED';
  const isRunningLike = initialStatus === 'RUNNING' || initialStatus === 'RESTARTING';

  return (
    <div className="p-6 bg-zinc-900 shadow rounded-lg border border-zinc-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Server Status</h3>
        </div>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(initialStatus)}`}>
          {initialStatus}
        </span>
      </div>

      <form action={formAction} className="grid grid-cols-3 gap-3">
        <button
          type="submit"
          name="actionType"
          value="start"
          disabled={isPending || isRunningLike}
          className="flex items-center justify-center space-x-2 p-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>Start</span>
        </button>

        <button
          type="submit"
          name="actionType"
          value="restart"
          disabled={isPending || !isRunningLike}
          className="flex items-center justify-center space-x-2 p-2 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          <span>Restart</span>
        </button>

        <button
          type="submit"
          name="actionType"
          value="stop"
          disabled={isPending || isOfflineLike}
          className="flex items-center justify-center space-x-2 p-2 bg-rose-900 hover:bg-rose-800 text-rose-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Square className="w-4 h-4" />
          <span>Stop</span>
        </button>
      </form>

      {state?.message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${state.error ? 'bg-red-900/50 text-red-300 border border-red-700' : 'bg-green-900/50 text-green-300 border border-green-700'}`}>
          {state.message}
        </div>
      )}
    </div>
  );
}
