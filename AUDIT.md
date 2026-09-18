# AUDITORÍA TÉCNICA: ESTRATEGIA DE CONFIGURACIÓN Y CICLO DE VIDA EN PZ-PANEL

**Fecha:** 18 de Septiembre de 2026  
**Objetivo:** Evaluar la arquitectura de guardado de opciones de Servidor (`.ini`), opciones de Sandbox (`SandboxVars.lua`) y la lógica de ciclo de vida del contenedor (`start`, `stop`, `restart`) en `pz-panel`.

---

## 1. RESUMEN EJECUTIVO & HALLAZGOS CRÍTICOS

| ID | Área | Gravedad | Hallazgo Principal |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Persistencia / Guardado | 🔴 **CRÍTICO** | **Sobreescritura silenciosa por mutación en caliente**: Escribir en `.ini` o `_SandboxVars.lua` con el servidor encendido provoca que, al reiniciar/apagar, la rutina Java de PZ vuelque la memoria RAM a disco y borre los cambios recién guardados. |
| **SEC-02** | Ciclo de Vida | 🔴 **CRÍTICO** | **`docker restart` peligroso & Timeout insuficiente**: Se usa `docker restart` (timeout 10s) sin forzar `save` previo por RCON, arriesgando `SIGKILL` y corrupción de chunks SQLite (`players.db`, `vehicles.db`). |
| **SEC-03** | Delimitadores INI | 🟠 **ALTO** | **Delimitadores de mods sin escapar**: `saveIniFile` une arrays con `;` simple en lugar de `\;`, violando el formato requerido por el backend Java de PZ. |
| **SEC-04** | Sandbox Engine | 🟠 **ALTO** | **Desincronización con saves existentes (`map_sand.bin`)**: El panel asume que modificar `_SandboxVars.lua` actualiza un mundo ya iniciado, ignorando el archivo de estado de partida del motor. |
| **SEC-05** | UX / Operaciones | 🟡 **MEDIO** | **Reinicio y apagado ciego sin validar jugadores**: Se permite reiniciar/apagar el servidor inmediatamente sin advertir si hay jugadores en línea ni enviar avisos por el juego. |
| **SEC-06** | Validación de Datos | 🟡 **MEDIO** | **Ausencia de esquema Zod en Sandbox**: El payload de `handleSaveSandboxAction` no pasa por validación de tipos ni de límites (min/max), arriesgando Lua inválido. |

---

## 2. ANÁLISIS DETALLADO DE VULNERABILIDADES ARQUITECTÓNICAS

