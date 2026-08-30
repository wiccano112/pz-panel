"use client";

import { useState, useActionState } from 'react';
import { handleSaveIniAction } from '@/app/actions';
import {
  Trash2,
  Lock,
  Plus,
  Save,
  RefreshCw,
  X,
  CheckCircle2,
  ArrowRight,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import ModCatalog from '@/components/ModCatalog';
import { CORE_MAP_NAME } from '@/constants/game';

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

  // Drag & Drop State
  const [draggedItem, setDraggedItem] = useState<{ type: 'workshop' | 'mod' | 'map'; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{ type: 'workshop' | 'mod' | 'map'; index: number } | null>(null);

  const [state, formAction, isPending] = useActionState(handleSaveIniAction, null);

  const showRestartModal = Boolean(state && !state.error && dismissedState !== state);

  const removeItem = (type: 'workshop' | 'mod' | 'map', index: number) => {
    if (type === 'workshop') setWorkshopItems(prev => prev.filter((_, i) => i !== index));
    if (type === 'mod') setMods(prev => prev.filter((_, i) => i !== index));
    if (type === 'map') {
      const mapToRemove = maps[index];
      if (mapToRemove === CORE_MAP_NAME) return;
      setMaps(prev => prev.filter((_, i) => i !== index));
    }
  };

  const moveItem = (type: 'workshop' | 'mod' | 'map', fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    if (type === 'mod') {
      setMods(prev => {
        if (toIndex >= prev.length) return prev;
        const copy = [...prev];
        const [item] = copy.splice(fromIndex, 1);
        copy.splice(toIndex, 0, item);
        return copy;
      });
    } else if (type === 'map') {
      setMaps(prev => {
        const nonCoreMaps = prev.filter(m => m !== CORE_MAP_NAME);
        if (fromIndex >= nonCoreMaps.length || toIndex >= nonCoreMaps.length) return prev;
        const copy = [...nonCoreMaps];
        const [item] = copy.splice(fromIndex, 1);
        copy.splice(toIndex, 0, item);
        return [...copy, CORE_MAP_NAME];
      });
    } else if (type === 'workshop') {
      setWorkshopItems(prev => {
        if (toIndex >= prev.length) return prev;
        const copy = [...prev];
        const [item] = copy.splice(fromIndex, 1);
        copy.splice(toIndex, 0, item);
        return copy;
      });
    }
  };

  const handleDragStart = (type: 'workshop' | 'mod' | 'map', index: number) => {
    setDraggedItem({ type, index });
  };

  const handleDragOver = (e: React.DragEvent, type: 'workshop' | 'mod' | 'map', index: number) => {
    e.preventDefault();
    if (draggedItem && draggedItem.type === type) {
      setDragOverIndex({ type, index });
    }
  };

  const handleDrop = (type: 'workshop' | 'mod' | 'map', targetIndex: number) => {
    if (!draggedItem || draggedItem.type !== type) return;
    moveItem(type, draggedItem.index, targetIndex);
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const addModFromCatalog = (modItem: { name: string; workshopId: string; modId: string; mapId?: string }) => {
    if (modItem.workshopId && !workshopItems.includes(modItem.workshopId)) {
      setWorkshopItems(prev => [...prev, modItem.workshopId]);
    }
    if (modItem.modId && !mods.includes(modItem.modId)) {
      setMods(prev => [...prev, modItem.modId]);
    }
    if (modItem.mapId && !maps.includes(modItem.mapId)) {
      setMaps(prev => [modItem.mapId!, ...prev.filter(m => m !== CORE_MAP_NAME), CORE_MAP_NAME]);
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
      if (val === CORE_MAP_NAME) {
        alert(`${CORE_MAP_NAME} is a core base map and is always included by default.`);
        return;
      }
      if (!maps.includes(val)) {
        setMaps(prev => [val, ...prev.filter(m => m !== CORE_MAP_NAME), CORE_MAP_NAME]);
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

      {/* Configured Mods, Maps, and Workshop Items Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1: Mod IDs (Load Order) */}
        <div className="bg-zinc-900 p-4 shadow rounded-lg border border-zinc-700 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-white">Mod IDs (Load Order)</h3>
              <p className="text-[11px] text-zinc-400">Drag to change loading priority</p>
            </div>
            <button 
              onClick={() => addItemManual('mod')} 
              className="text-zinc-400 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
              title="Add Mod ID manually"
              aria-label="Add Mod ID manually"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-96 space-y-2">
            {mods.length === 0 && <li className="text-sm text-zinc-500 text-center py-4">No mods configured</li>}
            {mods.map((mod, idx) => {
              const isDragging = draggedItem?.type === 'mod' && draggedItem.index === idx;
              const isOver = dragOverIndex?.type === 'mod' && dragOverIndex.index === idx;

              return (
                <li
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart('mod', idx)}
                  onDragOver={(e) => handleDragOver(e, 'mod', idx)}
                  onDrop={() => handleDrop('mod', idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex justify-between items-center p-2 bg-zinc-800 rounded border transition-all ${
                    isDragging
                      ? 'opacity-40 border-dashed border-indigo-500'
                      : isOver
                      ? 'border-indigo-400 bg-zinc-750'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <span
                      className="text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing p-0.5"
                      title="Drag to reorder"
                      aria-label="Drag to reorder mod"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 w-5 text-center">{idx + 1}</span>
                    <span className="text-sm font-mono truncate text-zinc-100">{mod}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Quick Move Up/Down */}
                    <button
                      type="button"
                      onClick={() => moveItem('mod', idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer"
                      title="Move Up"
                      aria-label={`Move mod ${mod} up`}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem('mod', idx, idx + 1)}
                      disabled={idx === mods.length - 1}
                      className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer"
                      title="Move Down"
                      aria-label={`Move mod ${mod} down`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem('mod', idx)}
                      className="p-1 text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove Mod ID"
                      aria-label={`Remove mod ${mod}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* CARD 2: Map IDs (Map Order) */}
        <div className="bg-zinc-900 p-4 shadow rounded-lg border border-zinc-700 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-white">Map IDs (Priority)</h3>
              <p className="text-[11px] text-zinc-400">Custom maps must load before base map</p>
            </div>
            <button 
              onClick={() => addItemManual('map')} 
              className="text-zinc-400 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
              title="Add Map ID manually"
              aria-label="Add Map ID manually"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-96 space-y-2">
            {maps.length === 0 && <li className="text-sm text-zinc-500 text-center py-4">No maps configured</li>}
            {maps.map((map, idx) => {
              const isCore = map === CORE_MAP_NAME;
              const nonCoreCount = maps.filter(m => m !== CORE_MAP_NAME).length;
              const isDragging = draggedItem?.type === 'map' && draggedItem.index === idx;
              const isOver = dragOverIndex?.type === 'map' && dragOverIndex.index === idx;

              return (
                <li
                  key={idx}
                  draggable={!isCore}
                  onDragStart={() => !isCore && handleDragStart('map', idx)}
                  onDragOver={(e) => !isCore && handleDragOver(e, 'map', idx)}
                  onDrop={() => !isCore && handleDrop('map', idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex justify-between items-center p-2 rounded border transition-all ${
                    isCore
                      ? 'bg-amber-900/40 border-amber-700'
                      : isDragging
                      ? 'opacity-40 border-dashed border-indigo-500 bg-zinc-800'
                      : isOver
                      ? 'border-indigo-400 bg-zinc-750'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {!isCore ? (
                      <span
                        className="text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing p-0.5"
                        title="Drag to reorder map priority"
                        aria-label="Drag to reorder map"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="w-5 text-center text-amber-500" title="Core map locked at base priority">
                        <Lock className="w-3.5 h-3.5 mx-auto" />
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-zinc-500 w-5 text-center">{idx + 1}</span>
                    <span className="text-sm font-mono truncate text-zinc-100">{map}</span>
                  </div>

                  {isCore ? (
                    <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 bg-amber-950/60 rounded border border-amber-800">
                      Core Base
                    </span>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => moveItem('map', idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer"
                        title="Move Up"
                        aria-label={`Move map ${map} up`}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem('map', idx, idx + 1)}
                        disabled={idx >= nonCoreCount - 1}
                        className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer"
                        title="Move Down"
                        aria-label={`Move map ${map} down`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem('map', idx)}
                        className="p-1 text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove Map ID"
                        aria-label={`Remove map ${map}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* CARD 3: Workshop Items (Download Queue) */}
        <div className="bg-zinc-900 p-4 shadow rounded-lg border border-zinc-700 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-white">Workshop Items</h3>
              <p className="text-[11px] text-zinc-400">Steam Workshop download IDs</p>
            </div>
            <button 
              onClick={() => addItemManual('workshop')} 
              className="text-zinc-400 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
              title="Add workshop item manually"
              aria-label="Add workshop item manually"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-96 space-y-2">
            {workshopItems.length === 0 && <li className="text-sm text-zinc-500 text-center py-4">No items</li>}
            {workshopItems.map((item, idx) => {
              const isDragging = draggedItem?.type === 'workshop' && draggedItem.index === idx;
              const isOver = dragOverIndex?.type === 'workshop' && dragOverIndex.index === idx;

              return (
                <li
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart('workshop', idx)}
                  onDragOver={(e) => handleDragOver(e, 'workshop', idx)}
                  onDrop={() => handleDrop('workshop', idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex justify-between items-center p-2 bg-zinc-800 rounded border transition-all ${
                    isDragging
                      ? 'opacity-40 border-dashed border-indigo-500'
                      : isOver
                      ? 'border-indigo-400 bg-zinc-750'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <span
                      className="text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing p-0.5"
                      title="Drag to reorder"
                      aria-label="Drag to reorder workshop item"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 w-5 text-center">{idx + 1}</span>
                    <span className="text-sm font-mono truncate text-zinc-100">{item}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => moveItem('workshop', idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer"
                      title="Move Up"
                      aria-label={`Move workshop item ${item} up`}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem('workshop', idx, idx + 1)}
                      disabled={idx === workshopItems.length - 1}
                      className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer"
                      title="Move Down"
                      aria-label={`Move workshop item ${item} down`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem('workshop', idx)}
                      className="p-1 text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove Workshop Item"
                      aria-label={`Remove workshop item ${item}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
            className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer font-medium"
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
