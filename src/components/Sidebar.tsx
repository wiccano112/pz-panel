import NavLinks from './NavLinks';
import buildInfo from '../version.json';
import { Calendar, ExternalLink } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-900 text-white p-4 flex flex-col border-r border-zinc-800 min-h-screen">
      {/* Header */}
      <div className="mb-6 px-1 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>PZ-Panel</span>
        </h1>
        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Dedicated
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1">
        <NavLinks />
      </div>

      {/* Footer / Version Watermark */}
      <div className="mt-auto pt-4 border-t border-zinc-800/80 text-xs">
        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span>v{buildInfo.version}</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded uppercase">
              {buildInfo.channel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
            <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
            <span>Creado: {buildInfo.releaseDate}</span>
          </div>

          {buildInfo.repoUrl && (
            <a
              href={`${buildInfo.repoUrl}/releases/tag/v${buildInfo.version}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors pt-1 border-t border-zinc-800/40"
            >
              <span>GitHub Release</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
