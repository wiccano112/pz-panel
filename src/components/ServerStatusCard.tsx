"use client";

import { useActionState, useState, useTransition } from 'react';
import useSWR from 'swr';
import { handleServerAction, getLiveConnectedPlayersAction } from '@/app/actions';
import {
  Play,
  Square,
  RotateCw,
  Server,
  CheckCircle2,
  Loader2,
  CircleOff,
  AlertTriangle,
  Users,
  X,
} from 'lucide-react';
import { ConnectedPlayer } from '@/types/players';

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
  const [, startTransition] = useTransition();

  const [isCheckingPlayers, setIsCheckingPlayers] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<'stop' | 'restart' | null>(null);
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { data } = useSWR('/api/stats', fetcher, {
    refreshInterval: 3000,
    fallbackData: { status: initialStatus },
  });

  const currentStatus: 'ONLINE' | 'STARTING' | 'OFFLINE' = data?.status || initialStatus;

  const isOnline = currentStatus === 'ONLINE';
  const isStarting = currentStatus === 'STARTING';
  const isOffline = currentStatus === 'OFFLINE';

  const executeActionDirectly = (actionType: 'start' | 'stop' | 'restart') => {
    const formData = new FormData();
    formData.append('actionType', actionType);
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleActionClick = async (actionType: 'start' | 'stop' | 'restart') => {
    if (actionType === 'start') {
      executeActionDirectly('start');
      return;
    }

    try {
      setIsCheckingPlayers(true);
      const players = await getLiveConnectedPlayersAction();
      if (players && players.length > 0) {
        setConnectedPlayers(players);
        setPendingActionType(actionType);
        setShowConfirmModal(true);
      } else {
        executeActionDirectly(actionType);
      }
    } catch {
      executeActionDirectly(actionType);
    } finally {
      setIsCheckingPlayers(false);
    }
  };

  const handleConfirmAction = () => {
    if (pendingActionType) {
      executeActionDirectly(pendingActionType);
    }
    setShowConfirmModal(false);
    setPendingActionType(null);
  };

  return (
    <div className="p-6 bg-zinc-900 shadow rounded-lg border border-zinc-700 flex flex-col justify-between relative">
      {/* Active Players Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-amber-600/60 rounded-lg p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-950/80 border border-amber-700/80 rounded-full text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {pendingActionType === 'restart' ? 'Confirm Server Restart' : 'Confirm Server Stop'}
                  </h4>
                  <p className="text-xs text-amber-400/90 font-medium">
                    {connectedPlayers.length} active player{connectedPlayers.length === 1 ? '' : 's'} connected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingActionType(null);
                }}
                className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-800/80 p-3 rounded-md border border-zinc-700/60">
                There are currently active players on the server. Performing a <strong>{pendingActionType}</strong> will disconnect them immediately and may result in lost unsaved character progress.
              </p>

              <div className="border border-zinc-800 rounded-md bg-zinc-950/60 p-3 max-h-40 overflow-y-auto space-y-2">
                <div className="flex items-center space-x-1.5 text-xs text-zinc-400 font-semibold mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Connected Players ({connectedPlayers.length}):</span>
                </div>
                {connectedPlayers.map((player, idx) => (
                  <div
                    key={player.username || idx}
                    className="flex items-center justify-between text-xs py-1.5 px-2 bg-zinc-900/80 rounded border border-zinc-800"
                  >
                    <span className="font-semibold text-zinc-200">{player.username}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {player.role || 'Player'} {player.steamid ? `(${player.steamid.slice(-4)})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingActionType(null);
                }}
                className="px-4 py-2 min-h-[44px] sm:min-h-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-md border border-zinc-700 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isPending}
                className={`px-4 py-2 min-h-[44px] sm:min-h-0 text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer text-center ${
                  pendingActionType === 'restart'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isPending ? (
                  <span className="flex items-center justify-center space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  <span>Force {pendingActionType === 'restart' ? 'Restart' : 'Stop'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleActionClick('start')}
            disabled={isPending || isCheckingPlayers || !isOffline}
            className="flex items-center justify-center space-x-2 p-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm cursor-pointer min-h-[44px] sm:min-h-0"
          >
            <Play className="w-4 h-4" />
            <span>Start</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionClick('restart')}
            disabled={isPending || isCheckingPlayers || isOffline}
            className="flex items-center justify-center space-x-2 p-2 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm cursor-pointer min-h-[44px] sm:min-h-0"
          >
            {isCheckingPlayers && pendingActionType === 'restart' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
            )}
            <span>Restart</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionClick('stop')}
            disabled={isPending || isCheckingPlayers || isOffline}
            className="flex items-center justify-center space-x-2 p-2 bg-rose-900 hover:bg-rose-800 text-rose-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm cursor-pointer min-h-[44px] sm:min-h-0"
          >
            {isCheckingPlayers && pendingActionType === 'stop' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>Stop</span>
          </button>
        </div>

        {state?.message && (
          <div className={`mt-4 p-2.5 rounded-md text-xs font-medium ${state.error ? 'bg-red-950/60 text-red-300 border border-red-800' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'}`}>
            {state.message}
          </div>
        )}
      </div>
    </div>
  );
}
