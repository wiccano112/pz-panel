# Project Zomboid Dedicated Server Management Panel (PZ-Panel)
## 📋 ToDo List - Próxima Sesión

### 🎯 Objetivo Principal
Estandarizar la barra flotante de guardado (`Sticky Bottom Action Bar`) en todas las vistas de configuración del panel, replicando el patrón visual e interactivo de **Server Properties & Settings** (`ServerSettingsClient.tsx`).

---

### 📌 Tareas Pendientes (Backlog)

- [x] **1. Sandbox World Settings (`SandboxManagerClient.tsx`)**
  - [x] Convertir el contenedor de guardado actual (footer estático) en una barra flotante (`sticky bottom-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl flex items-center justify-between z-20`).
  - [x] Agregar la leyenda informativa izquierda con icono `HelpCircle`:
    > *"Saving updates the `ServerName_SandboxVars.lua` configuration directly."*
  - [x] Alinear a la derecha el feedback de estado (`state.message`) con colores condicionales (`emerald-400` / `rose-400`) y el botón `Save Sandbox Configuration` con spinner (`isPending` / `RefreshCw`).
  - [x] Asegurar que el scroll vertical de la lista de opciones no quede tapado por la barra flotante (padding inferior adecuado en el contenedor principal `pb-12`).

- [x] **2. Mods & Workshop Manager (`ModManagerClient.tsx`)**
  - [x] Reemplazar el contenedor estático inferior por la barra flotante estandarizada (`sticky bottom-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl flex items-center justify-between z-20`).
  - [x] Agregar la leyenda informativa izquierda con icono `HelpCircle`:
    > *"Saving writes directly to `ServerName.ini` (Mods, WorkshopItems, and Map order)."*
  - [x] Alinear a la derecha el estado del Server Action (`state.message`) y el botón `Save Configuration` con feedback interactivo de guardado.
  - [x] Mantener la ventana modal post-guardado de advertencia de reinicio del servidor intacta.

- [x] **3. Tarjeta de Versión Flotante (`Sidebar.tsx` / Layout)**
  - [x] Convertir la tarjeta de versión y release (`vX.Y.Z`, estado, fecha y enlace a GitHub) en un elemento **flotante fijo** posicionado siempre abajo a la izquierda (`fixed bottom-4 left-4 z-40 w-56` o `sticky bottom-4`).
  - [x] Asegurar que no se oculte al scrollear la barra lateral ni se superponga con los elementos de navegación.
  - [x] Mantener el diseño compacto y estilizado (`bg-zinc-950/80 backdrop-blur border border-zinc-800 shadow-xl rounded-lg p-2.5`).

- [ ] **4. Investigación y Estrategia de Vista Mobile / Responsive**
  - [ ] **Arquitectura de Navegación Mobile:**
    - [ ] Evaluar Drawer / Menú lateral colapsable (Hamburger menu con backdrop) vs. Bottom Navigation Bar para dispositivos móviles.
    - [ ] Adaptabilidad de la barra de versión flotante en pantallas pequeñas.
  - [ ] **Evaluación de Frameworks de UI / Librerías de Componentes:**
    - [ ] Analizar mantener el stack puro actual (**Tailwind CSS v4 + Lucide React**) optimizando breakpoints nativos (`sm:`, `md:`, `lg:`).
    - [ ] Evaluar librerías headless / estilizadas complementarias compatibles con React 19 (ej. Radix UI / shadcn/ui primitives vs. MUI / Mantine).
    - [ ] Considerar el impacto en el bundle size, performance del contenedor Docker y compatibilidad con Turbopack / Next.js 16.
  - [ ] **Adaptabilidad de Vistas Complejas:**
    - [ ] Grillas de Sandbox y Server Properties en una sola columna con espaciados táctiles cómodos (touch targets >= 44px).
    - [ ] Tablas de Moderación y Logs con scroll horizontal o tarjetas expandibles estilo accordion para móviles.
    - [ ] Drag & Drop de Mods y Workshop adaptado a interacción touch (botones arriba/abajo como alternativa al drag).

- [x] **5. Control de Calidad y Pruebas**
  - [x] Ejecutar `pnpm run validate` (ESLint 0 warnings, TypeScript estricto, Vitest suite completa).
  - [x] Reconstruir y levantar el contenedor con `docker compose up -d --build`.
  - [x] Verificar visualmente el comportamiento responsivo en móviles (emulación Chrome DevTools 375px/414px) y pantallas grandes.

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
