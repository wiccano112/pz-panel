# Fundamentos Técnicos del Proyecto (PZ-Panel)
- **Framework:** Next.js 16 (App Router) + React 19
- **Lenguaje:** TypeScript (Tipado estricto)
- **Gestor de Paquetes:** pnpm
- **Entorno:** Node.js 26 (`node:current-alpine`)
- **Estilos:** Tailwind CSS (PostCSS)
- **Testing:** Vitest (Ejecución concurrente optimizada para 4 cores)
- **Despliegue & Contenedor:** Docker & Docker Compose (Multi-stage Standalone)

# Estructura del Equipo de Agentes y Feedback Loop
Al abordar nuevas características o refactorizaciones, el equipo de agentes debe seguir este flujo de delegación estricto:

### 1. Fase de Planeación (Max 3 Iteraciones)
- **Planner (Modelo: `Claude Opus - Thinking`):** Encargado de analizar el requerimiento y diseñar la arquitectura, estructura de componentes y flujo de datos.
- **Plan Reviewer (Modelo: `Gemini 3.7 Pro - Crítico`):** Realiza auditoría cruzada multi-vendor sobre el plan buscando agujeros de seguridad, ineficiencias o desvíos técnicos para eliminar sesgos de proveedor.
  - *Loop:* El Planner y el Plan Reviewer iterarán sus propuestas un máximo de 3 veces hasta llegar a un acuerdo.

### 2. Fase de Construcción y Revisión (Mandatorio: Vibe Coding o Plan Estructurado)
- **Supervisión Continua del Code Reviewer (Regla Universal):** Sin importar si el cambio es un fix pequeño mediante *vibe coding* o una característica compleja basada en plan, **el Code Reviewer (Gemini 3.7 Pro) DEBE auditar y controlar obligatoriamente todas las modificaciones antes de que se consideren listas**.
- **Builder (Modelo: `Claude Sonnet - Thinking`):** Escribe y modifica el código. Ideal para iterar rápidamente (vibe coding) con el usuario o implementar planes estructurados.
  - *Quality Check:* Antes de entregar el código al Reviewer, el Builder debe ejecutar empíricamente los siguientes comandos en la terminal para asegurar la calidad básica y la integridad del contenedor:
    1. `pnpm run lint` (Validación de ESLint)
    2. `pnpm tsc --noEmit` (Verificación estricta de tipos en TypeScript)
    3. `pnpm test` (Ejecución de la suite completa de pruebas unitarias e integración en Vitest)
    4. `pnpm run validate` (Pipeline integral que corre lint, typecheck y tests en un solo paso)
    5. `docker compose up -d --build` (Construcción y despliegue del contenedor Docker para asegurar que la imagen de producción compile y levante correctamente).
  - *(Nota: Las suites de pruebas en `tests/` cubren parsers Lua/INI, Server Actions con Zod, concurrencia de locks Mutex, utilidades de hardware, caché y Steam API).*

- **Code Reviewer (Modelo: `Gemini 3.7 Pro - Auditoría Cruzada`):** Supervisa de forma imparcial el código generado en toda sesión (vibe o plan), los resultados de los comandos de calidad y el estado del contenedor.
  - *Formato de Feedback:* Emplea **Niveles de Criticidad**:
    - `[P0 - BLOCKER]` Errores de linting/typecheck, fallos en la suite de tests (`pnpm test`), fallos en la compilación Docker, fallos de seguridad o código que no compila.
    - `[P1 - IMPORTANTE]` Deuda técnica, malas prácticas de React/Next.js, optimizaciones.
    - `[P2 - NITPICK]` Detalles menores, estilo, formato.
  - *Loop:* El Builder y el Code Reviewer iterarán un máximo de 3 veces antes de entregar la versión final al usuario.

### 3. Autonomía y Ejecución Desatendida (Zero-Block Policy)
- El trabajo de los agentes está diseñado para ser **lo más desatendido posible**.
- Cuando se asigne una feature o tarea compleja, el equipo de agentes debe enfocarse en **procesamientos largos y exhaustivos** hasta lograr que la feature funcione completamente.
- Los agentes principales tienen libertad total para invocar **todos los subagentes paralelos que sean necesarios** para acelerar el desarrollo o realizar investigaciones sin pedir permiso.

