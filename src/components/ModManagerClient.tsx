"use client";

import { useState, useActionState } from 'react';
import { handleSaveIniAction } from '@/app/actions';
import { Trash2, Lock, Plus, Save, PackagePlus } from 'lucide-react';

interface InitialData {
  workshopItems: string[];
  mods: string[];
  maps: string[];
}

interface ModManagerClientProps {
  initialData: InitialData;
}

const POPULAR_MODS = [
  { name: 'Mod Template', workshopId: '123456789', modId: 'ModTemplate', mapId: 'TemplateMap' },
  { name: 'Arsenal(26) GunFighter', workshopId: '2297098490', modId: 'Arsenal(26)GunFighter', mapId: '' },
  { name: 'Tsar\'s Common Library', workshopId: '2392709985', modId: 'tsarslib', mapId: '' },
];

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

  const addModFromCatalog = (modItem: typeof POPULAR_MODS[0]) => {
    if (modItem.workshopId && !workshopItems.includes(modItem.workshopId)) {
      setWorkshopItems(prev => [...prev, modItem.workshopId]);
    }
    if (modItem.modId && !mods.includes(modItem.modId)) {
      setMods(prev => [...prev, modItem.modId]);
    }
    if (modItem.mapId && !maps.includes(modItem.mapId)) {
      setMaps(prev => [modItem.mapId, ...prev.filter(m => m !== 'Muldraugh, KY'), 'Muldraugh, KY']);
    }
  };

  const addItemManual = (type: 'workshop' | 'mod' | 'map') => {
    const val = prompt(`Enter ${type} ID:`);
    if (!val) return;
    if (type === 'workshop') setWorkshopItems(prev => [...prev, val]);
    if (type === 'mod') setMods(prev => [...prev, val]);
    if (type === 'map') setMaps(prev => [val, ...prev.filter(m => m !== 'Muldraugh, KY'), 'Muldraugh, KY']);
  };

  return (
    <div className="space-y-6">
      
      {/* Mod Catalog */}
      <div className="bg-white p-6 shadow rounded-lg border border-slate-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <PackagePlus className="w-5 h-5 text-blue-500" />
          <span>Mod Catalog (Popular)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {POPULAR_MODS.map(mod => (
            <div key={mod.modId} className="p-4 border rounded-md flex justify-between items-center bg-slate-50">
              <div>
                <p className="font-semibold text-sm">{mod.name}</p>
                <p className="text-xs text-slate-500">WS: {mod.workshopId}</p>
              </div>
              <button 
                onClick={() => addModFromCatalog(mod)}
                className="text-blue-600 hover:text-blue-800 bg-blue-100 p-2 rounded-md"
                title="Add to configuration"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Workshop Items */}
        <div className="bg-white p-4 shadow rounded-lg border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Workshop Items</h3>
            <button onClick={() => addItemManual('workshop')} className="text-slate-500 hover:text-blue-600"><Plus className="w-5 h-5" /></button>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-96 space-y-2">
            {workshopItems.length === 0 && <li className="text-sm text-slate-500 text-center py-4">No items</li>}
            {workshopItems.map((item, idx) => (
              <li key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                <span className="text-sm font-mono truncate">{item}</span>
                <button onClick={() => removeItem('workshop', idx)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Mods */}
        <div className="bg-white p-4 shadow rounded-lg border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Mod IDs</h3>
            <button onClick={() => addItemManual('mod')} className="text-slate-500 hover:text-blue-600"><Plus className="w-5 h-5" /></button>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-96 space-y-2">
            {mods.length === 0 && <li className="text-sm text-slate-500 text-center py-4">No mods</li>}
            {mods.map((mod, idx) => (
              <li key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                <span className="text-sm font-mono truncate">{mod}</span>
                <button onClick={() => removeItem('mod', idx)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Maps */}
        <div className="bg-white p-4 shadow rounded-lg border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Map IDs</h3>
            <button onClick={() => addItemManual('map')} className="text-slate-500 hover:text-blue-600"><Plus className="w-5 h-5" /></button>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-96 space-y-2">
            {maps.length === 0 && <li className="text-sm text-slate-500 text-center py-4">No maps</li>}
            {maps.map((map, idx) => {
              const isCore = map === 'Muldraugh, KY';
              return (
                <li key={idx} className={`flex justify-between items-center p-2 rounded border ${isCore ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-sm font-mono truncate">{map}</span>
                  {isCore ? (
                    <span title="Core map cannot be removed">
                      <Lock className="w-4 h-4 text-amber-600" />
                    </span>
                  ) : (
                    <button onClick={() => removeItem('map', idx)} className="text-red-500 hover:text-red-700">
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
      <div className="bg-white p-4 shadow rounded-lg border border-slate-200 flex items-center justify-between">
        <form action={formAction}>
          <input type="hidden" name="workshopItems" value={JSON.stringify(workshopItems)} />
          <input type="hidden" name="mods" value={JSON.stringify(mods)} />
          <input type="hidden" name="maps" value={JSON.stringify(maps)} />
          
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isPending ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </form>

        {state?.message && (
          <span className={`text-sm font-medium ${state.error ? 'text-red-600' : 'text-green-600'}`}>
            {state.message}
          </span>
        )}
      </div>

    </div>
  );
}
