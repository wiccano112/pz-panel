"use client";

import { useState, useActionState, useMemo } from 'react';
import { handleSaveSandboxAction } from '@/app/actions';
import { SANDBOX_CATEGORIES } from '@/constants/sandbox';
import { SandboxVarsData } from '@/types/sandbox';
import {
  Skull,
  Package,
  Sun,
  Car,
  UserCheck,
  Save,
  CheckCircle2,
  RefreshCw,
  X,
  ArrowRight,
  Search,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';

export interface SandboxManagerClientProps {
  initialVars: SandboxVarsData;
}

const CATEGORY_ICONS: Record<string, typeof Skull> = {
  zombies: Skull,
  loot: Package,
  world: Sun,
  vehicles: Car,
  character: UserCheck,
};

export default function SandboxManagerClient({ initialVars }: SandboxManagerClientProps) {
  const [vars, setVars] = useState<SandboxVarsData>(initialVars);
  const [activeCategory, setActiveCategory] = useState<string>('zombies');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dismissedState, setDismissedState] = useState<unknown>(null);

  const [state, formAction, isPending] = useActionState(handleSaveSandboxAction, null);

  const showRestartModal = Boolean(state && !state.error && dismissedState !== state);

  const handleFieldChange = (key: string, subTable: string | undefined, value: string | number | boolean) => {
    setVars((prev) => {
      if (subTable) {
        const sub = (prev[subTable] as Record<string, string | number | boolean>) || {};
        return {
          ...prev,
          [subTable]: {
            ...sub,
            [key]: value,
          },
        };
      }
      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const getFieldValue = (key: string, subTable: string | undefined, defaultVal: string | number | boolean) => {
    if (subTable) {
      const sub = vars[subTable] as Record<string, string | number | boolean> | undefined;
      return sub?.[key] ?? defaultVal;
    }
    return vars[key] ?? defaultVal;
  };

  // Filter fields if user types in the search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return SANDBOX_CATEGORIES;

    const q = searchQuery.toLowerCase().trim();
    return SANDBOX_CATEGORIES.map((cat) => ({
      ...cat,
      fields: cat.fields.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.fields.length > 0);
  }, [searchQuery]);

  const currentCategory = filteredCategories.find((c) => c.id === activeCategory) || filteredCategories[0];

  return (
    <div className="space-y-6">
      {/* Restart Required Modal */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-full text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Sandbox Settings Saved</h4>
                  <p className="text-xs text-zinc-400">servertest_SandboxVars.lua updated successfully</p>
                </div>
              </div>
              <button
                onClick={() => setDismissedState(state)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-md text-amber-200 text-sm space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-amber-300">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Server Restart Required</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                Project Zomboid loads world sandbox variables during server boot. You must <strong>restart the server</strong> for changes to apply to your game world.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDismissedState(state)}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-sm font-medium transition-colors cursor-pointer"
              >
                Continue Editing
              </button>
              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors cursor-pointer"
              >
                <span>Go to Dashboard to Restart</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Panel */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
        {/* Header with Search */}
        <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Sliders className="w-6 h-6 text-indigo-400" />
              <span>Sandbox World Settings</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Configure game difficulty, zombie lore, loot abundance, climate, and vehicle mechanics.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sandbox options..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Category Tabs */}
        {!searchQuery.trim() && (
          <div className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-950/40 scrollbar-thin">
            {SANDBOX_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] || Sliders;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center space-x-2 px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400 bg-zinc-800/50'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Category Fields Content */}
        <div className="p-6">
          {searchQuery.trim() ? (
            <div className="space-y-8">
              {filteredCategories.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  No sandbox settings matched your query &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <div key={cat.id} className="space-y-4">
                    <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider border-b border-zinc-800 pb-1">
                      {cat.name}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {cat.fields.map((field) => renderField(field))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : currentCategory ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white">{currentCategory.name}</h4>
                <p className="text-xs text-zinc-400">{currentCategory.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentCategory.fields.map((field) => renderField(field))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between">
          <form action={formAction} className="flex items-center space-x-4">
            <input type="hidden" name="sandboxVars" value={JSON.stringify(vars)} />
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isPending ? 'Saving...' : 'Save Sandbox Configuration'}</span>
            </button>
          </form>

          {state?.message && (
            <span className={`text-sm font-medium ${state.error ? 'text-red-400' : 'text-green-400'}`}>
              {state.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  function renderField(field: (typeof SANDBOX_CATEGORIES)[0]['fields'][0]) {
    const val = getFieldValue(field.key, field.subTable, field.defaultValue);

    return (
      <div key={`${field.subTable || 'root'}-${field.key}`} className="p-4 bg-zinc-800/60 border border-zinc-700/80 rounded-md space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <label className="text-sm font-semibold text-zinc-200 block">{field.label}</label>
            <p className="text-xs text-zinc-400 mt-0.5">{field.description}</p>
          </div>
          {field.subTable && (
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              {field.subTable}
            </span>
          )}
        </div>

        <div className="pt-1">
          {field.type === 'select' && field.options && (
            <select
              value={Number(val)}
              onChange={(e) => handleFieldChange(field.key, field.subTable, Number(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {field.type === 'number' && (
            <input
              type="number"
              value={Number(val)}
              min={field.min}
              max={field.max}
              step={field.step || 1}
              onChange={(e) => handleFieldChange(field.key, field.subTable, parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            />
          )}

          {field.type === 'boolean' && (
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(val)}
                onChange={(e) => handleFieldChange(field.key, field.subTable, e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-zinc-900 border-zinc-700 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-zinc-300">
                {Boolean(val) ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          )}
        </div>
      </div>
    );
  }
}
