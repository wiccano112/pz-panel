"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { Cpu, RotateCw, Thermometer, Zap, Activity, ChevronDown, ChevronUp, Server } from 'lucide-react';
import { HardwareCpuStats, CpuCoreMetric } from '@/types/hardware';

const fetcher = async (url: string): Promise<HardwareCpuStats> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch hardware CPU stats');
  return res.json();
};

function formatFrequency(mhz: number): string {
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(2)} GHz`;
  }
  return `${Math.round(mhz)} MHz`;
}

function getUsageColor(percent: number): { bar: string; text: string } {
  if (percent >= 80) {
    return { bar: 'bg-rose-500 shadow-rose-500/50', text: 'text-rose-400' };
  }
  if (percent >= 50) {
    return { bar: 'bg-amber-500 shadow-amber-500/50', text: 'text-amber-400' };
  }
  return { bar: 'bg-emerald-500 shadow-emerald-500/50', text: 'text-emerald-400' };
}

function getTempColor(temp: number | null): string {
  if (temp === null) return 'text-zinc-500 bg-zinc-800/50 border-zinc-700/60';
  if (temp >= 80) return 'text-rose-300 bg-rose-950/60 border-rose-800/80 font-bold';
  if (temp >= 65) return 'text-amber-300 bg-amber-950/60 border-amber-800/80';
  return 'text-emerald-300 bg-emerald-950/60 border-emerald-800/80';
}

function CoreRow({ core }: { core: CpuCoreMetric }) {
  const usageColor = getUsageColor(core.usagePercent);
  const tempBadgeClass = getTempColor(core.temperatureC);

  return (
    <div className={`flex items-center space-x-2.5 p-2 rounded-md border transition-colors text-xs ${
      core.isAssignedToServer
        ? 'bg-indigo-950/20 border-indigo-800/50 hover:bg-indigo-950/30'
        : 'bg-zinc-950/40 border-zinc-800/70 hover:bg-zinc-800/50'
    }`}>
      {/* Core ID Badge */}
      <div className="flex items-center space-x-1.5 w-24">
        <span className="font-mono font-semibold text-[11px] text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 select-none">
          {core.label}
        </span>
        {core.isAssignedToServer && (
          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700 select-none uppercase">
            PZ
          </span>
        )}
      </div>

      {/* Progress bar (HTOP style) */}
      <div className="flex-1 bg-zinc-800/90 rounded-full h-2.5 overflow-hidden p-0.5 border border-zinc-700/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${usageColor.bar}`}
          style={{ width: `${Math.max(3, core.usagePercent)}%` }}
        />
      </div>

      {/* Usage % */}
      <span className={`font-mono font-semibold text-right w-11 ${usageColor.text}`}>
        {core.usagePercent.toFixed(0)}%
      </span>

      {/* Frequency */}
      <span className="font-mono text-zinc-400 text-[11px] w-16 text-right hidden sm:inline-block">
        {formatFrequency(core.frequencyMhz)}
      </span>

      {/* Temperature */}
      <span
        className={`font-mono text-[10px] px-1.5 py-0.5 rounded border w-12 text-center select-none ${tempBadgeClass}`}
        title={`${core.label} Temperature`}
      >
        {core.temperatureC !== null ? `${core.temperatureC}°C` : '—'}
      </span>
    </div>
  );
}

