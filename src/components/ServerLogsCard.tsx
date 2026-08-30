"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Play, Pause, Trash2, ArrowDown, Search, Copy, Check, Filter } from 'lucide-react';
import { LogEntry, LogFilterType, LogLevel } from '@/types/logs';

function detectLogLevel(raw: string): LogLevel {
  const lower = raw.toLowerCase();
  if (
    lower.includes('error') ||
    lower.includes('exception') ||
    lower.includes('fail') ||
    lower.includes('fatal') ||
    lower.includes('severe') ||
    lower.includes('[s_api fail]')
  ) {
    return 'ERROR';
  }
  if (lower.includes('warn') || lower.includes('warning') || lower.includes('caution')) {
    return 'WARN';
  }
  if (lower.includes('debug') || lower.includes('trace') || lower.includes('verbose')) {
    return 'DEBUG';
  }
  return 'INFO';
}

const MAX_LOG_LINES = 500;

export default function ServerLogsCard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<LogFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [streamState, setStreamState] = useState<'connecting' | 'live' | 'disconnected'>('connecting');
  const [copied, setCopied] = useState(false);

  const logsContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectionStatus = isPaused ? 'paused' : streamState;

  // Connect to SSE Log Stream
  useEffect(() => {
    if (isPaused) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const es = new EventSource('/api/logs');
    eventSourceRef.current = es;

    es.onopen = () => {
      setStreamState('live');
    };

    es.onmessage = (event) => {
      try {
        const rawLine = JSON.parse(event.data) as string;
        if (!rawLine) return;

        const level = detectLogLevel(rawLine);
        const newEntry: LogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          raw: rawLine,
          level,
          timestamp: new Date().toLocaleTimeString(),
        };

        setLogs((prev) => {
          const next = [...prev, newEntry];
          if (next.length > MAX_LOG_LINES) {
            return next.slice(next.length - MAX_LOG_LINES);
          }
          return next;
        });
      } catch (err) {
        console.error('Failed to parse incoming log event:', err);
      }
    };

    es.onerror = () => {
      setStreamState('disconnected');
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [isPaused]);

  // Auto-scroll on new logs
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, activeFilter, searchQuery]);

  // Calculate counts per level
  const counts = useMemo(() => {
    const res = { ALL: logs.length, INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 };
    for (const log of logs) {
      res[log.level] += 1;
    }
    return res;
  }, [logs]);

  // Filter logs by level and search query
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesFilter = activeFilter === 'ALL' || log.level === activeFilter;
      const matchesSearch = !searchQuery.trim() || log.raw.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesFilter && matchesSearch;
    });
  }, [logs, activeFilter, searchQuery]);

  const handleCopyLogs = async () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.level}] ${l.raw}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filterChips: Array<{ type: LogFilterType; label: string; count: number; color: string; activeColor: string }> = [
    { type: 'ALL', label: 'All', count: counts.ALL, color: 'text-zinc-400 bg-zinc-800/80 border-zinc-700', activeColor: 'bg-zinc-700 text-white border-zinc-500 font-semibold' },
    { type: 'INFO', label: 'Info', count: counts.INFO, color: 'text-sky-300 bg-sky-950/30 border-sky-800/50', activeColor: 'bg-sky-900/60 text-sky-200 border-sky-500 font-semibold' },
    { type: 'WARN', label: 'Warning', count: counts.WARN, color: 'text-amber-300 bg-amber-950/30 border-amber-800/50', activeColor: 'bg-amber-900/60 text-amber-200 border-amber-500 font-semibold' },
    { type: 'ERROR', label: 'Error', count: counts.ERROR, color: 'text-rose-300 bg-rose-950/30 border-rose-800/50', activeColor: 'bg-rose-900/60 text-rose-200 border-rose-500 font-semibold' },
    { type: 'DEBUG', label: 'Debug', count: counts.DEBUG, color: 'text-purple-300 bg-purple-950/30 border-purple-800/50', activeColor: 'bg-purple-900/60 text-purple-200 border-purple-500 font-semibold' },
  ];

  return (
    <div className="bg-zinc-900 p-6 shadow rounded-lg border border-zinc-700 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Live Server Logs (tail -f)</h3>
          
          {/* Status badge */}
          <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-zinc-800 border-zinc-700">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'live'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-zinc-300 capitalize">
              {connectionStatus}
            </span>
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused((prev) => !prev)}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
              isPaused
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`}
            title={isPaused ? 'Resume stream' : 'Pause stream'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-indigo-950/50 text-indigo-300 border-indigo-800 hover:bg-indigo-900/50'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
            }`}
            title="Auto-scroll on new logs"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Auto-scroll</span>
          </button>

          {/* Copy */}
          <button
            onClick={handleCopyLogs}
            disabled={filteredLogs.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors disabled:opacity-40 cursor-pointer"
            title="Copy filtered logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Clear */}
          <button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-zinc-800 text-zinc-300 hover:text-rose-300 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors disabled:opacity-40 cursor-pointer"
            title="Clear current log buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-400 flex items-center mr-1">
            <Filter className="w-3.5 h-3.5 mr-1 text-zinc-500" />
            Filter:
          </span>
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.type;
            return (
              <button
                key={chip.type}
                onClick={() => setActiveFilter(chip.type)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isActive ? chip.activeColor : `${chip.color} hover:brightness-125`
                }`}
              >
                <span>{chip.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-black/30' : 'bg-black/20'}`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search inside logs */}
        <div className="relative md:w-56">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-8 pr-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Terminal Display */}
      <div
        ref={logsContainerRef}
        className="bg-zinc-950 border border-zinc-800 rounded-md p-3 h-96 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1 shadow-inner select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 italic text-xs">
            {logs.length === 0
              ? 'Waiting for server log stream...'
              : 'No log lines match the current filter or search query.'}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const levelClass =
              log.level === 'ERROR'
                ? 'text-rose-400 bg-rose-950/20'
                : log.level === 'WARN'
                ? 'text-amber-300 bg-amber-950/15'
                : log.level === 'DEBUG'
                ? 'text-purple-300 bg-purple-950/10'
                : 'text-zinc-300';

            const badgeClass =
              log.level === 'ERROR'
                ? 'text-rose-400 bg-rose-950/60 border-rose-800/60'
                : log.level === 'WARN'
                ? 'text-amber-300 bg-amber-950/60 border-amber-800/60'
                : log.level === 'DEBUG'
                ? 'text-purple-300 bg-purple-950/60 border-purple-800/60'
                : 'text-sky-300 bg-sky-950/60 border-sky-800/60';

            return (
              <div
                key={log.id}
                className={`py-0.5 px-1.5 rounded flex items-start space-x-2 hover:bg-zinc-900 transition-colors leading-relaxed break-all ${levelClass}`}
              >
                <span className="text-[10px] text-zinc-500 select-none whitespace-nowrap pt-0.5">
                  {log.timestamp}
                </span>
                <span
                  className={`text-[9px] font-semibold px-1 py-0.2 rounded border uppercase select-none whitespace-nowrap mt-0.5 ${badgeClass}`}
                >
                  {log.level}
                </span>
                <span className="flex-1 font-mono">{log.raw}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
        <span>
          Showing <span className="text-zinc-300 font-medium">{filteredLogs.length}</span> of{' '}
          <span className="text-zinc-300 font-medium">{logs.length}</span> buffered lines (max {MAX_LOG_LINES})
        </span>
        <span>Connected to container: <code className="text-zinc-400">pz-server</code></span>
      </div>
    </div>
  );
}
