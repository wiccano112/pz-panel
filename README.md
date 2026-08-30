# Project Zomboid - NextAdmin Panel (PZ-Panel)

Panel de administración web moderno, ultra-ligero y reactivo para servidores dedicados de **Project Zomboid** (Build 42) corriendo sobre Docker (Linux).

Desarrollado con **Next.js 16 (App Router)**, **React 19**, **TypeScript** estricto, **Tailwind CSS v4** y **SWR**.

---

## 🚀 Funcionalidades Principales

### 1. 📊 Dashboard Principal (`/`)
- **Control de Energía:** Botones directos para **Iniciar**, **Detener** y **Reiniciar** el contenedor Docker (`pz-server`).
- **Métricas en Tiempo Real:** Monitorización continua (cada 3s) de uso de CPU, RAM, tráfico de Red (Net I/O), tiempo activo (Uptime) y supervivientes conectados.
- **Consola de Logs en Vivo (`tail -f`):**
  - Streaming en tiempo real mediante Server-Sent Events (SSE).
  - Chips interactivos para filtrar por nivel de severidad: **All**, **Info**, **Warning**, **Error** y **Debug** (con contadores de líneas en vivo).
  - Buscador de texto en consola, auto-scroll inteligente, pausa/reanudación y copia rápida al portapapeles.

### 2. 📦 Gestor de Mods & Steam Workshop (`/mods`)
- **Catálogo Dinámico de Steam Workshop (Build 42):**
  - Búsqueda en tiempo real con debounce y filtrado por tiempo (7 días, 30 días, 90 días, 1 año, Todo el tiempo).
  - Paginación integrada (12 mods por página).
  - Estrategia híbrida de resolución de `Mod ID`: detección automática para mods populares conocidos y modal de asistencia con enlace directo a Steam para mods de la comunidad.
- **Configuración INI del Servidor:**
  - Gestión visual de `WorkshopItems`, `Mods` y `Maps` sincronizada directamente con `servertest.ini`.
  - Protección de mapa core: `Muldraugh, KY` se mantiene siempre protegido al final del orden de mapas.
  - Aviso emergente de reinicio requerido tras guardar cambios.

### 3. 🛠️ Configuración de Sandbox del Mundo (`/sandbox`)
- **Editor Visual de `servertest_SandboxVars.lua`:**
  - Organizado en pestañas temáticas:
    - 🧟 **Zombis & Población:** Densidad, distribución, respawn, velocidad, fuerza, resistencia y transmisión de infección.
    - 📦 **Botín & Recursos:** Rareza de armas cuerpo a cuerpo, armas de fuego, munición, comida fresca/enlatada, medicina y libros.
    - 🌍 **Mundo & Clima:** Duración del día, corte de agua y electricidad, eventos de helicóptero, temperatura y lluvia.
    - 🚗 **Vehículos & Combustible:** Aparición de autos, nivel de gasolina, consumo y llaves.
    - 👤 **Superviviente & Multiplicadores:** Multiplicador de XP, kit de inicio, nutrición y descomposición de cadáveres.
  - Buscador global de variables de sandbox.
  - Guardado atómico en disco (escritura en `.tmp` y reemplazo seguro) para prevenir corrupción de archivos.

### 4. 👥 Jugadores & Moderación (`/players`)
- **Supervivientes Conectados en Vivo:** Detección automática de jugadores activos en la sesión actual.
- **Gestión de Lista Blanca (Whitelist):**
  - Añadir y remover usuarios con asignación de roles (`Admin`, `Moderator`, `Overseer`, `GM`, `User`) y Steam ID (17 dígitos).
  - Integración nativa directa con la base de datos SQLite del servidor (`servertest.db`).
- **Control de Baneos:**
  - Baneo y desbaneo de cuentas por Steam ID o por dirección IP con motivo de infracción.
- **Mensajes Globales al Servidor (Broadcast):**
  - Envío de anuncios directos al chat global del juego para alertar a los jugadores de reinicios o eventos.

---

## ⚙️ Configuración y Variables de Entorno

Para habilitar la exploración en vivo de Steam Workshop, crea tu archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.example .env.local
```

Edita `.env.local` e introduce tu clave de Steam Web API:
```env
STEAM_API_KEY=tu_clave_de_steam_api_aqui
```
*(Puedes obtener tu clave gratuita en [https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey))*.

---

## 🛠️ Comandos de Desarrollo y Producción

Este proyecto utiliza **pnpm** como gestor de paquetes:

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor en modo desarrollo
pnpm dev

# Compilar para producción
pnpm build

# Iniciar servidor en modo producción
pnpm start

# Validación de código y calidad (ESLint)
pnpm run lint

# Verificación estricta de tipos (TypeScript)
pnpm tsc --noEmit
```

---

## 🤖 Información de Arquitectura para Agentes IA
- Las reglas de desarrollo y flujos de trabajo autónomos se encuentran en [`AGENTS.md`](AGENTS.md) y en [`.agents/rules/`](.agents/rules/).
- La especificación de componentes y rutas se encuentra documentada en formato denso en [`docs/ai_architecture.xml`](docs/ai_architecture.xml).
