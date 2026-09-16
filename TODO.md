# Project Zomboid Dedicated Server Management Panel (PZ-Panel)
## 📋 ToDo List - Backlog y Próximas Sesiones

### 🎯 Objetivo Próxima Sesión
Mantenimiento continuo, nuevas integraciones y monitoreo de rendimiento.

---

### 📌 Estado del Backlog

- [x] **1. Investigación y Estrategia de Vista Mobile / Responsive (v1.0.9)**
  - [x] **Arquitectura de Navegación Mobile:**
    - [x] Drawer lateral colapsable (Hamburger menu con backdrop, auto-close en navegación/ESC) y Top Bar móvil (`md:hidden`).
    - [x] Badge de versión compacto en header móvil y tarjeta completa en pie de Drawer.
  - [x] **Evaluación de Frameworks de UI / Librerías de Componentes:**
    - [x] Mantener stack puro (**Tailwind CSS v4 + React 19 + Lucide React**) sin sobrecoste de librerías headless de terceros.
    - [x] Bundle ultraligero sub-30KB, cero overhead en imagen Docker y compatibilidad total con Turbopack / Next.js 16.
  - [x] **Adaptabilidad de Vistas Complejas:**
    - [x] Grillas de Sandbox y Server Properties en 1 columna en móvil con touch targets >= 44px (`h-11 sm:h-9` y `text-base sm:text-xs` para evitar zoom en iOS Safari).
    - [x] Dropdown selector de categorías nativo en móvil para Sandbox.
    - [x] Tablas de Moderación de Jugadores adaptadas a tarjetas/acordeón colapsables en móvil.
    - [x] Visor de logs con altura responsiva y controles táctiles cómodos.
    - [x] Reordenamiento de Mods y Workshop con botones táctiles accesibles (`ChevronUp`/`ChevronDown`).

---

### ✅ Características Completadas (v1.0.7)

- [x] **Estandarización de Sticky Bottom Action Bar (`ServerSettingsClient.tsx`, `SandboxManagerClient.tsx`, `ModManagerClient.tsx`)**
  - [x] Barras flotantes fijas (`sticky bottom-4 z-20`) con fondo `zinc-900`, borde `zinc-700` y sombras `shadow-2xl`.
  - [x] Leyendas informativas contextuales con icono `HelpCircle` indicando los archivos de destino (`ServerName.ini`, `ServerName_SandboxVars.lua`).
  - [x] Feedback de estado interactivo (`state.message`) y spinner de guardado (`RefreshCw` en `isPending`).
  - [x] Padding inferior optimizado (`pb-12`) en contenedores para evitar solapamiento con el scroll.
- [x] **Tarjeta de Versión y Layout Pinned (`Sidebar.tsx`)**
  - [x] Barra lateral anclada con `sticky top-0 h-screen shrink-0` y scroll independiente para navegación (`overflow-y-auto`).
  - [x] Tarjeta flotante/fija al pie con acabado translúcido (`backdrop-blur`).
- [x] **Pipeline de Calidad y Validación**
  - [x] Validación completa (`pnpm run validate` con 0 errores de ESLint, TypeScript estricto y 54/54 tests en Vitest).
  - [x] Compilación y verificación del contenedor Docker en producción (`docker compose up -d --build`).

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
