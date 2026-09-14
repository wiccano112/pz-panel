# Project Zomboid Dedicated Server Management Panel (PZ-Panel)
## 📋 ToDo List - Backlog y Próximas Sesiones

### 🎯 Objetivo Próxima Sesión
Investigación, arquitectura e implementación de la **Vista Mobile y Experiencia Responsive** del panel (Drawer/Sidebar colapsable, adaptación táctil en vistas de configuración, moderación y tablas de logs).

---

### 📌 Estado del Backlog

- [ ] **1. Investigación y Estrategia de Vista Mobile / Responsive**
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
