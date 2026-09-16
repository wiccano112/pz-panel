"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Calendar, ExternalLink } from "lucide-react";
import NavLinks from "./NavLinks";
import buildInfo from "../version.json";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Auto-close drawer on route change during render
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Handle ESC key to close drawer and lock body scroll when open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const closeDrawer = () => setIsOpen(false);

  return (
    <header className="md:hidden sticky top-0 z-40 bg-zinc-900 border-b border-zinc-800 select-none">
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
            className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white">
              PZ-Panel
            </h1>
            <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Dedicated
            </span>
          </div>
        </div>

        {/* Compact Version Chip */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-zinc-300 bg-zinc-950/80 px-2 py-1 rounded-md border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
          <span>v{buildInfo.version}</span>
        </div>
      </div>

      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="mb-6 px-1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">
              PZ-Panel
            </h2>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Dedicated
            </span>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close navigation drawer"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <div className="flex-1 overflow-y-auto pr-1">
          <NavLinks onNavigate={closeDrawer} />
        </div>

        {/* Drawer Footer / Version Info */}
        <div className="mt-auto pt-3 border-t border-zinc-800/80 text-xs shrink-0">
          <div className="p-2.5 rounded-lg bg-zinc-950/80 backdrop-blur border border-zinc-800 shadow-xl space-y-1.5">
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
      </div>
    </header>
  );
}
