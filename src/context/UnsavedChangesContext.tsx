"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface UnsavedChangesContextType {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  confirmNavigation: (onConfirm: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType>({
  isDirty: false,
  setIsDirty: () => {},
  confirmNavigation: (onConfirm) => onConfirm(),
});

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Browser beforeunload event (tab close / refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const confirmNavigation = useCallback(
    (onConfirm: () => void) => {
      if (!isDirty) {
        onConfirm();
        return;
      }

      setPendingNavigation(() => onConfirm);
    },
    [isDirty]
  );

  const handleConfirmLeave = () => {
    setIsDirty(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleCancelLeave = () => {
    setPendingNavigation(null);
  };

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty, confirmNavigation }}>
      {children}

      {/* In-app navigation confirmation dialog */}
      {pendingNavigation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-white">Unsaved Changes</h3>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              You have unsaved changes in this form. If you leave this page without clicking{' '}
              <strong className="text-white">Save Configuration</strong>, your changes will be lost.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleCancelLeave}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Stay & Save
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Discard Changes & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}
