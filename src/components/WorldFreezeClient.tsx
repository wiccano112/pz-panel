"use client";

import { useState, useTransition, useEffect } from 'react';
import useSWR from 'swr';
import {
  Snowflake,
  Sparkles,
  ArrowLeftRight,
  PowerOff,
  Flame,
  Trash2,
  RefreshCw,
  HardDrive,
  Users,
  Car,
  Package,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ShieldAlert,
  Archive,
  GitBranch,
  Server,
} from 'lucide-react';
import {
  FreezeCatalogData,
  FreezeOperationMode,
  FrozenServerEntry,
  slugifyPreview,
} from '@/types/freeze';
import { ConnectedPlayer } from '@/types/players';
import {
  handleFreezeOperationAction,
  getLiveConnectedPlayersAction,
} from '@/app/actions';

export interface WorldFreezeClientProps {
  initialCatalog: FreezeCatalogData;
  initialServerStatus: 'ONLINE' | 'STARTING' | 'OFFLINE';
  initialConnectedPlayers: ConnectedPlayer[];
}

interface WorldsApiPayload {
  catalog: FreezeCatalogData;
  serverStatus: 'ONLINE' | 'STARTING' | 'OFFLINE';
  connectedPlayers: ConnectedPlayer[];
}

const fetcher = async (url: string): Promise<WorldsApiPayload> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch worlds data');
  return res.json();
};

