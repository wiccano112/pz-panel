"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { Cpu, RotateCw, Thermometer, Zap, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { HardwareCpuStats } from '@/types/hardware';

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

export default function CpuCoresCard() {
  const [pollInterval, setPollInterval] = useState<number>(5000);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const { data, error, isLoading, isValidating, mutate } = useSWR<HardwareCpuStats>(
    '/api/stats/hardware',
    fetcher,
    {
      refreshInterval: pollInterval > 0 ? pollInterval : 0,
      revalidateOnFocus: true,
    }
  );

  const overallColor = getUsageColor(data?.overallUsagePercent ?? 0);

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
              <h3 className="text-lg font-semibold text-white">Host CPU Cores</h3>
              {data && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
                  {data.totalCores} Threads
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate max-w-xs md:max-w-md" title={data?.model}>
              {data?.model || 'Detecting processor topology...'}
            </p>
          </div>
        </div>

        {/* Global summary badges & Actions */}
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
            title="Reload CPU cores metrics"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 border border-zinc-700/80 rounded transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse core list' : 'Expand core list'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Global Highlights Banner */}
      {data && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 text-xs">
          {/* Total Load */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-zinc-900/80 border border-zinc-800/60">
            <span className="text-zinc-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400 inline" />
              <span>Total Load</span>
            </span>
            <span className={`font-mono font-bold text-sm ${overallColor.text}`}>
              {data.overallUsagePercent.toFixed(1)}%
            </span>
          </div>

          {/* Avg Frequency */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-zinc-900/80 border border-zinc-800/60">
            <span className="text-zinc-400 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 inline" />
              <span>Avg Clock</span>
            </span>
            <span className="font-mono font-bold text-sm text-zinc-100">
              {formatFrequency(data.averageFrequencyMhz)}
            </span>
          </div>

          {/* Package Temp */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-zinc-900/80 border border-zinc-800/60">
            <span className="text-zinc-400 flex items-center space-x-1.5">
              <Thermometer className="w-3.5 h-3.5 text-rose-400 inline" />
              <span>Pkg Temp</span>
            </span>
            <span
              className={`font-mono font-bold text-sm px-1.5 py-0.5 rounded border text-center ${getTempColor(
                data.packageTempC
              )}`}
            >
              {data.packageTempC !== null ? `${data.packageTempC}°C` : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="animate-pulse space-y-3 pt-2">
          <div className="h-10 bg-zinc-800 rounded-md"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
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

      {/* Per-Core HTOP Grid */}
      {data && isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 max-h-96 overflow-y-auto pr-1">
          {data.cores.map((core) => {
            const usageColor = getUsageColor(core.usagePercent);
            const tempBadgeClass = getTempColor(core.temperatureC);

            return (
              <div
                key={core.id}
                className="flex items-center space-x-2.5 p-2 bg-zinc-950/40 hover:bg-zinc-800/50 rounded-md border border-zinc-800/70 transition-colors text-xs"
              >
                {/* Core ID Badge */}
                <span className="font-mono font-semibold text-[11px] text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 w-16 text-center select-none">
                  {core.label}
                </span>

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
                  title={`Core ${core.id} Temperature`}
                >
                  {core.temperatureC !== null ? `${core.temperatureC}°C` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
