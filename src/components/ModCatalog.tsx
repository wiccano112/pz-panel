"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { PackagePlus, Search, ExternalLink, Check, Plus, AlertTriangle, Users, Clock, X, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkshopApiResponse, WorkshopModItem } from '@/types/workshop';

export interface ModCatalogProps {
  onAddMod: (mod: { name: string; workshopId: string; modId: string; mapId?: string }) => void;
  installedWorkshopIds: string[];
}

const fetcher = async (url: string): Promise<WorkshopApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch workshop mods: ${res.statusText}`);
  }
  return res.json();
};

function formatSubscribers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export default function ModCatalog({ onAddMod, installedWorkshopIds }: ModCatalogProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [days, setDays] = useState('30');
  const [page, setPage] = useState(1);
  
  // State for unknown modId modal resolution
  const [resolvingMod, setResolvingMod] = useState<WorkshopModItem | null>(null);
  const [manualModId, setManualModId] = useState('');
  const [manualMapId, setManualMapId] = useState('');
  const [modalError, setModalError] = useState('');

  // Debounce search input and reset page
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  const handleDaysChange = (newDays: string) => {
    setDays(newDays);
    setPage(1);
  };

  const apiUrl = `/api/workshop?q=${encodeURIComponent(debouncedQuery)}&days=${days}&page=${page}&tag=Build%2042`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<WorkshopApiResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const handleInstallClick = (mod: WorkshopModItem) => {
    if (mod.modId) {
      onAddMod({
        name: mod.name,
        workshopId: mod.workshopId,
        modId: mod.modId,
        mapId: mod.mapId,
      });
    } else {
      // Open modal to resolve mod ID
      setResolvingMod(mod);
      setManualModId('');
      setManualMapId('');
      setModalError('');
    }
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualModId.trim()) {
      setModalError('Mod ID is required by Project Zomboid.');
      return;
    }
    if (resolvingMod) {
      onAddMod({
        name: resolvingMod.name,
        workshopId: resolvingMod.workshopId,
        modId: manualModId.trim(),
        mapId: manualMapId.trim() || undefined,
      });
      setResolvingMod(null);
    }
  };

  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.total ?? 0;
  const startItem = totalItems === 0 ? 0 : (page - 1) * 12 + 1;
  const endItem = Math.min(page * 12, totalItems);

  return (
    <div className="bg-zinc-900 p-6 shadow rounded-lg border border-zinc-700 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <PackagePlus className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Steam Workshop Catalog (Build 42)</h3>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search mods..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Time range selector */}
          <div className="relative flex items-center">
            <Clock className="w-4 h-4 text-zinc-400 absolute left-2.5 pointer-events-none" />
            <select
              value={days}
              onChange={(e) => handleDaysChange(e.target.value)}
              aria-label="Time period"
              className="pl-8 pr-7 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 1 year</option>
              <option value="0">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warning/Fallback Notice Banner */}
      {data?.source === 'fallback' && (
        <div className="flex items-start space-x-3 p-3 bg-amber-950/40 border border-amber-800/60 rounded-md text-amber-300 text-xs sm:text-sm">
          <Info className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Offline / Fallback Catalog Mode</p>
            <p className="text-amber-300/80">
              {data.warning || 'Viewing curated popular mods. Set STEAM_API_KEY in .env.local to enable live Steam Workshop browsing.'}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="p-4 border border-zinc-800 rounded-md bg-zinc-800/50 animate-pulse flex space-x-3">
              <div className="w-16 h-16 bg-zinc-700 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-zinc-700 rounded w-3/4" />
                <div className="h-3 bg-zinc-700/60 rounded w-full" />
                <div className="h-3 bg-zinc-700/40 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 border border-red-800/50 bg-red-950/30 rounded-md text-center text-red-300 space-y-2">
          <p className="text-sm font-medium">Failed to load mods from workshop.</p>
          <button
            onClick={() => mutate()}
            className="px-3 py-1 bg-red-800/40 hover:bg-red-700/60 text-xs rounded border border-red-700 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data?.mods.length === 0 && (
        <div className="p-8 text-center border border-zinc-800 rounded-md text-zinc-400">
          <p className="text-sm">No mods found matching your search query.</p>
        </div>
      )}

      {/* Mod Cards Grid */}
      {!isLoading && !error && data?.mods && data.mods.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.mods.map((mod) => {
              const isInstalled = installedWorkshopIds.includes(mod.workshopId);

              return (
                <div
                  key={mod.workshopId}
                  className="p-4 border border-zinc-700 rounded-md bg-zinc-800 flex flex-col justify-between hover:border-zinc-600 transition-colors"
                >
                  <div className="flex space-x-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-700">
                      {mod.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mod.imageUrl}
                          alt={mod.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <PackagePlus className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-semibold text-sm text-white truncate" title={mod.name}>
                          {mod.name}
                        </h4>
                        <a
                          href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.workshopId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 hover:text-zinc-200 transition-colors p-0.5"
                          title="View on Steam Workshop"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1" title={mod.description}>
                        {mod.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Footer details & Action */}
                  <div className="mt-3 pt-3 border-t border-zinc-700/60 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-zinc-400">
                      <span className="font-mono text-[11px]">ID: {mod.workshopId}</span>
                      {mod.subscribers > 0 && (
                        <span className="flex items-center space-x-1 text-zinc-400" title={`${mod.subscribers.toLocaleString()} subscribers`}>
                          <Users className="w-3 h-3" />
                          <span>{formatSubscribers(mod.subscribers)}</span>
                        </span>
                      )}
                    </div>

                    {isInstalled ? (
                      <span className="flex items-center space-x-1 text-emerald-400 font-medium px-2 py-1 bg-emerald-950/40 rounded border border-emerald-800/40">
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInstallClick(mod)}
                        className="flex items-center space-x-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors cursor-pointer"
                        title={mod.modId ? `Install ${mod.name}` : 'Configure and Install'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{mod.modId ? 'Add' : 'Install'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
            <div>
              {totalItems > 0 ? (
                <span>
                  Showing <span className="text-zinc-200 font-medium">{startItem}</span> to{' '}
                  <span className="text-zinc-200 font-medium">{endItem}</span> of{' '}
                  <span className="text-zinc-200 font-medium">{totalItems}</span> mods
                </span>
              ) : (
                <span>Page {page} of {totalPages}</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || isValidating}
                className="flex items-center space-x-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || isValidating}
                className="flex items-center space-x-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Unknown Mod ID Modal */}
      {resolvingMod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">Add Mod to Configuration</h4>
                <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{resolvingMod.name}</p>
              </div>
              <button
                onClick={() => setResolvingMod(null)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-zinc-800/80 rounded border border-zinc-700/80 text-xs text-zinc-300 space-y-1">
              <p className="flex items-center space-x-1 font-medium text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Manual Mod ID Required</span>
              </p>
              <p>
                Steam Workshop does not expose internal Mod IDs via API. Please find the <code className="bg-zinc-950 px-1 py-0.5 rounded text-indigo-300">Mod ID:</code> in the workshop page description.
              </p>
              <a
                href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${resolvingMod.workshopId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-indigo-400 hover:underline pt-1"
              >
                <span>Open Steam Workshop Item</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Workshop ID
                </label>
                <input
                  type="text"
                  disabled
                  value={resolvingMod.workshopId}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-200 mb-1">
                  Mod ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RavenCreek or tsarslib"
                  value={manualModId}
                  onChange={(e) => {
                    setManualModId(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                  autoFocus
                />
                {modalError && <p className="text-xs text-red-400 mt-1">{modalError}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-200 mb-1">
                  Map ID <span className="text-zinc-500 font-normal">(Optional, for map mods)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. RavenCreek (leave empty if not a map mod)"
                  value={manualMapId}
                  onChange={(e) => setManualMapId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingMod(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors cursor-pointer"
                >
                  Confirm & Add Mod
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
