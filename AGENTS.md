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
- **Planner (Modelo: `opus` - Thinking):** Encargado de analizar el requerimiento y diseñar la arquitectura, estructura de componentes y flujo de datos.
- **Plan Reviewer (Modelo: `pro` - Crítico):** Revisa el plan buscando agujeros de seguridad, ineficiencias o desvíos de los fundamentos técnicos.
  - *Loop:* El Planner y el Plan Reviewer iterarán sus propuestas un máximo de 3 veces hasta llegar a un acuerdo.

### 2. Fase de Construcción y Revisión (Max 3 Iteraciones)
- **Builder (Modelo: `sonnet`):** Escribe el código basándose en el plan aprobado. Ideal para iterar rápidamente (vibe coding) con el usuario.
  - *Quality Check:* Antes de entregar el código al Reviewer, el Builder debe ejecutar empíricamente los siguientes comandos en la terminal para asegurar la calidad básica y la integridad del contenedor:
    1. `pnpm run lint` (Validación de ESLint)
    2. `pnpm tsc --noEmit` (Verificación estricta de tipos en TypeScript)
    3. `docker compose up -d --build` (Construcción y despliegue del contenedor Docker para asegurar que la imagen de producción compile y levante correctamente).
  - *(Nota: Las pruebas unitarias y la cobertura de código están explícitamente deshabilitadas para esta fase del proyecto).*

- **Code Reviewer (Modelo: `pro`):** Supervisa el código generado y los resultados de los comandos de calidad y el estado del contenedor.
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