### 4. Control de Versiones (Obligatorio)
- Es imperativo realizar un commit (`git add . && git commit -m "..."`) al finalizar cada característica o avance estable. El trabajo no se considera terminado hasta que los cambios estén asegurados en el historial de Git local.

### 5. Auditoría de Seguridad, Validaciones y Git Hook (Pre-Push)
- **Git Hook Pre-Push (`.git/hooks/pre-push`):** Se encuentra activo y configurado para ejecutar automáticamente el pipeline de validación (`pnpm run validate`) antes de permitir cualquier subida remota.
- **Pipeline Integral `pnpm run validate`:** Ejecuta en paralelo y secuencia:
  1. `pnpm run lint` (ESLint con 0 errores y 0 warnings)
  2. `pnpm tsc --noEmit` (Verificación estricta de TypeScript)
  3. `pnpm test` (Suite rápida de pruebas unitarias/integración con Vitest en 4 cores)
- **Zero-Secrets & Zero-Hardcoded-Paths:** Antes de realizar cualquier push a un repositorio remoto, el equipo de agentes debe auditar exhaustivamente que:
  1. No existan secretos, contraseñas, tokens o API keys (como `STEAM_API_KEY`) quemados en el código fuente.
  2. Todas las rutas del sistema de archivos (`PZ_SERVER_DIR`), nombres de servidor (`PZ_SERVER_NAME`), nombres de contenedor (`PZ_DOCKER_CONTAINER`) y puertos estén 100% parametrizados a través de variables de entorno (`.env.example`, `.env.local` y `src/lib/config.ts`) con valores de fallback neutros y genéricos (ej. `/opt/pz-server`, `servertest`, `pz-server`).
  3. Los archivos de entorno local (`.env.local`, `.env*.local`) estén estrictamente protegidos en `.gitignore`.
  4. Ningún dato sensible o personal de la máquina host (como rutas `/home/<user>/...` o identificadores locales específicos) se filtre en el código, plantillas de ejemplo o mensajes de error.

### 6. Despliegue y Ciclo de Vida en Docker
- En cada ciclo de vida, feature o actualización, es obligatorio compilar y levantar los contenedores con:
  ```bash
  docker compose up -d --build
  ```
  Esto garantiza que los cambios de código se trasladen directamente a la imagen de producción en ejecución.

### 7. Estructura de Datos del Servidor (`data/`) y Consulta de Estado
El servidor de Project Zomboid desplegado se encuentra en la ruta parametrizada por `PZ_SERVER_DIR` (por defecto `../pz-server` en el host, montado en `/pz-server` dentro del contenedor). Cualquier agente que necesite inspeccionar, auditar o diagnosticar el estado del servidor debe consultar la subcarpeta `data/`:

- **`data/Server/<SERVER_NAME>.ini`:** Configuración principal del servidor (mods activos, orden de carga, workshop items, mapas, puertos, PVP, contraseñas).
- **`data/Server/<SERVER_NAME>_SandboxVars.lua`:** Configuración detallada de sandbox (multiplicadores de XP, población zombi, cortes de nivel de desarmado `LevelForDismantleXPCutoff`, clima, botín).
- **`data/Server/<SERVER_NAME>_spawnregions.lua`:** Regiones de reaparición y puntos de inicio.
- **`data/db/<SERVER_NAME>.db`:** Base de datos SQLite del servidor (tabla de whitelist, roles/permisos de usuarios, baneos por SteamID/IP).
- **`data/server-console.txt` & `data/Logs/`:** Salida en tiempo real de la consola del juego, logs de conexión de jugadores, comandos de administración y registro de errores de Lua/Java.
- **`data/Saves/`:** Partidas guardadas, estado del mapa, vehículos y chunks del mundo.
- **`data/backups/`:** Copias de seguridad automáticas y snapshots del servidor.
- **`data/options.ini`:** Parámetros de renderizado, audio y rendimiento del motor dedicado.

