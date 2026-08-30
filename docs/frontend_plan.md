# Plan Arquitectónico del Frontend (PZ-Panel)

## 1. Visión General y Stack
- **Framework:** Next.js 16 (App Router) + React 19
- **Estilos:** Tailwind CSS + shadcn/ui
- **Patrón de Arquitectura:** Integración de Server Components (RSC) para cargas iniciales e hidratación de Client Components para interactividad, mutaciones y polling en tiempo real.

## 2. Estructura de Rutas (App Router)
- `/` (Dashboard principal de estado y métricas)
- `/mods` (Gestor visual de Mods, Mapas y Workshop)
- `/api/stats` (Route Handler para el polling de las métricas en tiempo real de Docker)

## 3. Estructura de Componentes

### 3.1 Componentes Globales (Layout)
- **`Sidebar` (Server Component):** Menú de navegación global del panel (Dashboard, Mods).
- **`Layout` (Server Component):** Contenedor raíz que integra el `Sidebar` y envuelve el contenido dinámico mediante `{children}`.

### 3.2 Pantalla Principal (Dashboard - `/`)
- **`DashboardPage` (Server Component):** 
  - Punto de entrada de la página. 
  - Ejecuta la carga estática inicial de `getServerStatus()` desde `serverUtils.ts`.
- **`ServerStatusCard` (Client Component):** 
  - Muestra el estado del contenedor Docker.
  - Expone botones de control (Start, Stop, Restart).
  - Implementa el hook `useActionState` y `useTransition` de React 19 para invocar la Server Action `executeServerAction(action)` de forma asíncrona, gestionando su estado `pending` para deshabilitar los botones mientras la acción se ejecuta.
- **`ServerMetricsCard` (Client Component):**
  - Muestra el uso de CPU, RAM y Network IO.
  - Implementa la librería `swr` de Vercel (o React Query) apuntando al endpoint `/api/stats` para realizar un polling periódico (ej. cada 3 segundos) y mantener los indicadores actualizados en vivo.

### 3.3 Pantalla de Mods (Mods Manager - `/mods`)
- **`ModsPage` (Server Component):** 
  - Realiza un fetch seguro inicial llamando a la función `readIniFile()` en el servidor.
  - Entrega los arreglos de `workshopItems`, `mods` y `maps` al componente cliente mediante props (`initialData`).
- **`ModManagerClient` (Client Component):** 
  - Recibe el `initialData` y gestiona el estado local interactivo del usuario (Listas interactivas o drag&drop).
  - Componentes internos:
    - **`WorkshopList`**: Para gestionar IDs de Steam Workshop.
    - **`ModList`**: Para gestionar los IDs internos de los Mods.
    - **`MapList`**: Para gestionar el ordenamiento y activación de Mapas.
    - **`ModCatalog`**: Catálogo estático de los mods más populares de la comunidad. Debe incluir un botón de "Añadir Mod" que inyecte automáticamente el Workshop ID y el Mod ID correspondientes a los arreglos de estado local (`workshopItems` y `mods`), para ser posteriormente guardados.
  - **Mutación de Datos:** Cuenta con un botón central de guardado que invoca la Server Action `saveIniFile(newWorkshopItems, newMods, newMaps)` envolviéndola en `useActionState` para manejar el *loading state* y *error handling*.

## 4. Estrategia de Consumo de Datos (Data Fetching & Mutations)

### 4.1 Carga Inicial (RSC)
- Evitamos los skeleton loaders innecesarios delegando la primera carga a Next.js Server Components. Funciones como `getServerStatus()` y `readIniFile()` se ejecutan a nivel de Node sin requerir endpoints adicionales en la fase de render.

### 4.2 Mutaciones de Estado (React 19 Server Actions)
- Cualquier modificación (encender servidor, guardar configuración INI) invocará Server Actions directas, eliminando la necesidad de crear rutas de API tipo `POST /api/...`.
- `useActionState` controlará la reactividad, devolviendo éxito o mensaje de error estructurado hacia la UI.

### 4.3 Telemetría en Tiempo Real
- Para `getServerStats()`, el patrón de Server Actions es ineficiente debido a la sobrecarga del polling. Por ello, delegaremos esto a un `Route Handler` estándar (`/app/api/stats/route.ts`) respondiendo en JSON.
- El Cliente consumirá esta ruta pasivamente a través de SWR, separando el ciclo de renderizado de React de las continuas comprobaciones a Docker.

## 5. Reglas de Negocio en la Interfaz (Business Logic)
- **Bloqueo del Mapa Core:** La UI en `MapList` debe bloquear o advertir al usuario sobre "Muldraugh, KY". Aunque el backend en `serverUtils.ts` inyecta forzosamente esta entrada al final del arreglo de mapas por seguridad, la UI debe reflejar esto de forma visual deshabilitando su botón de eliminar o mostrando un candado para evitar confusión.
- **Prevención de Spam en Comandos de Docker:** El `ServerStatusCard` debe hacer "debounce" y bloquear estrictamente múltiples envíos de comandos de encendido o reinicio simultáneos mientras un `useActionState` subyacente de `executeServerAction` se encuentre procesándose.