### 2.1 Mutación en Caliente vs. "World Flush on Shutdown" (SEC-01)
* **Componentes afectados**:
  * [`src/lib/serverUtils.ts`](file:///home/perro/pz-panel/src/lib/serverUtils.ts) (`saveServerProperties`, `saveIniFile`)
  * [`src/lib/sandboxUtils.ts`](file:///home/perro/pz-panel/src/lib/sandboxUtils.ts) (`saveSandboxVars`)
  * [`src/components/SandboxManagerClient.tsx`](file:///home/perro/pz-panel/src/components/SandboxManagerClient.tsx)
  * [`src/components/ServerSettingsClient.tsx`](file:///home/perro/pz-panel/src/components/ServerSettingsClient.tsx)
* **Mecanismo de falla**:
  1. El usuario modifica valores en el panel web con el servidor en ejecución (`ONLINE`).
  2. Al presionar "Guardar", el backend escribe en disco (`data/Server/<SERVER_NAME>.ini` o `_SandboxVars.lua`).
  3. El panel muestra el modal: *"Server Restart Required: You must restart the server for changes to apply"*.
  4. El usuario pulsa "Restart Server" en el panel.
  5. `executeServerAction('restart')` emite un `docker restart`.
  6. **La trampa de Project Zomboid**: Al recibir la señal de terminación (`SIGTERM`), el proceso Java del servidor ejecuta su gancho de apagado (`ServerOptions.saveServerOptions()` y `SandboxOptions.saveServerLuaFile()`), volcando **lo que tiene en memoria RAM** a los archivos en disco.
  7. **Resultado**: Los cambios que el panel escribió en disco son sobreescritos por el estado viejo que tenía el juego en memoria. El cambio se pierde silenciosamente.

---

### 2.2 Inconsistencias en el Ciclo de Vida: Start, Stop y Restart (SEC-02)
* **Componente afectado**: [`src/lib/serverUtils.ts`](file:///home/perro/pz-panel/src/lib/serverUtils.ts) (`executeServerAction`)
* **Código actual**:
  ```typescript
  if (action === 'restart') {
    if (exists) {
      await execFileAsync('docker', ['restart', CONFIG.containerName]);
    } else if (composeFile) ...
  ```
* **Riesgos identificados**:
  1. **Timeout predeterminado de 10 segundos**: `docker restart` envía `SIGTERM` y espera únicamente 10 segundos antes de enviar `SIGKILL` (`kill -9`). En servidores con mods, vehículos y chunks cargados, Project Zomboid puede requerir entre 15 y 35 segundos para persistir tablas SQLite y cerrar conexiones limpiamente. Un `SIGKILL` durante un volcado corrompe `players.db` o `vehicles.db`.
  2. **No orquesta con Docker Compose**: Si se modificaron variables de entorno en `.env` (como memoria RAM o puertos) o en `docker-compose.yml`, `docker restart` reutiliza la instancia congelada del contenedor sin recargar las nuevas directivas.
  3. **Ausencia de `save` previo por RCON**: El reinicio no solicita un guardado previo en memoria (`rcon-cli save`), dependiendo exclusivamente del trap de señales del contenedor.

---

### 2.3 Delimitadores de Listas INI sin Escapar (SEC-03)
* **Componente afectado**: [`src/lib/serverUtils.ts`](file:///home/perro/pz-panel/src/lib/serverUtils.ts) (`saveIniFile`, líneas 298-300)
* **Código actual**:
  ```typescript
  const updated = updatePzIni(content, {
    WorkshopItems: workshopItems.filter(Boolean).join(';'),
    Mods: mods.filter(Boolean).join(';'),
    Map: mapVal,
  });
  ```
* **Mecanismo de falla**:
  * En la especificación oficial de Project Zomboid Dedicated Server (ver `AGENTS.md` Invariante 2), las listas separadas por punto y coma en el `.ini` **DEBEN usar barra invertida de escape**: `item1\;item2\;item3`.
  * El uso de `;` sin barra invertida provoca que el analizador Java de PZ trunque la lista o descarte los mods posteriores al primer elemento.

---

### 2.4 Desincronización del Sandbox con Partidas Existentes (SEC-04)
* **Mecanismo de falla**:
  * Project Zomboid carga `_SandboxVars.lua` únicamente al inicializar un mundo nuevo.
  * Para mundos ya existentes (`data/Saves/Multiplayer/<SERVER_NAME>/`), el motor almacena y lee las variables de sandbox desde los metadatos de la partida (archivo `map_sand.bin` o tablas internas).
  * Editar `_SandboxVars.lua` en una partida en curso **no altera las reglas de los chunks ya generados ni del mundo activo**.
  * El panel no advierte al usuario de esta limitación del motor, llevando a reportes de "el panel no guarda los cambios de loot o zombies".

---

### 2.5 Ejecución de Acciones sin Validación de Jugadores Activos (SEC-05)
* **Componentes afectados**:
  * [`src/components/ServerStatusCard.tsx`](file:///home/perro/pz-panel/src/components/ServerStatusCard.tsx)
  * [`src/components/ServerSettingsClient.tsx`](file:///home/perro/pz-panel/src/components/ServerSettingsClient.tsx)
* **Mecanismo de falla**:
  * `getLiveConnectedPlayers()` existe en el backend y monitorea a los jugadores en tiempo real.
  * Sin embargo, los botones "Stop" y "Restart" envían la acción inmediatamente al backend sin confirmar:
    1. Si hay usuarios jugando en ese instante.
    2. Quiénes son los jugadores en línea.
    3. Si se desea enviar un mensaje de cuenta regresiva previo al reinicio.

---

### 2.6 Falta de Validación de Esquema en Sandbox (SEC-06)
* **Componentes afectados**:
  * [`src/app/actions.ts`](file:///home/perro/pz-panel/src/app/actions.ts) (`handleSaveSandboxAction`)
  * [`src/lib/sandboxUtils.ts`](file:///home/perro/pz-panel/src/lib/sandboxUtils.ts) (`saveSandboxVars`)
* **Mecanismo de falla**:
  * Mientras que `handleSaveServerPropertiesAction` valida con `z.record(z.union([...]))`, `handleSaveSandboxAction` solo hace `JSON.parse`.
  * Si un cliente web envía un valor `NaN`, `undefined` o una estructura anómala, el serializador genera código Lua con errores de sintaxis, impidiendo que el servidor levante en el próximo inicio.

---

## 3. PLAN DE REMEDIACIÓN RECOMENDADO

### Fase 1: Corrección Inmediata del Formato INI (Quick Win)
En [`src/lib/serverUtils.ts`](file:///home/perro/pz-panel/src/lib/serverUtils.ts):
```typescript
// Cambiar .join(';') por .join('\\;')
WorkshopItems: workshopItems.filter(Boolean).join('\\;'),
Mods: mods.filter(Boolean).join('\\;'),
Map: [...nonCoreMaps, CORE_MAP_NAME].join('\\;'),
```

### Fase 2: Pipeline Seguro de "Guardado & Reinicio Orquestado" (Graceful Save & Restart)
Modificar el flujo de guardado de configuraciones:
1. **Detección de Estado**:
   * Si el servidor está `OFFLINE`: Guardar directamente en disco (es seguro, no hay proceso Java en RAM).
   * Si el servidor está `ONLINE`:
     * **Opción Recomendada**: El botón de guardar debe ofrecer dos caminos:
       - **"Guardar y Reiniciar Ahora"**:
         1. Validar jugadores (`getConnectedPlayers()`). Si hay jugadores, solicitar confirmación explícita.
         2. Emitir broadcast por RCON: `servermsg "Reinicio en progreso para aplicar configuraciones..."`.
         3. Emitir comando `save` por RCON.
         4. Detener el servidor limpiamente (`docker compose down` o `docker stop -t 60`).
         5. **Escribir los archivos en disco AHORA que el servidor está apagado**.
         6. Levantar el servidor (`docker compose up -d`).
       - **"Programar para el próximo reinicio (Staging)"**: Guardar en un archivo temporal `.pending.json` y aplicar la escritura durante el script de reinicio diario programado.

### Fase 3: Robustecer `executeServerAction`
1. Reemplazar `docker restart` y `docker stop` genéricos por ejecución de compose con timeout:
   ```typescript
   // Detención segura con tiempo para flush de base de datos
   await execFileAsync('docker', ['stop', '-t', '60', CONFIG.containerName]);
   ```
2. Integrar llamada a RCON `save` antes de cualquier apagado voluntario.
3. Para `restart`, preferir la secuencia idempotente:
   ```typescript
   await execFileAsync('docker', ['compose', '--project-directory', CONFIG.hostServerDir, 'down']);
   await execFileAsync('docker', ['compose', '--project-directory', CONFIG.hostServerDir, 'up', '-d']);
   ```

### Fase 4: Validación Zod en Sandbox
Definir un esquema Zod estricto para `handleSaveSandboxAction` que valide tipos primitivos, tablas anidadas y sanitice cadenas para prevenir inyecciones en el archivo Lua.
