# Project Zomboid - NextAdmin Panel

Panel de control web súper ligero para administrar un servidor dedicado de Project Zomboid corriendo en Docker (Nobara Linux). 
El backend interactúa directamente con `docker compose` y con el archivo `servertest.ini`, sin necesidad de bases de datos pesadas.

## 🚀 Features (Resumen)
1. **Control de Energía:** Botones directos para Iniciar, Detener y Reiniciar el servidor Zomboid.
2. **Monitor en Vivo:** Gráficas o indicadores de uso de CPU, RAM y Red extraídos directamente del Kernel vía `docker stats`.
3. **Gestor de Mods e INI:** 
   - Interfaz visual para activar/desactivar y reordenar mapas y mods.
   - Seguridad garantizada: Mantiene a `Muldraugh, KY` como eslabón final del mapa.
4. **Catálogo Integrado:** Sección para explorar e instalar con un clic los mods más populares de la comunidad (Raven Creek, Brita's, etc.).

## 🛠️ Comandos de Trabajo (Scripts de pnpm)

- `pnpm dev`: Inicia el servidor de Next.js en modo desarrollo (Hot-Reloading).
- `pnpm build`: Compila el proyecto completo para producción.
- `pnpm start`: Levanta el servidor usando el build de producción.
- `pnpm lint`: Ejecuta ESLint para analizar errores en el código (Obligatorio antes de cada commit).
- `pnpm tsc --noEmit`: Verifica estrictamente el tipado de TypeScript sin compilar archivos (usado por los agentes para asegurar calidad).

## 🤖 Información para Agentes IA
Si eres un agente de IA interactuando con este repositorio, las reglas y flujos de trabajo estrictos residen en el archivo `AGENTS.md` y en la carpeta `.agents/rules/`.
Para entender la topología de las features y dependencias a nivel de código, revisa la documentación de sistema estructurada en `docs/ai_architecture.xml` (formato optimizado para LLMs).
