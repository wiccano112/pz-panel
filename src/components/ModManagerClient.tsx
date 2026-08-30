"use client";

import { useState, useActionState } from 'react';
import { handleSaveIniAction } from '@/app/actions';
import { Trash2, Lock, Plus, Save, RefreshCw, X, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ModCatalog from '@/components/ModCatalog';

export interface InitialData {
  workshopItems: string[];
  mods: string[];
  maps: string[];
}

export interface ModManagerClientProps {
  initialData: InitialData;
}

export default function ModManagerClient({ initialData }: ModManagerClientProps) {
  const [workshopItems, setWorkshopItems] = useState(initialData.workshopItems);
  const [mods, setMods] = useState(initialData.mods);
  const [maps, setMaps] = useState(initialData.maps);
  const [dismissedState, setDismissedState] = useState<unknown>(null);

  const [state, formAction, isPending] = useActionState(handleSaveIniAction, null);

  const showRestartModal = Boolean(state && !state.error && dismissedState !== state);

  const removeItem = (type: 'workshop' | 'mod' | 'map', index: number) => {
    if (type === 'workshop') setWorkshopItems(prev => prev.filter((_, i) => i !== index));
    if (type === 'mod') setMods(prev => prev.filter((_, i) => i !== index));
    if (type === 'map') {
      const mapToRemove = maps[index];
      if (mapToRemove === 'Muldraugh, KY') return;
      setMaps(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addModFromCatalog = (modItem: { name: string; workshopId: string; modId: string; mapId?: string }) => {
    if (modItem.workshopId && !workshopItems.includes(modItem.workshopId)) {
      setWorkshopItems(prev => [...prev, modItem.workshopId]);
    }
    if (modItem.modId && !mods.includes(modItem.modId)) {
      setMods(prev => [...prev, modItem.modId]);
    }
    if (modItem.mapId && !maps.includes(modItem.mapId)) {
      setMaps(prev => [modItem.mapId!, ...prev.filter(m => m !== 'Muldraugh, KY'), 'Muldraugh, KY']);
    }
  };

  const addItemManual = (type: 'workshop' | 'mod' | 'map') => {
    const val = prompt(`Enter ${type} ID:`);
    if (!val) return;
    
    if (type === 'workshop') {
      if (!workshopItems.includes(val)) setWorkshopItems(prev => [...prev, val]);
    }
    if (type === 'mod') {
      if (!mods.includes(val)) setMods(prev => [...prev, val]);
    }
    if (type === 'map') {
      if (val === 'Muldraugh, KY') {
        alert('Muldraugh, KY is a core map and is always included by default.');
        return;
      }
      if (!maps.includes(val)) {
        setMaps(prev => [val, ...prev.filter(m => m !== 'Muldraugh, KY'), 'Muldraugh, KY']);
      }
    }
  };

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
                  <h4 className="text-lg font-bold text-white">Configuration Saved</h4>
                  <p className="text-xs text-zinc-400">servertest.ini was successfully updated</p>
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
                Project Zomboid only downloads and activates new workshop mods when the server starts. You must <strong>restart the server</strong> for your changes to take effect in the game world.
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

      {/* Steam Workshop Mod Catalog */}
      <ModCatalog 
        onAddMod={addModFromCatalog} 
        installedWorkshopIds={workshopItems} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Workshop Items */}
        <div className="bg-zinc-900 p-4 shadow rounded-lg border border-zinc-700 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-white">Workshop Items</h3>
            <button 
              onClick={() => addItemManual('workshop')} 
              className="text-zinc-400 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
              title="Add workshop item manually"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-96 space-y-2">
            {workshopItems.length === 0 && <li className="text-sm text-zinc-500 text-center py-4">No items</li>}
            {workshopItems.map((item, idx) => (
              <li key={idx} className="flex justify-between items-center p-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-sm font-mono truncate text-zinc-100">{item}</span>
                <button onClick={() => removeItem('workshop', idx)} className="text-red-500 hover:text-red-400 transition-colors cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Mods */}
        <div className="bg-zinc-900 p-4 shadow rounded-lg border border-zinc-700 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-white">Mod IDs</h3>
            <button 
              onClick={() => addItemManual('mod')} 
              className="text-zinc-400 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
              title="Add Mod ID manually"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-96 space-y-2">
            {mods.length === 0 && <li className="text-sm text-zinc-500 text-center py-4">No mods</li>}
            {mods.map((mod, idx) => (
              <li key={idx} className="flex justify-between items-center p-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-sm font-mono truncate text-zinc-100">{mod}</span>
                <button onClick={() => removeItem('mod', idx)} className="text-red-500 hover:text-red-400 transition-colors cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Maps */}
        <div className="bg-zinc-900 p-4 shadow rounded-lg border border-zinc-700 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-white">Map IDs</h3>
            <button 
              onClick={() => addItemManual('map')} 
              className="text-zinc-400 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
              title="Add Map ID manually"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-96 space-y-2">
            {maps.length === 0 && <li className="text-sm text-zinc-500 text-center py-4">No maps</li>}
            {maps.map((map, idx) => {
              const isCore = map === 'Muldraugh, KY';
              return (
                <li key={idx} className={`flex justify-between items-center p-2 rounded border ${isCore ? 'bg-amber-900/40 border-amber-700' : 'bg-zinc-800 border-zinc-700'}`}>
                  <span className="text-sm font-mono truncate text-zinc-100">{map}</span>
                  {isCore ? (
                    <span title="Core map cannot be removed">
                      <Lock className="w-4 h-4 text-amber-500" />
                    </span>
                  ) : (
                    <button onClick={() => removeItem('map', idx)} className="text-red-500 hover:text-red-400 transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Save Button & Status */}
      <div className="bg-zinc-900 p-4 shadow rounded-lg border border-zinc-700 flex items-center justify-between">
        <form action={formAction}>
          <input type="hidden" name="workshopItems" value={JSON.stringify(workshopItems)} />
          <input type="hidden" name="mods" value={JSON.stringify(mods)} />
          <input type="hidden" name="maps" value={JSON.stringify(maps)} />
          
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>{isPending ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </form>

        {state?.message && (
          <span className={`text-sm font-medium ${state.error ? 'text-red-400' : 'text-green-400'}`}>
            {state.message}
          </span>
        )}
      </div>

    </div>
  );
}