export default function WorldFreezeClient({
  initialCatalog,
  initialServerStatus,
  initialConnectedPlayers,
}: WorldFreezeClientProps) {
  const { data, mutate, isValidating } = useSWR<WorldsApiPayload>(
    '/api/worlds',
    fetcher,
    {
      fallbackData: {
        catalog: initialCatalog,
        serverStatus: initialServerStatus,
        connectedPlayers: initialConnectedPlayers,
      },
      refreshInterval: 6000,
    }
  );

  const catalog = data?.catalog || initialCatalog;
  const serverStatus = data?.serverStatus || initialServerStatus;
  const livePlayers = data?.connectedPlayers || initialConnectedPlayers;

  const { active, frozenServers } = catalog;

  const [isPending, startTransition] = useTransition();
  const [isCheckingPlayers, setIsCheckingPlayers] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<FreezeOperationMode | null>(null);
  const [freezeName, setFreezeName] = useState('');
  const [freezeNotes, setFreezeNotes] = useState('');
  const [targetSlug, setTargetSlug] = useState('');
  const [modalPlayers, setModalPlayers] = useState<ConnectedPlayer[]>([]);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const defaultFreezeName =
    active.instanceName && active.instanceName !== 'Fresh World'
      ? active.instanceName
      : `${active.serverName} Snapshot`;

  const openOperationModal = async (
    mode: FreezeOperationMode,
    presetTargetSlug?: string
  ) => {
    setModalError(null);
    setFreezeName(defaultFreezeName);
    setFreezeNotes('');
    setTargetSlug(
      presetTargetSlug || (frozenServers.length > 0 ? frozenServers[0].slug : '')
    );

    if (mode !== 'delete') {
      try {
        setIsCheckingPlayers(true);
        const currentPlayers = await getLiveConnectedPlayersAction();
        setModalPlayers(currentPlayers);
      } catch {
        setModalPlayers(livePlayers);
      } finally {
        setIsCheckingPlayers(false);
      }
    } else {
      setModalPlayers([]);
    }

    setModalMode(mode);
  };

  const closeOperationModal = () => {
    if (isPending) return;
    setModalMode(null);
    setModalError(null);
  };

  useEffect(() => {
    if (!modalMode || isPending) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalMode(null);
        setModalError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalMode, isPending]);

  const handleConfirmOperation = () => {
    if (!modalMode) return;
    setModalError(null);

    const needsName =
      modalMode === 'freeze-and-new' ||
      modalMode === 'swap' ||
      modalMode === 'freeze-only';
    const needsTarget =
      modalMode === 'swap' ||
      modalMode === 'unfreeze' ||
      modalMode === 'delete';

    if (needsName && !freezeName.trim()) {
      setModalError('Please enter a name to identify the frozen world.');
      return;
    }

    if (needsName && freezeName.trim().startsWith('-')) {
      setModalError('World name cannot start with a hyphen (-).');
      return;
    }

    if (needsTarget && !targetSlug.trim()) {
      setModalError('Please select a target frozen world from the vault.');
      return;
    }

    const formData = new FormData();
    formData.append('mode', modalMode);
    if (needsName) {
      formData.append('name', freezeName.trim());
      formData.append('notes', freezeNotes.trim());
    }
    if (needsTarget) {
      formData.append('target', targetSlug.trim());
    }

    startTransition(async () => {
      const result = await handleFreezeOperationAction(null, formData);
      if (result.success) {
        setFeedbackBanner({ type: 'success', message: result.message });
        setModalMode(null);
        await mutate();
      } else {
        setModalError(result.message);
        setFeedbackBanner({ type: 'error', message: result.message });
      }
    });
  };

  const previewSlug = slugifyPreview(freezeName || defaultFreezeName);
  const collidingEntry = frozenServers.find((f) => f.slug === previewSlug);
  const selectedTargetEntry = frozenServers.find((f) => f.slug === targetSlug);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <Snowflake className="w-6 h-6 text-cyan-400" />
            <span>World Vault &amp; Freeze Manager</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Freeze active worlds into compressed vault archives, start fresh seasons from scratch, or swap between saved server instances.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => mutate()}
            disabled={isValidating || isPending}
            className="flex items-center space-x-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh world catalog"
            aria-label="Refresh world catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span>Refresh Vault</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          role="status"
          className={`p-4 rounded-lg border flex items-start justify-between gap-3 ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200'
              : 'bg-red-950/60 border-red-700/80 text-red-200'
          }`}
        >
          <div className="flex items-center space-x-2.5 text-sm font-medium">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-zinc-400 hover:text-white p-1 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 1: Active Data Slot Status Card */}
      <div
        data-testid="active-world-card"
        className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Server className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Active Server Slot (./data)
              </h3>
              <p className="text-xs text-zinc-400">
                Single mounted Docker volume for live gameplay and configuration
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/*Active World Loaded Pill */}
            {active.hasActiveWorld ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/70">
                World Loaded
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                Empty Slot (No Active World)
              </span>
            )}

            {/* Container Status Pill */}
            {serverStatus === 'ONLINE' && (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>CONTAINER ONLINE</span>
              </span>
            )}
            {serverStatus === 'STARTING' && (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-700">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>STARTING</span>
              </span>
            )}
            {serverStatus === 'OFFLINE' && (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>CONTAINER OFFLINE</span>
              </span>
            )}
          </div>
        </div>

        {/* Active Slot Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-lg">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block">
              Active Instance Label
            </span>
            <span className="text-base font-bold text-white mt-1 block truncate">
              {active.hasActiveWorld
                ? active.instanceName || active.serverName
                : 'Empty Slot'}
            </span>
            {active.instanceSlug && (
              <span className="text-[11px] font-mono text-cyan-400 block truncate mt-0.5">
                slug: {active.instanceSlug}
              </span>
            )}
          </div>

          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-lg">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block">
              Server Profile &amp; Branch
            </span>
            <span className="text-sm font-mono font-semibold text-zinc-200 mt-1 block">
              {active.serverName}
            </span>
            <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-indigo-400 mt-0.5">
              <GitBranch className="w-3 h-3" />
              <span>branch: {active.serverBranch}</span>
            </span>
          </div>

          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-lg">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block">
              Instance Origin &amp; Start
            </span>
            <span className="text-sm font-medium text-zinc-200 mt-1 block truncate">
              {active.restoredFrom === 'fresh_start'
                ? 'Fresh Start (Zero State)'
                : active.restoredFrom
                  ? `Thawed from: ${active.restoredFrom}`
                  : active.hasActiveWorld
                    ? 'Default Active World'
                    : '—'}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
              {active.startedAt ? `Loaded: ${active.startedAt}` : 'Original instance'}
            </span>
          </div>

          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-lg">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block">
              Live Connected Players
            </span>
            <div className="flex items-center space-x-2 mt-1">
              <Users
                className={`w-4 h-4 ${
                  livePlayers.length > 0 ? 'text-amber-400' : 'text-zinc-500'
                }`}
              />
              <span
                className={`text-sm font-bold ${
                  livePlayers.length > 0 ? 'text-amber-300' : 'text-zinc-300'
                }`}
              >
                {livePlayers.length} Online
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 block mt-0.5 truncate">
              {livePlayers.length > 0
                ? livePlayers.map((p) => p.username).join(', ')
                : 'Safe to rotate worlds'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Rotation & Freeze Operations (Modes 1, 2, 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mode 1: Freeze & Fresh Start */}
        <div className="bg-zinc-900 border border-zinc-700 hover:border-cyan-500/50 rounded-lg p-5 shadow-xl flex flex-col justify-between transition-colors">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/70 text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Mode 1 • Fresh Season
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Freeze &amp; Start Fresh World
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Safely saves and archives the current world into the vault, wipes <code className="text-zinc-300">./data</code> clean (Saves, DB &amp; Config), and boots a brand-new server from absolute zero.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => openOperationModal('freeze-and-new')}
              disabled={isPending || isCheckingPlayers}
              className="w-full py-2.5 px-4 min-h-[44px] sm:min-h-0 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Freeze &amp; Start Fresh</span>
            </button>
          </div>
        </div>

        {/* Mode 2: Freeze & Swap World */}
        <div className="bg-zinc-900 border border-zinc-700 hover:border-indigo-500/50 rounded-lg p-5 shadow-xl flex flex-col justify-between transition-colors">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800/70 text-indigo-400">
                <ArrowLeftRight className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Mode 2 • World Swap
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Freeze &amp; Swap to Vault World
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Freezes the currently active world into the vault and immediately thaws a previously saved server instance in a single atomic rotation.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => openOperationModal('swap')}
              disabled={isPending || isCheckingPlayers || frozenServers.length === 0}
              title={
                frozenServers.length === 0
                  ? 'No frozen worlds in the vault to swap with yet'
                  : 'Freeze active world and swap to a vault world'
              }
              className="w-full py-2.5 px-4 min-h-[44px] sm:min-h-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>
                {frozenServers.length === 0
                  ? 'Swap Unavailable (Vault Empty)'
                  : 'Freeze & Swap World'}
              </span>
            </button>
          </div>
        </div>

        {/* Mode 3: Freeze Only & Shut Down */}
        <div className="bg-zinc-900 border border-zinc-700 hover:border-amber-500/50 rounded-lg p-5 shadow-xl flex flex-col justify-between transition-colors">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-amber-950/80 border border-amber-800/70 text-amber-400">
                <PowerOff className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Mode 3 • Cold Storage
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Freeze Only &amp; Shut Down
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Compresses and stores the active world in <code className="text-zinc-300">./frozen/</code>, clears the active <code className="text-zinc-300">./data</code> slot, and leaves the Docker container powered off.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => openOperationModal('freeze-only')}
              disabled={isPending || isCheckingPlayers || !active.hasActiveWorld}
              className="w-full py-2.5 px-4 min-h-[44px] sm:min-h-0 bg-amber-700 hover:bg-amber-600 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              <Snowflake className="w-4 h-4" />
              <span>
                {active.hasActiveWorld
                  ? 'Freeze & Shut Down'
                  : 'No Active World to Freeze'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Frozen Worlds Vault Catalog */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Archive className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Frozen Worlds Vault (./frozen)
              </h3>
              <p className="text-xs text-zinc-400">
                Archived server snapshots containing Saves, Server INI/Lua configs, SQLite databases, and mods metadata
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 self-start sm:self-auto">
            {frozenServers.length} {frozenServers.length === 1 ? 'Archive' : 'Archives'}
          </span>
        </div>

        {frozenServers.length === 0 ? (
          <div
            data-testid="empty-vault-state"
            className="p-12 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-400 space-y-2"
          >
            <Snowflake className="w-10 h-10 mx-auto text-zinc-600" />
            <p className="text-sm font-semibold text-zinc-300">
              No frozen worlds in the vault yet
            </p>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Use &ldquo;Freeze &amp; Start Fresh&rdquo; or &ldquo;Freeze &amp; Shut Down&rdquo; above to package your active server into a compressed vault snapshot.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {frozenServers.map((entry: FrozenServerEntry) => (
              <div
                key={entry.slug}
                data-testid={`frozen-card-${entry.slug}`}
                className="bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 rounded-lg p-5 flex flex-col justify-between space-y-4 transition-colors"
              >
                <div className="space-y-3">
                  {/* Card Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{entry.name}</span>
                      </h4>
                      <span className="text-xs font-mono text-cyan-400">
                        slug: {entry.slug}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                        v{entry.gameVersion}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/70 uppercase">
                        {entry.serverBranch}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp & Disk Size */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span className="inline-flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Frozen: {entry.frozenAt || 'Unknown date'}</span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        <strong className="text-zinc-200">{entry.archiveSize}</strong> compressed ({entry.uncompressedSize} unpacked)
                      </span>
                    </span>
                  </div>

                  {/* Stats Pill Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800/90 text-center">
                      <span className="text-[10px] uppercase text-zinc-400 block">
                        Characters
                      </span>
                      <span className="text-sm font-bold text-white inline-flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        {entry.charactersCount}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800/90 text-center">
                      <span className="text-[10px] uppercase text-zinc-400 block">
                        Accounts
                      </span>
                      <span className="text-sm font-bold text-white inline-flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        {entry.accountsCount}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800/90 text-center">
                      <span className="text-[10px] uppercase text-zinc-400 block">
                        Vehicles
                      </span>
                      <span className="text-sm font-bold text-white inline-flex items-center gap-1 mt-0.5">
                        <Car className="w-3.5 h-3.5 text-amber-400" />
                        {entry.vehiclesCount}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800/90 text-center">
                      <span className="text-[10px] uppercase text-zinc-400 block">
                        Mods
                      </span>
                      <span className="text-sm font-bold text-white inline-flex items-center gap-1 mt-0.5">
                        <Package className="w-3.5 h-3.5 text-emerald-400" />
                        {entry.modsCount}
                      </span>
                    </div>
                  </div>

                  {/* Optional Notes */}
                  {entry.notes && (
                    <div className="p-2.5 rounded bg-zinc-900/70 border border-zinc-800/80 text-xs text-zinc-300 flex items-start space-x-2">
                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="italic">{entry.notes}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    {active.hasActiveWorld && (
                      <button
                        type="button"
                        onClick={() => openOperationModal('swap', entry.slug)}
                        disabled={isPending || isCheckingPlayers}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
                        aria-label={`Swap active world with ${entry.name}`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>Freeze Active &amp; Swap</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openOperationModal('unfreeze', entry.slug)}
                      disabled={isPending || isCheckingPlayers}
                      className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        active.hasActiveWorld
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-700/60'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                      aria-label={`Thaw and activate ${entry.name}`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>
                        {active.hasActiveWorld
                          ? 'Thaw (Overwrite Active)'
                          : 'Thaw & Boot World'}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openOperationModal('delete', entry.slug)}
                    disabled={isPending || isCheckingPlayers}
                    className="inline-flex items-center justify-center space-x-1 px-2.5 py-2 min-h-[44px] sm:min-h-0 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/70 text-xs font-medium rounded transition-colors cursor-pointer"
                    title={`Delete frozen world ${entry.name}`}
                    aria-label={`Delete frozen world ${entry.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation & Input Modal */}
      {modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="freeze-modal-title"
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-lg w-full max-h-[90dvh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-start justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-zinc-800 border border-zinc-700 text-cyan-400">
                  {modalMode === 'freeze-and-new' && <Sparkles className="w-5 h-5 text-cyan-400" />}
                  {modalMode === 'swap' && <ArrowLeftRight className="w-5 h-5 text-indigo-400" />}
                  {modalMode === 'freeze-only' && <PowerOff className="w-5 h-5 text-amber-400" />}
                  {modalMode === 'unfreeze' && <Flame className="w-5 h-5 text-emerald-400" />}
                  {modalMode === 'delete' && <Trash2 className="w-5 h-5 text-rose-400" />}
                </div>
                <div>
                  <h4 id="freeze-modal-title" className="text-base font-bold text-white">
                    {modalMode === 'freeze-and-new' && 'Freeze Active World & Start Fresh'}
                    {modalMode === 'swap' && 'Freeze Active World & Swap Instance'}
                    {modalMode === 'freeze-only' && 'Freeze Active World & Shut Down'}
                    {modalMode === 'unfreeze' && 'Thaw & Activate Frozen World'}
                    {modalMode === 'delete' && 'Delete Frozen World from Vault'}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    {modalMode === 'freeze-and-new' &&
                      'Archives current ./data state and boots a clean world from scratch'}
                    {modalMode === 'swap' &&
                      'Archives current ./data state and restores the selected vault world'}
                    {modalMode === 'freeze-only' &&
                      'Archives current ./data state, wipes ./data, and stops the container'}
                    {modalMode === 'unfreeze' &&
                      'Extracts the selected vault archive into ./data and starts the server'}
                    {modalMode === 'delete' &&
                      'Permanently removes this compressed archive from ./frozen/'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeOperationModal}
                disabled={isPending}
                className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body (min-h-0 per Rule 11) */}
            <div className="p-5 flex-1 min-h-0 overflow-y-auto space-y-4">
              {/* Live Connected Players Warning */}
              {modalMode !== 'delete' && modalPlayers.length > 0 && (
                <div className="p-3.5 bg-amber-950/70 border border-amber-700 rounded-md space-y-2">
                  <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Warning: {modalPlayers.length} active player{modalPlayers.length === 1 ? '' : 's'} connected!
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    Executing this operation will force a world save and immediately stop the server, disconnecting:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {modalPlayers.map((p) => (
                      <span
                        key={p.username}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-zinc-900/90 text-amber-300 border border-amber-800 rounded"
                      >
                        {p.username}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Destructive Overwrite Warning for Unfreeze when Active World exists */}
              {modalMode === 'unfreeze' && active.hasActiveWorld && (
                <div className="p-3.5 bg-rose-950/70 border border-rose-700 rounded-md space-y-2">
                  <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Destructive Overwrite Warning</span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed">
                    There is currently an active world (<strong>{active.instanceName || active.serverName}</strong>) in <code className="text-rose-100">./data</code>. Thawing directly will <strong>permanently wipe and overwrite</strong> the active world without freezing it first!
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalMode('swap')}
                    className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
                  >
                    Switch to &ldquo;Freeze Active &amp; Swap&rdquo; instead (Recommended)
                  </button>
                </div>
              )}

              {/* Form Fields for Freeze Name & Notes (Modes 1, 2, 3) */}
              {(modalMode === 'freeze-and-new' ||
                modalMode === 'swap' ||
                modalMode === 'freeze-only') && (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="freeze-world-name"
                      className="block text-xs font-semibold text-zinc-200 mb-1"
                    >
                      Archive Name for Current World *
                    </label>
                    <input
                      id="freeze-world-name"
                      type="text"
                      value={freezeName}
                      onChange={(e) => setFreezeName(e.target.value)}
                      placeholder="e.g. Season 1 - Knox County"
                      maxLength={80}
                      className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-zinc-950 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400 font-mono">
                      <span>Vault folder slug: {previewSlug || 'auto-timestamp'}</span>
                      {collidingEntry && (
                        <span className="text-amber-400">
                          Slug exists (will append timestamp suffix)
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="freeze-world-notes"
                      className="block text-xs font-semibold text-zinc-200 mb-1"
                    >
                      Manifest Notes / Description (Optional)
                    </label>
                    <textarea
                      id="freeze-world-notes"
                      value={freezeNotes}
                      onChange={(e) => setFreezeNotes(e.target.value)}
                      placeholder="e.g. Day 45 before winter, base at Rosewood Fire Station..."
                      rows={2}
                      maxLength={300}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Target Vault Selector for Swap */}
              {modalMode === 'swap' && (
                <div>
                  <label
                    htmlFor="swap-target-select"
                    className="block text-xs font-semibold text-zinc-200 mb-1"
                  >
                    Select Vault World to Thaw &amp; Activate *
                  </label>
                  <select
                    id="swap-target-select"
                    value={targetSlug}
                    onChange={(e) => setTargetSlug(e.target.value)}
                    className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-zinc-950 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {frozenServers.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name} ({item.slug}) — {item.archiveSize} [{item.charactersCount} chars]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Summary for Unfreeze or Delete */}
              {(modalMode === 'unfreeze' || modalMode === 'delete') && selectedTargetEntry && (
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-md space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {selectedTargetEntry.name}
                    </span>
                    <span className="font-mono text-cyan-400">
                      {selectedTargetEntry.slug}
                    </span>
                  </div>
                  <div className="text-zinc-400">
                    Frozen: {selectedTargetEntry.frozenAt} • Size: {selectedTargetEntry.archiveSize} ({selectedTargetEntry.uncompressedSize})
                  </div>
                  <div className="text-zinc-300">
                    {selectedTargetEntry.charactersCount} Characters • {selectedTargetEntry.vehiclesCount} Vehicles • {selectedTargetEntry.modsCount} Mods
                  </div>
                </div>
              )}

              {modalError && (
                <div className="p-3 rounded bg-red-950/70 border border-red-800 text-xs text-red-300">
                  {modalError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={closeOperationModal}
                disabled={isPending}
                className="px-4 py-2 min-h-[44px] sm:min-h-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-md border border-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmOperation}
                disabled={isPending}
                className={`px-4 py-2 min-h-[44px] sm:min-h-0 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
                  modalMode === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : modalMode === 'unfreeze' && active.hasActiveWorld
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Operation...</span>
                  </>
                ) : (
                  <span>
                    {modalMode === 'freeze-and-new' && 'Confirm Freeze & Fresh Start'}
                    {modalMode === 'swap' && 'Confirm Freeze & Swap'}
                    {modalMode === 'freeze-only' && 'Confirm Freeze & Shut Down'}
                    {modalMode === 'unfreeze' && 'Confirm Thaw & Boot'}
                    {modalMode === 'delete' && 'Permanently Delete Archive'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
