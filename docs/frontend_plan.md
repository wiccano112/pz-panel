# Plan y Arquitectura del Frontend (PZ-Panel)

## 1. Visión General y Stack
- **Framework:** Next.js 16 (App Router) + React 19
- **Estilos:** Tailwind CSS v4 + Lucide React Icons
- **Lenguaje:** TypeScript (Tipado estricto, sin uso de `any`)
- **Estrategia de Estado:** React 19 Server Actions (`useActionState`) para mutaciones con retroalimentación inmediata, y SWR / Server-Sent Events para streams y telemetría en tiempo real.

---

## 2. Estructura de Rutas (App Router)

- **`/` (Dashboard Principal):**
  - Control de energía (Start, Stop, Restart).
  - Telemetría en tiempo real (CPU, RAM, Red, Uptime, Jugadores).
  - Terminal de logs en vivo mediante Server-Sent Events (`tail -f pz-server`).
- **`/mods` (Gestor de Mods & Steam Workshop):**
  - Catálogo dinámico con API de Steam Workshop para la versión Build 42.
  - Gestión y reordenamiento interactivo (Drag & Drop) de `Mod IDs`, `Map IDs` y `Workshop Items`.
- **`/sandbox` (Configuración de Sandbox del Mundo):**
  - Editor visual categorizado para `servertest_SandboxVars.lua`.
  - Pestañas temáticas: Zombis, Botín, Mundo, Vehículos, Superviviente y Opciones Avanzadas (B42).
- **`/players` (Gestión de Jugadores & Moderación):**
  - Supervivientes activos en vivo (polling SWR).
  - CRUD de Lista Blanca (Whitelist) y roles de permisos.
  - Sistema de baneos por Steam ID e IP con persistencia nativa en `servertest.db`.
  - Anuncios directos al chat global del servidor (`servermsg`).

---

## 3. Estructura de Componentes

### 3.1 Layout Global
- **`Sidebar` / `NavLinks` (`src/components/NavLinks.tsx`):** Menú lateral persistente con enlaces e iconos dinámicos para las 4 secciones principales.

### 3.2 Dashboard (`/`)
- **`DashboardPage` (`src/app/page.tsx` - Server Component):** Renderizado inicial del servidor con estado base del contenedor.
- **`ServerStatusCard` (`src/components/ServerStatusCard.tsx`):** Control del ciclo de vida del contenedor Docker vía Server Actions.
- **`ServerMetricsCard` (`src/components/ServerMetricsCard.tsx`):** Polling cada 3 segundos a `/api/stats`.
- **`ServerLogsCard` (`src/components/ServerLogsCard.tsx`):** Conexión SSE a `/api/logs`, filtrado por nivel de log (All, Info, Warning, Error, Debug), buscador y auto-scroll.

### 3.3 Gestor de Mods (`/mods`)
- **`ModsPage` (`src/app/mods/page.tsx` - Server Component):** Lectura inicial de `servertest.ini`.
- **`ModManagerClient` (`src/components/ModManagerClient.tsx`):**
  - Columnas reordenadas: `Mod IDs (Load Order)` -> `Map IDs (Priority)` -> `Workshop Items`.
  - Arrastradores visuales (`GripVertical`) y botones de subida/bajada rápida para definir el orden de carga.
  - Bloqueo visual e inamovible de `Muldraugh, KY` como mapa base al final de la lista.
- **`ModCatalog` (`src/components/ModCatalog.tsx`):**
  - Consumo SWR de `/api/workshop`.
  - Paginación a 12 ítems por página, búsqueda con debounce (400ms) y selector de rango temporal.
  - Diálogo modal con enlace a Steam para resolución de `Mod ID` en mods comunitarios.

### 3.4 Configuración de Sandbox (`/sandbox`)
- **`SandboxPage` (`src/app/sandbox/page.tsx` - Server Component):** Carga inicial de variables Lua.
- **`SandboxManagerClient` (`src/components/SandboxManagerClient.tsx`):**
  - 6 pestañas organizadas con iconos dinámicos.
  - Buscador reactivo instantáneo entre todas las variables.
  - Guardado atómico con modal informativo de reinicio requerido.

### 3.5 Jugadores & Moderación (`/players`)
- **`PlayersPage` (`src/app/players/page.tsx` - Server Component):** Carga de datos de jugadores y base de datos.
- **`PlayerManagerClient` (`src/components/PlayerManagerClient.tsx`):**
  - 4 sub-pestañas: Jugadores en Vivo, Whitelist, Baneos y Broadcast.
  - Mutaciones seguras con consultas SQL parametrizadas a través de Server Actions.

---

## 4. Endpoints y Route Handlers

| Ruta | Método | Propósito | Estrategia |
| :--- | :--- | :--- | :--- |
| `/api/stats` | `GET` | Telemetría de Docker stats y jugadores | Polling SWR (3s) |
| `/api/logs` | `GET` | Stream de salida de `docker logs -f` | Server-Sent Events (SSE) |
| `/api/workshop` | `GET` | Búsqueda y paginación en Steam Workshop | Next.js fetch cache + SWR |
| `/api/players/live` | `GET` | Lista de jugadores conectados y base de datos | Polling SWR (6s) |
