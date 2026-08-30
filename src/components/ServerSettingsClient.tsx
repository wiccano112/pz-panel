"use client";

import { useState, useActionState, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Sliders,
  MapPin,
  Save,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  X,
  RefreshCw,
  HelpCircle,
  FileText,
} from 'lucide-react';
import {
  SpawnRegionItem,
} from '@/types/serverSettings';

import {
  SERVER_PROPERTIES_SCHEMA,
  SERVER_PROPERTY_CATEGORIES,
  OFFICIAL_SPAWN_REGIONS,
} from '@/constants/serverProperties';
import {
  handleSaveServerPropertiesAction,
  handleSaveSpawnRegionsAction,
  handleServerAction,
} from '@/app/actions';

interface ServerSettingsClientProps {
  initialProperties: Record<string, string>;
  initialSpawnRegions: SpawnRegionItem[];
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md shadow-sm transition-colors cursor-pointer"
      aria-label={label}
    >
      {pending ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function RestartButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded shadow transition-colors cursor-pointer"
      aria-label="Restart Server Now"
    >
      {pending ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RefreshCw className="w-3.5 h-3.5" />
      )}
      <span>Restart Server</span>
    </button>
  );
}

export default function ServerSettingsClient({
  initialProperties,
  initialSpawnRegions,
}: ServerSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'properties' | 'spawns'>('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Form states for Properties
  const [properties, setProperties] = useState<Record<string, string | number | boolean>>(() => {
    const initial: Record<string, string | number | boolean> = {};
    for (const meta of SERVER_PROPERTIES_SCHEMA) {
      const rawVal = initialProperties[meta.key];
      if (rawVal !== undefined) {
        if (meta.type === 'boolean') {
          initial[meta.key] = rawVal.toLowerCase() === 'true';
        } else if (meta.type === 'number') {
          const num = Number(rawVal);
          initial[meta.key] = isNaN(num) ? meta.defaultValue : num;
        } else {
          initial[meta.key] = rawVal;
        }
      } else {
        initial[meta.key] = meta.defaultValue;
      }
    }
    return initial;
  });

  // Form states for Spawn Regions
  const [spawnRegions, setSpawnRegions] = useState<SpawnRegionItem[]>(initialSpawnRegions);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionFile, setNewRegionFile] = useState('');
  const [addModalError, setAddModalError] = useState('');

  // Server Action hooks
  const [propState, propAction] = useActionState(handleSaveServerPropertiesAction, null);
  const [spawnState, spawnAction] = useActionState(handleSaveSpawnRegionsAction, null);
  const [restartState, restartAction] = useActionState(handleServerAction, null);

  const [dismissedPropState, setDismissedPropState] = useState<unknown>(null);
  const [dismissedSpawnState, setDismissedSpawnState] = useState<unknown>(null);

  const showPropRestartModal = Boolean(
    propState && propState.success && dismissedPropState !== propState
  );
  const showSpawnRestartModal = Boolean(
    spawnState && spawnState.success && dismissedSpawnState !== spawnState
  );

  const handlePropertyChange = (key: string, value: string | number | boolean) => {
    setProperties((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetProperties = () => {
    const resetValues: Record<string, string | number | boolean> = {};
    for (const meta of SERVER_PROPERTIES_SCHEMA) {
      resetValues[meta.key] = meta.defaultValue;
    }
    setProperties(resetValues);
  };

  // Filtered properties
  const filteredProperties = useMemo(() => {
    return SERVER_PROPERTIES_SCHEMA.filter((meta) => {
      const matchesCategory = activeCategory === 'all' || meta.category === activeCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        meta.label.toLowerCase().includes(query) ||
        meta.key.toLowerCase().includes(query) ||
        meta.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Toggle official spawn region
  const handleToggleOfficialSpawn = (official: SpawnRegionItem) => {
    const exists = spawnRegions.some(
      (r) => r.name.toLowerCase() === official.name.toLowerCase()
    );

    if (exists) {
      // Don't allow removing all spawn regions
      if (spawnRegions.length <= 1) {
        return;
      }
      setSpawnRegions((prev) =>
        prev.filter((r) => r.name.toLowerCase() !== official.name.toLowerCase())
      );
    } else {
      setSpawnRegions((prev) => [...prev, official]);
    }
  };

  // Add custom spawn region
  const handleAddCustomSpawn = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRegionName.trim();
    let file = newRegionFile.trim();

    if (!name) {
      setAddModalError('Region name is required.');
      return;
    }
    if (!file) {
      setAddModalError('Map spawnpoints.lua file path is required.');
      return;
    }

    if (!file.startsWith('media/maps/')) {
      file = `media/maps/${file}`;
    }
    if (!file.endsWith('spawnpoints.lua')) {
      file = `${file.replace(/\/+$/, '')}/spawnpoints.lua`;
    }

    if (spawnRegions.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setAddModalError('A spawn region with this name already exists.');
      return;
    }

    setSpawnRegions((prev) => [...prev, { name, file, isOfficial: false }]);
    setNewRegionName('');
    setNewRegionFile('');
    setAddModalError('');
    setIsAddModalOpen(false);
  };

  const handleRemoveSpawnRegion = (name: string) => {
    if (spawnRegions.length <= 1) {
      alert('You must have at least one spawn region configured.');
      return;
    }
    setSpawnRegions((prev) => prev.filter((r) => r.name !== name));
  };

  return (
    <div className="space-y-6">
      {/* Restart Reminder Modal (Properties) */}
      {showPropRestartModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-full text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Server Properties Saved</h4>
                  <p className="text-xs text-zinc-400">Server configuration file was successfully updated</p>
                </div>
              </div>
              <button
                onClick={() => setDismissedPropState(propState)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-800/60 p-3 rounded border border-zinc-700/50">
              Changes to core server properties (.ini) take effect on the next server reboot. Restart the dedicated server now to apply these settings.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDismissedPropState(propState)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded border border-zinc-700 transition-colors cursor-pointer"
              >
                Restart Later
              </button>
              <form action={restartAction}>
                <input type="hidden" name="actionType" value="restart" />
                <RestartButton />
              </form>
            </div>
            {restartState && (
              <p className={`text-xs ${restartState.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {restartState.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Restart Reminder Modal (Spawn Regions) */}
      {showSpawnRestartModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-full text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Spawn Regions Saved</h4>
                  <p className="text-xs text-zinc-400">Spawn regions configuration was successfully updated</p>
                </div>
              </div>
              <button
                onClick={() => setDismissedSpawnState(spawnState)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-800/60 p-3 rounded border border-zinc-700/50">
              Updated spawn regions will be available for new character creations after rebooting the server.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDismissedSpawnState(spawnState)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded border border-zinc-700 transition-colors cursor-pointer"
              >
                Restart Later
              </button>
              <form action={restartAction}>
                <input type="hidden" name="actionType" value="restart" />
                <RestartButton />
              </form>
            </div>
            {restartState && (
              <p className={`text-xs ${restartState.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {restartState.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Card Header */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>Server Settings & World Properties</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Configure core dedicated server properties (.ini), backup policies, gameplay safety, and character spawn regions (.lua).
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-700 space-x-4">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex items-center space-x-2 pb-3 px-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'properties'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="Server Properties Tab"
        >
          <Sliders className="w-4 h-4" />
          <span>Server Properties (.ini)</span>
        </button>

        <button
          onClick={() => setActiveTab('spawns')}
          className={`flex items-center space-x-2 pb-3 px-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'spawns'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="Spawn Regions Tab"
        >
          <MapPin className="w-4 h-4" />
          <span>Spawn Regions (.lua)</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
            {spawnRegions.length}
          </span>
        </button>
      </div>

      {/* TAB 1: SERVER PROPERTIES */}
      {activeTab === 'properties' && (
        <form action={propAction} className="space-y-6">
          <input type="hidden" name="properties" value={JSON.stringify(properties)} />

          {/* Search and Category Filters */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search properties by name or description..."
                  className="w-full pl-9 pr-4 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleResetProperties}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded border border-zinc-700 transition-colors cursor-pointer"
                title="Reset all fields to default values"
                aria-label="Reset all properties to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                All Categories ({SERVER_PROPERTIES_SCHEMA.length})
              </button>
              {SERVER_PROPERTY_CATEGORIES.map((cat) => {
                const count = SERVER_PROPERTIES_SCHEMA.filter((p) => p.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProperties.length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg">
                No server properties match your search.
              </div>
            ) : (
              filteredProperties.map((meta) => {
                const currentVal = properties[meta.key] ?? meta.defaultValue;

                return (
                  <div
                    key={meta.key}
                    className="bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 rounded-lg p-4 space-y-3 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <label className="text-sm font-semibold text-white">
                          {meta.label}
                        </label>
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                          {meta.key}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {meta.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80">
                      {meta.type === 'boolean' ? (
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => handlePropertyChange(meta.key, !currentVal)}
                            className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              currentVal ? 'bg-indigo-600' : 'bg-zinc-700'
                            }`}
                            aria-label={`Toggle ${meta.label}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                currentVal ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-medium text-zinc-300">
                            {currentVal ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      ) : meta.type === 'number' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min={meta.min}
                            max={meta.max}
                            step={meta.key.includes('Modifier') ? '0.1' : '1'}
                            value={String(currentVal)}
                            onChange={(e) =>
                              handlePropertyChange(
                                meta.key,
                                e.target.value === '' ? 0 : Number(e.target.value)
                              )
                            }
                            className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={String(currentVal)}
                          onChange={(e) => handlePropertyChange(meta.key, e.target.value)}
                          className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Bottom Bar */}
          <div className="sticky bottom-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-400">
                Saving updates the <code className="text-zinc-300 font-mono">ServerName.ini</code> configuration directly.
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {propState?.message && (
                <span
                  className={`text-xs font-medium ${
                    propState.success ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {propState.message}
                </span>
              )}
              <SubmitButton label="Save Server Properties" />
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: SPAWN REGIONS */}
      {activeTab === 'spawns' && (
        <form action={spawnAction} className="space-y-6">
          <input type="hidden" name="spawnRegions" value={JSON.stringify(spawnRegions)} />

          {/* Official Spawns Toggle Card */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-bold text-white flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-indigo-400" />
                  <span>Official Kentucky Spawn Regions</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Quickly enable or disable canonical spawn points for vanilla towns.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded shadow transition-colors cursor-pointer"
                aria-label="Add custom map spawn region"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Map Spawn Region</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {OFFICIAL_SPAWN_REGIONS.map((official) => {
                const isEnabled = spawnRegions.some(
                  (r) => r.name.toLowerCase() === official.name.toLowerCase()
                );

                return (
                  <button
                    key={official.name}
                    type="button"
                    onClick={() => handleToggleOfficialSpawn(official)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      isEnabled
                        ? 'bg-indigo-950/40 border-indigo-500/80 text-white shadow-sm'
                        : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{official.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 truncate">
                      {official.file}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Spawn Regions List */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Active Spawn Regions Table ({spawnRegions.length})</span>
              </h4>
            </div>

            <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
              {spawnRegions.map((region, idx) => (
                <div
                  key={`${region.name}-${idx}`}
                  className="p-3 bg-zinc-950/40 hover:bg-zinc-950/80 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono text-zinc-500 w-6">#{idx + 1}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{region.name}</span>
                        {region.isOfficial ? (
                          <span className="text-[9px] px-1.5 py-0.2 bg-zinc-800 text-indigo-300 rounded border border-indigo-800/50">
                            Official
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 bg-purple-950/50 text-purple-300 rounded border border-purple-800/50">
                            Workshop Mod Map
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{region.file}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSpawnRegion(region.name)}
                    disabled={spawnRegions.length <= 1}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded border border-zinc-800 transition-colors disabled:opacity-30 cursor-pointer"
                    title="Remove spawn region"
                    aria-label={`Remove spawn region ${region.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Bottom Bar */}
          <div className="sticky bottom-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-400">
                Writes to <code className="text-zinc-300 font-mono">ServerName_spawnregions.lua</code>.
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {spawnState?.message && (
                <span
                  className={`text-xs font-medium ${
                    spawnState.success ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {spawnState.message}
                </span>
              )}
              <SubmitButton label="Save Spawn Regions" />
            </div>
          </div>
        </form>
      )}

      {/* Modal: Add Custom Map Spawn Region */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-indigo-400" />
                <span>Add Custom Map Spawn Region</span>
              </h4>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddModalError('');
                }}
                className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomSpawn} className="space-y-4">
              {addModalError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded text-xs text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{addModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Region Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Raven Creek"
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Spawnpoints File Path
                </label>
                <input
                  type="text"
                  placeholder="media/maps/RavenCreek/spawnpoints.lua"
                  value={newRegionFile}
                  onChange={(e) => setNewRegionFile(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Standard format: <code className="text-zinc-300">media/maps/[MapFolder]/spawnpoints.lua</code>
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setAddModalError('');
                  }}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded border border-zinc-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded shadow transition-colors cursor-pointer"
                >
                  Add Region
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
