# Fundamentos Técnicos del Proyecto (PZ-Panel)
- **Framework:** Next.js 16 (App Router) + React 19
- **Lenguaje:** TypeScript (Tipado estricto)
- **Gestor de Paquetes:** pnpm
- **Entorno:** Node.js 26 (`node:current-alpine`)
- **Estilos:** Tailwind CSS (PostCSS)
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
    3. `docker compose up -d --build` (Construcción y despliegue del contenedor Docker para asegurar que la imagen de producción compile y levante correctamente).
  - *(Nota: Las pruebas unitarias y la cobertura de código están explícitamente deshabilitadas para esta fase del proyecto).*

- **Code Reviewer (Modelo: `Gemini 3.7 Pro - Auditoría Cruzada`):** Supervisa de forma imparcial el código generado en toda sesión (vibe o plan), los resultados de los comandos de calidad y el estado del contenedor.
  - *Formato de Feedback:* Emplea **Niveles de Criticidad**:
    - `[P0 - BLOCKER]` Errores de linting/typecheck, fallos en la compilación Docker, fallos de seguridad o código que no compila.
    - `[P1 - IMPORTANTE]` Deuda técnica, malas prácticas de React/Next.js, optimizaciones.
    - `[P2 - NITPICK]` Detalles menores, estilo, formato.
  - *Loop:* El Builder y el Code Reviewer iterarán un máximo de 3 veces antes de entregar la versión final al usuario.

### 3. Autonomía y Ejecución Desatendida (Zero-Block Policy)
- El trabajo de los agentes está diseñado para ser **lo más desatendido posible**.
- Cuando se asigne una feature o tarea compleja, el equipo de agentes debe enfocarse en **procesamientos largos y exhaustivos** hasta lograr que la feature funcione completamente.
- Los agentes principales tienen libertad total para invocar **todos los subagentes paralelos que sean necesarios** para acelerar el desarrollo o realizar investigaciones sin pedir permiso.

### 4. Control de Versiones (Obligatorio)
- Es imperativo realizar un commit (`git add . && git commit -m "..."`) al finalizar cada característica o avance estable. El trabajo no se considera terminado hasta que los cambios estén asegurados en el historial de Git local.

### 5. Auditoría de Seguridad y Parametrización Obligatoria (Pre-Push)
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

### 8. Versionamiento Semántico (SemVer) y Releases
- **Archivos de Versionamiento:** La versión de la aplicación se gestiona de forma sincronizada entre `package.json` y `src/version.json`.
- **Scripts de Versionamiento (pnpm):**
  - `pnpm run version:patch` (para corrección de errores / bug fixes, ej. `1.0.0` -> `1.0.1`).
  - `pnpm run version:minor` (para nuevas funcionalidades compatibles, ej. `1.0.1` -> `1.1.0`).
  - `pnpm run version:major` (para cambios mayores o incompatibles, ej. `1.1.0` -> `2.0.0`).
- **Marca de Agua en UI:** La barra lateral (`src/components/Sidebar.tsx`) consume directamente `src/version.json` para mostrar en tiempo real la versión activa, canal, fecha de release y enlace dinámico a los releases de GitHub (`${repoUrl}/releases/tag/v${version}`).
- **Flujo Obligatorio de Release:**
  1. Ejecutar el comando de bump adecuado (`pnpm run version:patch`, etc.).
  2. Compilar y verificar (`pnpm run lint`, `pnpm tsc --noEmit`, `docker compose up -d --build`).
  3. Confirmar cambios en git (`git add . && git commit -m "chore(release): bump version to vX.Y.Z"`).
  4. Crear tag git anotado (`git tag -a vX.Y.Z -m "Release vX.Y.Z"`).
  5. Publicar ramas y tags (`git push origin main && git push origin vX.Y.Z`).
  6. Crear release en GitHub mediante GitHub CLI (`gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes`).



