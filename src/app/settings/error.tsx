"use client";

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Server settings error:', error);
  }, [error]);

  return (
    <div className="p-8 bg-zinc-900 border border-red-800 rounded-lg text-center space-y-4">
      <div className="inline-flex p-3 bg-red-950/60 rounded-full text-red-400">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-white">Failed to load Server Settings</h3>
      <p className="text-sm text-zinc-400 max-w-md mx-auto">
        Unable to read the server properties (.ini) or spawn regions (.lua) configuration files.
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-sm font-medium transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
