# Project Zomboid Dedicated Server Management Panel (PZ-Panel)
## 📋 ToDo List - Próxima Sesión

### 🎯 Objetivo Principal
Estandarizar la barra flotante de guardado (`Sticky Bottom Action Bar`) en todas las vistas de configuración del panel, replicando el patrón visual e interactivo de **Server Properties & Settings** (`ServerSettingsClient.tsx`).

---

### 📌 Tareas Pendientes (Backlog)

- [ ] **1. Sandbox World Settings (`SandboxManagerClient.tsx`)**
  - [ ] Convertir el contenedor de guardado actual (footer estático) en una barra flotante (`sticky bottom-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl flex items-center justify-between z-20`).
  - [ ] Agregar la leyenda informativa izquierda con icono `HelpCircle`:
    > *"Saving updates the `ServerName_SandboxVars.lua` configuration directly."*
  - [ ] Alinear a la derecha el feedback de estado (`state.message`) con colores condicionales (`emerald-400` / `rose-400`) y el botón `Save Sandbox Configuration` con spinner (`isPending` / `RefreshCw`).
  - [ ] Asegurar que el scroll vertical de la lista de opciones no quede tapado por la barra flotante (padding inferior adecuado en el contenedor principal `pb-12`).

- [ ] **2. Mods & Workshop Manager (`ModManagerClient.tsx`)**
  - [ ] Reemplazar el contenedor estático inferior por la barra flotante estandarizada (`sticky bottom-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl flex items-center justify-between z-20`).
  - [ ] Agregar la leyenda informativa izquierda con icono `HelpCircle`:
    > *"Saving writes directly to `ServerName.ini` (Mods, WorkshopItems, and Map order)."*
  - [ ] Alinear a la derecha el estado del Server Action (`state.message`) y el botón `Save Configuration` con feedback interactivo de guardado.
  - [ ] Mantener la ventana modal post-guardado de advertencia de reinicio del servidor intacta.

- [ ] **3. Control de Calidad y Pruebas**
  - [ ] Ejecutar `pnpm run validate` (ESLint 0 warnings, TypeScript estricto, Vitest suite completa).
  - [ ] Reconstruir y levantar el contenedor con `docker compose up -d --build`.
  - [ ] Verificar visualmente el comportamiento responsivo en móviles y pantallas grandes.

---

### 🎨 Referencia de Implementación Estándar (`Sticky Bottom Action Bar`)

```tsx
<div className="sticky bottom-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl flex items-center justify-between z-20">
  <div className="flex items-center space-x-2">
    <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0" />
    <span className="text-xs text-zinc-400">
      Saving updates the <code className="text-zinc-300 font-mono font-semibold">TARGET_FILE.ext</code> configuration directly.
    </span>
  </div>

  <div className="flex items-center space-x-4">
    {state?.message && (
      <span className={`text-xs font-medium ${state.error ? 'text-rose-400' : 'text-emerald-400'}`}>
        {state.message}
      </span>
    )}
    <button
      type="submit"
      disabled={isPending}
      className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md shadow-sm transition-colors cursor-pointer"
    >
      {isPending ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </>
      )}
    </button>
  </div>
</div>
```
