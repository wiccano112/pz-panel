# 📋 Technical Debt & Code Audit (PZ-Panel)

Documento exhaustivo de deuda técnica, vulnerabilidades potenciales, ineficiencias de rendimiento y oportunidades de refactorización priorizadas para el proyecto **PZ-Panel**.

---

## 🎯 Resumen de Prioridades

| Nivel de Prioridad | Categoría | Total Items |
| :--- | :--- | :---: |
| 🔴 **P0 - BLOCKER / CRITICAL** | Seguridad, Portabilidad y Concurrencia de Escritura | 3 |
| 🟠 **P1 - IMPORTANT** | Rendimiento, Sobrecarga de Procesos y Parser Lua | 3 |
| 🟡 **P2 - MODERATE** | Mantenibilidad, Abstracción de DB y Constantes | 3 |
| 🟢 **P3 - NITPICK** | Accesibilidad, Límites de Memoria SSE y Tipado | 2 |

---

## 🔴 P0 - Blocker & Critical Reliability

### 1. Rutas Absolutas Hardcodeadas (`/opt/pz-server/...` / Host Paths)
- **Ubicación:** 
  - `src/lib/serverUtils.ts` (`INI_PATH = '/opt/pz-server/...'`)
  - `src/lib/sandboxUtils.ts` (`SANDBOX_LUA_PATH = '/opt/pz-server/...'`)
  - `src/lib/playerUtils.ts` (`PZ_DB_PATH = '/opt/pz-server/...'`)
- **Problema:** El código asumía rutas y nombres de servidor fijos del host. En cualquier otro entorno o máquina, el panel fallaría instantáneamente.
- **Impacto:** Cero portabilidad e imposibilidad de desplegar en contenedores o servidores de otros administradores.
- **Solución Recomendada:**
  - Definir variables de entorno en `.env.example` y `.env.local`:
    ```env
    PZ_SERVER_DIR=/opt/pz-server
    PZ_SERVER_NAME=servertest
    PZ_DOCKER_CONTAINER=pz-server
    ```
  - Crear un módulo de configuración centralizado (`src/lib/config.ts`) que resuelva todas las rutas dinámicamente con valores por defecto seguros:
    ```typescript
    export const CONFIG = {
      serverDir: process.env.PZ_SERVER_DIR || '/opt/pz-server',
      serverName: process.env.PZ_SERVER_NAME || 'servertest',
      containerName: process.env.PZ_DOCKER_CONTAINER || 'pz-server',
      get iniPath() { return `${this.serverDir}/data/Server/${this.serverName}.ini`; },
      get sandboxPath() { return `${this.serverDir}/data/Server/${this.serverName}_SandboxVars.lua`; },
      get dbPath() { return `${this.serverDir}/data/db/${this.serverName}.db`; },
    };
    ```

---

### 2. Invocación de `sh -c` y Riesgo de Inyección en Anuncios In-Game
- **Ubicación:** `src/lib/playerUtils.ts` (`sendServerBroadcast`) y `getLiveConnectedPlayers`.
- **Problema:** `sendServerBroadcast` usa `execFileAsync('docker', ['exec', 'pz-server', 'sh', '-c', 'echo ...'])`. Aunque se filtran comillas y signos `$`, un salto de línea (`\n`) o caracteres especiales pueden corromper el comando o el archivo de consola. Además, `getLiveConnectedPlayers` invoca `sh -c 'docker logs ... 2>&1'` de forma innecesaria.
- **Impacto:** Posible ejecución fallida o desbordamiento de comandos en el contenedor.
- **Solución Recomendada:**
  - Eliminar `sh -c` para comandos estándar de docker y pasar argumentos directamente en un arreglo.
  - Para `sendServerBroadcast`, escribir directamente mediante `stdin` o pasar el mensaje con codificación segura (Base64) hacia el contenedor.

---

### 3. Condiciones de Carrera en Escritura de Archivos (Read-Modify-Write)
- **Ubicación:** `src/lib/serverUtils.ts:saveIniFile` y `src/lib/sandboxUtils.ts:saveSandboxVars`.
- **Problema:** Ambas funciones leen el archivo en memoria, aplican cambios y lo escriben. Si dos administradores o dos peticiones concurrentes guardan al mismo tiempo, una de las escrituras sobrescribirá silenciosamente a la otra (*lost update*).
- **Impacto:** Pérdida accidental de configuraciones de mods o sandbox.
- **Solución Recomendada:**
  - Implementar un Mutex / Async Lock ligero en memoria para serializar las operaciones de guardado de archivos de configuración.

---

## 🟠 P1 - Important / Performance & Architecture

