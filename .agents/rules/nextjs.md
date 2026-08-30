---
trigger: model_decision
description: Reglas arquitectónicas de Next.js 16 y Server Components
---
# Reglas de Next.js (App Router)

- **Default a Server Components:** Por defecto, todo componente es de servidor. Solo usa la directiva `"use client"` cuando el componente necesite interactividad (useState, onClick, useEffect, listeners) o consuma librerías exclusivas del navegador.
- **Server Actions para Mutaciones:** Usa Server Actions (`"use server"`) para cualquier operación que modifique el estado del servidor (iniciar Docker, guardar en INI, etc.).
- **Route Handlers / APIs:** Úsalos primariamente para proveer streams de datos (SSE) o endpoints para librerías de polling (como SWR) para traer estadísticas en tiempo real (ej. `docker stats`).
- **Navegación:** Usa siempre el componente `<Link>` de `next/link` para navegaciones internas en lugar de etiquetas `<a>` crudas.
