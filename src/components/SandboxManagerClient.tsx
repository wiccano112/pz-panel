"use client";

import { useState, useActionState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
  AlertTriangle,
  RefreshCw,
  X,
  ArrowRight,
  Search,
  Sliders,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import Link from 'next/link';

export interface SandboxManagerClientProps {
  initialVars: SandboxVarsData;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Skull; color: string }> = {
  zombies: { icon: Skull, color: 'text-rose-400' },
  loot: { icon: Package, color: 'text-amber-400' },
  world: { icon: Sun, color: 'text-sky-400' },
  vehicles: { icon: Car, color: 'text-blue-400' },
  character: { icon: UserCheck, color: 'text-emerald-400' },
  advanced: { icon: Wrench, color: 'text-purple-400' },
  mods: { icon: Sliders, color: 'text-teal-400' },
};

const VALID_SANDBOX_CATEGORIES = SANDBOX_CATEGORIES.map((c) => c.id);

export default function SandboxManagerClient({ initialVars }: SandboxManagerClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get('tab') || searchParams.get('category');
  const activeCategory = tabParam && VALID_SANDBOX_CATEGORIES.includes(tabParam) ? tabParam : 'zombies';

  const [vars, setVars] = useState<SandboxVarsData>(initialVars);
  const [initialVarsJson] = useState(() => JSON.stringify(initialVars));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dismissedState, setDismissedState] = useState<unknown>(null);
  const { isDirty, setIsDirty } = useUnsavedChanges();
  const [state, formAction, isPending] = useActionState(handleSaveSandboxAction, null);

  // Sync isDirty state
  useEffect(() => {
    setIsDirty(JSON.stringify(vars) !== initialVarsJson);
  }, [vars, initialVarsJson, setIsDirty]);

  // Clear isDirty on save
  useEffect(() => {
    if (state && !state.error) {
      setIsDirty(false);
    }
  }, [state, setIsDirty]);

  const handleCategoryChange = (catId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', catId);
    params.delete('category');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
    <div className="space-y-6 pb-12">
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
                  <p className="text-xs text-zinc-400">World variables have been updated successfully</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedState(state)}
                className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-4 space-y-2">
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

      {/* Header Card */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Unsaved Changes Alert Banner */}
      {isDirty && (
        <div className="bg-amber-950/40 border border-amber-500/50 text-amber-200 px-4 py-3 rounded-lg flex items-center justify-between text-sm shadow-md animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              Tienes cambios pendientes sin guardar. Recuerda pulsar <strong>Save Sandbox Configuration</strong> al pie antes de cambiar de pantalla.
            </span>
          </div>
        </div>
      )}

      {/* Category Tabs & Mobile Selector */}
      {!searchQuery.trim() && (
        <>
          {/* Mobile Category Dropdown */}
          <div className="block md:hidden border-b border-zinc-800 bg-zinc-900/90 rounded-t-lg p-3">
            <label htmlFor="sandbox-mobile-category-select" className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Select Category
            </label>
            <div className="relative">
              <select
                id="sandbox-mobile-category-select"
                value={activeCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] bg-zinc-800 border border-zinc-700 rounded-md text-base text-zinc-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                aria-label="Select Sandbox Category"
              >
                {SANDBOX_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Desktop Category Tabs */}
          <div className="hidden md:flex overflow-x-auto border-b border-zinc-800 bg-zinc-900/60 rounded-t-lg px-4 gap-2">
            {SANDBOX_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat.id] || { icon: Sliders, color: 'text-zinc-400' };
              const Icon = cfg.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Main Content Card */}
      <div className={`bg-zinc-900 border border-zinc-700 shadow-xl overflow-hidden ${!searchQuery.trim() ? 'rounded-b-lg' : 'rounded-lg'}`}>
        {/* Category Fields Content */}
        <div className="p-4 sm:p-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {currentCategory.fields.map((field) => renderField(field))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <form action={formAction}>
        <input type="hidden" name="sandboxVars" value={JSON.stringify(vars)} />
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-400">
              Saving updates <code className="text-zinc-300 font-mono font-semibold">ServerName_SandboxVars.lua</code> directly.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            {state?.message && (
              <span
                className={`text-xs font-medium text-center sm:text-left ${
                  state.error ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {state.message}
              </span>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md shadow-sm transition-colors cursor-pointer w-full sm:w-auto"
              aria-label="Save Sandbox Configuration"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Sandbox Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
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
              className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-zinc-900 border border-zinc-700 rounded-md text-base sm:text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
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
              className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-zinc-900 border border-zinc-700 rounded-md text-base sm:text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            />
          )}

          {field.type === 'string' && (
            <input
              type="text"
              value={String(val ?? '')}
              onChange={(e) => handleFieldChange(field.key, field.subTable, e.target.value)}
              className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-zinc-900 border border-zinc-700 rounded-md text-base sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            />
          )}

          {field.type === 'boolean' && (
            <label className="flex items-center space-x-3 cursor-pointer min-h-[44px] py-1 px-1 -mx-1 rounded-md hover:bg-zinc-750 transition-colors">
              <input
                type="checkbox"
                checked={Boolean(val)}
                onChange={(e) => handleFieldChange(field.key, field.subTable, e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 bg-zinc-900 border-zinc-700 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm sm:text-xs font-medium text-zinc-300 select-none">
                {Boolean(val) ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          )}
        </div>
      </div>
    );
  }
}
