"use client";

import { useState, useActionState } from 'react';
import { handleSaveIniAction } from '@/app/actions';
import { Trash2, Lock, Plus, Save } from 'lucide-react';
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

  const [state, formAction, isPending] = useActionState(handleSaveIniAction, null);

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
              className="text-zinc-400 hover:text-indigo-400 transition-colors p-1"
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
                <button onClick={() => removeItem('workshop', idx)} className="text-red-500 hover:text-red-400 transition-colors">
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
              className="text-zinc-400 hover:text-indigo-400 transition-colors p-1"
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
                <button onClick={() => removeItem('mod', idx)} className="text-red-500 hover:text-red-400 transition-colors">
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
              className="text-zinc-400 hover:text-indigo-400 transition-colors p-1"
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
                    <button onClick={() => removeItem('map', idx)} className="text-red-500 hover:text-red-400 transition-colors">
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