### 8. Versionamiento Semántico (SemVer) y Flujo de Releases
- **Archivos de Versionamiento Sincronizados:**
  - `package.json`: Mantiene el campo `"version": "X.Y.Z"`.
  - `src/version.json`: Mantiene `version`, `releaseDate` (YYYY-MM-DD), `buildNumber` (`YYYYMMDD.X`), `channel` ("stable") y `repoUrl`.
- **Scripts de Versionamiento (pnpm):**
  - **Patch:** `pnpm run version:patch` (para corrección de errores, fixes de UI y ajustes menores, ej. `1.0.2` ➔ `1.0.3`).
  - **Minor:** `pnpm run version:minor` (para nuevas tarjetas, features y funcionalidades retrocompatibles, ej. `1.0.3` ➔ `1.1.0`).
  - **Major:** `pnpm run version:major` (para cambios arquitectónicos mayores o breaking changes, ej. `1.1.0` ➔ `2.0.0`).
  - **Versión Explícita:** `node scripts/bump-version.mjs 1.2.5` (para forzar una versión específica).
- **Marca de Agua en UI:** La barra lateral (`src/components/Sidebar.tsx`) consume directamente `src/version.json` para mostrar en tiempo real la versión activa, canal, fecha de release y enlace dinámico a los releases de GitHub (`${repoUrl}/releases/tag/v${version}`).

#### Guía Paso a Paso para Hacer Bump y Publicar un Release (Pipeline Atómico Inquebrantable):
1. **Ejecutar el Bump de Versión:**
   ```bash
   pnpm run version:patch   # o version:minor / version:major
   ```
2. **Control de Calidad y Validación Completa:**
   ```bash
   pnpm run validate        # Ejecuta lint, typecheck y tests (Vitest)
   ```
3. **Auditoría Pre-Push de Seguridad:**
   - Verificar que no haya secretos ni rutas locales (`/home/...`) antes de commitear.
4. **Confirmar Cambios en Git:**
   ```bash
   git add .
   git commit -m "chore(release): bump version to vX.Y.Z"
   ```
5. **Crear Tag Git Anotado:**
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
6. **Publicar Cambios y Tags al Repositorio Remoto:**
   ```bash
   git push origin main && git push origin vX.Y.Z
   ```
7. **Generar Release en GitHub:**
   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes
   ```
8. **DESPLIEGUE EN PRODUCCIÓN MANDATORIO (Puerto 3000):**
   - **Ningún release se considera listo ni anunciado hasta ejecutar:**
     ```bash
     docker compose up -d --build
     ```
   - Verificar salud inmediata en producción: `curl -I http://localhost:3000` (debe responder `HTTP 200 OK`).

### 9. Estándar de Lenguaje de la Interfaz (Inglés Obligatorio)
- **Regla Estricta de Idioma en UI:** Todo el contenido visible para el usuario en la interfaz web de PZ-Panel (textos, títulos, botones, modales, alertas, banners, tooltips, placeholders, mensajes de validación/error, chips de estado, aria-labels y logs de frontend) **DEBE estar estrictamente en INGLÉS**, independientemente del idioma en que el usuario plantee sus solicitudes.
- **Consistencia:** No mezclar términos en español en componentes (`src/components/`, `src/app/`, `src/context/`) ni en las pruebas E2E (`e2e/`).
- **Comentarios y Nombres de Código:** Se prefiere el estándar en inglés para identificadores, tipos y comentarios técnicos en el código fuente.

### 10. Gestión Limpia de Tareas y Commits Atómicos
- **Cierre Atómico de Tareas:** Tan pronto como una característica, corrección o refactorización sea implementada y validada en su respectivo commit, el estado de trabajo debe ser actualizado inmediatamente.
- **Cero Commits Rotos:** Cada commit en la rama de trabajo o en `main` debe ser atómico, autofuncional y dejar la suite de pruebas en verde.