export default function CpuCoresCard() {
  const [pollInterval, setPollInterval] = useState<number>(5000);
  // Collapsed by default as requested
  const [showAllCores, setShowAllCores] = useState<boolean>(false);

  const { data, error, isLoading, isValidating, mutate } = useSWR<HardwareCpuStats>(
    '/api/stats/hardware',
    fetcher,
    {
      refreshInterval: pollInterval > 0 ? pollInterval : 0,
      revalidateOnFocus: true,
    }
  );

  const assignedCores = data?.cores.filter((c) => c.isAssignedToServer) || [];
  const assignedUsageColor = getUsageColor(data?.assignedUsagePercent ?? 0);
  const hostUsageColor = getUsageColor(data?.overallUsagePercent ?? 0);

  return (
    <div className="p-6 bg-zinc-900 shadow rounded-lg border border-zinc-700 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-indigo-950/60 border border-indigo-800/60 rounded-lg">
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-white">Server CPU Cores</h3>
              {data && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 font-mono font-medium flex items-center space-x-1">
                  <Server className="w-3 h-3 inline mr-1" />
                  <span>Cores {data.assignedRangeString} ({assignedCores.length} Cores)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate max-w-xs md:max-w-md" title={data?.model}>
              {data?.model || 'Detecting processor topology...'}
            </p>
          </div>
        </div>

        {/* Global summary actions & refresh */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Refresh interval selector */}
          <div className="flex items-center space-x-1 text-xs bg-zinc-800/80 border border-zinc-700/80 rounded px-1.5 py-1">
            <span className="text-zinc-400 mr-1 text-[11px]">Auto:</span>
            {[
              { label: 'Off', val: 0 },
              { label: '3s', val: 3000 },
              { label: '5s', val: 5000 },
              { label: '10s', val: 10000 },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setPollInterval(opt.val)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  pollInterval === opt.val
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 disabled:opacity-50 transition-colors cursor-pointer"
            title="Reload CPU metrics"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Highlights Banner for Server Assigned Cores */}
      {data && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 bg-zinc-950/70 rounded-lg border border-indigo-950 text-xs">
          {/* Server Assigned CPU Load */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-zinc-900/90 border border-zinc-800/60">
            <span className="text-zinc-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400 inline" />
              <span>Server Load</span>
            </span>
            <span className={`font-mono font-bold text-sm ${assignedUsageColor.text}`}>
              {data.assignedUsagePercent.toFixed(1)}%
            </span>
          </div>

          {/* Server Assigned Avg Clock */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-zinc-900/90 border border-zinc-800/60">
            <span className="text-zinc-400 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 inline" />
              <span>Server Clock</span>
            </span>
            <span className="font-mono font-bold text-sm text-zinc-100">
              {formatFrequency(data.assignedAvgFrequencyMhz)}
            </span>
          </div>

          {/* Server Assigned Peak Temp */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-zinc-900/90 border border-zinc-800/60">
            <span className="text-zinc-400 flex items-center space-x-1.5">
              <Thermometer className="w-3.5 h-3.5 text-rose-400 inline" />
              <span>Server Temp</span>
            </span>
            <span
              className={`font-mono font-bold text-sm px-1.5 py-0.5 rounded border text-center ${getTempColor(
                data.assignedMaxTempC
              )}`}
            >
              {data.assignedMaxTempC !== null ? `${data.assignedMaxTempC}°C` : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="animate-pulse space-y-3 pt-2">
          <div className="h-10 bg-zinc-800 rounded-md"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-zinc-800/70 rounded-md"></div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !data && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-md text-red-300 text-xs">
          Failed to read hardware CPU telemetry from host.
        </div>
      )}

      {/* Primary View: Server Assigned Cores (Always visible) */}
      {data && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <span className="font-medium text-zinc-300 flex items-center space-x-1.5">
              <span>Dedicated Cores Breakdown ({data.assignedRangeString})</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              {assignedCores.length} active threads
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {assignedCores.map((core) => (
              <CoreRow key={core.id} core={core} />
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Section: All Host Cores (Closed by default) */}
      {data && (
        <div className="pt-2 border-t border-zinc-800/80 space-y-3">
          <button
            type="button"
            onClick={() => setShowAllCores((prev) => !prev)}
            className="w-full flex items-center justify-between p-2 rounded-md bg-zinc-950/50 hover:bg-zinc-800/60 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <span className="font-medium">
                {showAllCores ? 'Hide all host cores' : 'View all host cores'}
              </span>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                {data.totalCores} Cores
              </span>
            </div>
            <div className="flex items-center space-x-2 text-zinc-400">
              <span className="text-[11px]">
                Host Load: <strong className={hostUsageColor.text}>{data.overallUsagePercent.toFixed(1)}%</strong>
              </span>
              {showAllCores ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {/* Expanded All Cores Grid */}
          {showAllCores && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-zinc-950/40 rounded border border-zinc-800 text-xs text-zinc-400">
                <div>Host Total Load: <span className={`font-mono font-bold ${hostUsageColor.text}`}>{data.overallUsagePercent.toFixed(1)}%</span></div>
                <div>Host Avg Clock: <span className="font-mono font-bold text-zinc-200">{formatFrequency(data.averageFrequencyMhz)}</span></div>
                <div>Host Pkg Temp: <span className={`font-mono font-bold px-1 rounded border text-[11px] ${getTempColor(data.packageTempC)}`}>{data.packageTempC !== null ? `${data.packageTempC}°C` : 'N/A'}</span></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {data.cores.map((core) => (
                  <CoreRow key={core.id} core={core} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
