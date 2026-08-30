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
      case 'RUNNING': return 'text-green-600 bg-green-100';
      case 'OFFLINE': 
      case 'EXITED': return 'text-red-600 bg-red-100';
      case 'RESTARTING': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const isOfflineLike = initialStatus === 'OFFLINE' || initialStatus === 'EXITED';
  const isRunningLike = initialStatus === 'RUNNING' || initialStatus === 'RESTARTING';

  return (
    <div className="p-6 bg-white shadow rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-slate-800">Server Status</h3>
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
          className="flex items-center justify-center space-x-2 p-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>Start</span>
        </button>

        <button
          type="submit"
          name="actionType"
          value="restart"
          disabled={isPending || !isRunningLike}
          className="flex items-center justify-center space-x-2 p-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          <span>Restart</span>
        </button>

        <button
          type="submit"
          name="actionType"
          value="stop"
          disabled={isPending || isOfflineLike}
          className="flex items-center justify-center space-x-2 p-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Square className="w-4 h-4" />
          <span>Stop</span>
        </button>
      </form>

      {state?.message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${state.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {state.message}
        </div>
      )}
    </div>
  );
}