### 4. Sobrecarga de Spawning de Procesos Docker por Polling
- **Ubicación:** `src/app/api/stats/route.ts` y `src/app/api/players/live/route.ts`.
- **Problema:** Con clientes abiertos en el navegador, `/api/stats` se consulta cada 3 segundos y `/api/players/live` cada 6 segundos. Cada petición ejecuta 4 subprocesos del sistema (`docker stats`, `docker inspect`, `docker exec cat /proc/net/udp`, `docker logs --since 60m`).
- **Impacto:** Desperdicio de CPU y lentitud si múltiples pestañas o usuarios acceden al panel simultáneamente.
- **Solución Recomendada:**
  - Implementar una capa de caché en memoria en Node.js (TTL de 2-3 segundos) para `getServerStats()`, `getServerStatus()` y `getLiveConnectedPlayers()`. De esta forma, múltiples peticiones concurrentes consumen la misma lectura instantánea sin invocar nuevos procesos CLI.

---

### 5. Parser y Serializador Lua basado en Expresiones Regulares
- **Ubicación:** `src/lib/sandboxUtils.ts` (`readSandboxVars`).
- **Problema:** El parseo línea por línea mediante RegExp asume un formato rígido (`Key = Value,`). Si un mod o actualización de PZ incluye tablas anidadas más profundas (nivel 3+), arrays o strings multilínea, el parser omitirá o deformará los datos.
- **Impacto:** Posible descarte de variables no estándar añadidas por mods.
- **Solución Recomendada:**
  - Migrar a un parser AST robusto (como `luaparse` o un deserializador Lua seguro) o conservar bloques no reconocidos de forma raw.

---

### 6. Gestión del Ciclo de Vida de Conexiones SQLite
- **Ubicación:** `src/lib/playerUtils.ts`.
- **Problema:** `DatabaseSync` abre y cierra el archivo de base de datos en cada invocación de función (`getPlayersOverview`, `addToWhitelist`, `banSteamId`, etc.).
- **Impacto:** Bloqueo síncrono innecesario de I/O en cada transacción.
- **Solución Recomendada:**
  - Mantener una instancia Singleton de base de datos en `globalThis` con `PRAGMA busy_timeout = 3000` y `PRAGMA journal_mode = WAL`, evitando el coste de apertura/cierre repetitivo.

---

## 🟡 P2 - Moderate / Tech Debt & Maintainability

### 7. Duplicación de Bloques de Transacción en DB
- **Ubicación:** `src/lib/playerUtils.ts` (métodos `addToWhitelist`, `removeFromWhitelist`, `banSteamId`, `unbanSteamId`, `banIp`, `unbanIp`).
- **Problema:** El patrón `const db = getDbInstance(); try { stmt.run(); return { success: true }; } catch (e) ...` está repetido 6 veces con la misma estructura.
- **Solución:** Crear un helper genérico de ejecución de sentencias preparadas:
  ```typescript
  function withDb<T>(operation: (db: DatabaseSync) => T): { success: boolean; data?: T; error?: string };
  ```

---

### 8. Constantes Mágicas y Textos Quemados en Código
- **Ubicación:**
  - `ROLE_MAP` quemado en `playerUtils.ts`.
  - `'Muldraugh, KY'` quemado como string literal en `serverUtils.ts`, `ModManagerClient.tsx`.
  - Límites de paginación (12 items) quemados en `ModCatalog.tsx` y `steamApi.ts`.
- **Solución:** Consolidar todos los valores de negocio en `src/constants/game.ts` (`CORE_MAP_NAME = 'Muldraugh, KY'`, `ROLES`, `CATALOG_PAGE_SIZE = 12`).

---

### 9. Tipado Unificado para Respuestas de Server Actions
- **Ubicación:** `src/app/actions.ts`.
- **Problema:** Cada Server Action devuelve `{ message: string; error: boolean }` de forma anónima.
- **Solución:** Definir una interfaz estándar genérica:
  ```typescript
  export interface ActionResult<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
  }
  ```

---

## 🟢 P3 - Nitpick & DX

### 10. Límite de Buffer y Resiliencia en SSE (`/api/logs`)
- **Ubicación:** `src/app/api/logs/route.ts`.
- **Problema:** Si el stream de Docker emite una ráfaga masiva sin saltos de línea, el buffer acumulativo puede crecer indefinidamente.
- **Solución:** Establecer un límite máximo de buffer (ej. 64KB) antes de forzar el flush o descarte.

---

### 11. Accesibilidad (A11y) en Botones de Iconos
- **Ubicación:** `src/components/ModManagerClient.tsx`, `src/components/PlayerManagerClient.tsx`.
- **Problema:** Varios botones interactivos usan `title` pero carecen de `aria-label` explícito para lectores de pantalla.
- **Solución:** Añadir `aria-label` descriptivos a todos los botones que solo contienen iconos Lucide.

---

## 🗓️ Plan de Refactorización Sugerido (Roadmap)

1. **Fase 1 (Inmediata / P0):** Extraer configuración a variables de entorno (`config.ts`), securizar `sendServerBroadcast` y añadir Mutex para guardado de archivos.
2. **Fase 2 (Rendimiento / P1):** Implementar caché en memoria con TTL (3s) para reducir invocaciones de subprocesos Docker y persistir la conexión SQLite.
3. **Fase 3 (Limpieza y Tipado / P2 & P3):** Unificar helpers de DB, extraer constantes de juego (`game.ts`), unificar `ActionResult<T>` y añadir atributos `aria-label`.