### 11. Reglas de Ergonomía Responsive y Viewports Estrictos
- **Regla Universal de Flexbox Vertical (`min-h-0`):** En contenedores con `flex flex-col` donde un hijo sea scrollable (`flex-1 overflow-y-auto`), es OBLIGATORIO incluir `min-h-0` para prevenir que el contenedor sobrepase el viewport en resoluciones de altura reducida (ej. pantallas de laptop con 600px-720px de alto).
- **Uso de Viewport Dinámico (`dvh`):** Utilizar `h-screen max-h-screen md:h-dvh md:max-h-dvh` en barras laterales, drawers móviles y modales de pantalla completa para evitar solapamientos con barras de navegación móviles.
- **Cobertura E2E de Altura Reducida:** La suite de Playwright debe incluir validaciones con viewports compactos (ej. 1024x600) para asegurar que los elementos inferiores (tarjetas de versión, botones de acción) nunca queden inaccesibles o recortados.

### 12. Separación Estricta de Puertos (Producción vs Testing E2E)
- **Puerto 3000 (PRODUCCIÓN INVARIABLE):** El contenedor Docker `pz-panel` corre **única y exclusivamente en el puerto 3000** (`http://localhost:3000`). Este es el punto de acceso para el usuario final y administradores.
- **Puerto 3001 (SOLO TEST RUNNER EFÍMERO):** El puerto 3001 se reserva exclusivamente para el `webServer` auto-gestionado de Playwright (`playwright.config.ts`), evitando interferir con el contenedor de producción en el 3000. Al terminar las pruebas E2E, Playwright apaga el servidor automáticamente.

### 13. Rebase y Sincronización Obligatoria antes de Integrar (Cero Conflictos)
- **Sincronización Previa a la Entrega:** Antes de dar por finalizada una rama de trabajo o feature, se DEBE sincronizar con la rama principal:
  ```bash
  git fetch origin && git merge origin/main
  ```
- **Validación Local Limpia:** Sobre la rama sincronizada, se debe ejecutar `pnpm run validate` (o `pnpm run validate:all`) con 0 errores de compilación, 0 conflictos y 100% de tests pasando antes de realizar merge o push.

### 14. Invariante de Aislamiento Absoluto del Servidor de Juego (`pz-server`)
- **Prohibición de Acciones Destructivas en Desarrollo:** Queda terminantemente prohibido emitir comandos directos de detención o reinicio sobre el contenedor `pz-server` (`docker stop pz-server`, `docker restart pz-server` o `docker rm pz-server`).
- **Uso Estricto de Mocks:** Toda prueba de ciclo de vida (RCON save, timeouts, staging de configuración) DEBE realizarse mediante mocks en Vitest o contra entornos aislados sin afectar a los jugadores conectados.

### 15. Comandos de Prueba y Validación Estandarizados
- **`pnpm test` (Unit & Integration):** Ejecuta la batería de Vitest (78 tests, ~400ms) para desarrollo ágil y TDD.
- **`pnpm run test:e2e` (Browser E2E):** Ejecuta la suite de Playwright con inicio y apagado automático del servidor efímero en `:3001`.
- **`pnpm run test:all` (Full Test Battery):** Ejecuta en un solo paso Vitest + Playwright E2E (85 tests).
- **`pnpm run validate:all` (Comprehensive CI Pipeline):** Ejecuta Lint + TypeScript strict + Vitest + Playwright E2E.

### 16. Principio de Especialización y Separación de Responsabilidades
- **Separación de Dominios:** Cualquier sistema o equipo que trabaje sobre este proyecto debe mantener una estricta separación de responsabilidades:
  - **DevOps & QA:** Configuración de suites de prueba, pipelines locales de validación, Git hooks y reportes de cobertura.
  - **Backend & Core Systems:** APIs Next.js / Server Actions, parsers de archivos INI/Lua, RCON, Staging de configuración y Docker.
  - **Frontend & UI:** Componentes React, Tailwind CSS, modales, formularios, accesibilidad y diseño responsive.
  - **Seguridad & Auditoría:** Esquemas Zod estrictos, sanitización contra inyecciones Lua/Shell, validación de variables de entorno y prevención de fugas de secretos.
  - **Orquestación & Revisión:** Coordinación del flujo de trabajo, revisión imparcial de código y verificación final de criterios de aceptación.



