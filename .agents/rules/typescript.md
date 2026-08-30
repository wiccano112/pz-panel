---
trigger: model_decision
description: Reglas estrictas para el uso de TypeScript en el proyecto
---
# Reglas de TypeScript

- **Prohibido el uso de `any`:** Todos los tipos deben estar definidos de forma explícita. Usa `unknown` si el tipo no se conoce en tiempo de compilación y haz validación de tipos (type narrowing).
- **Interfaces vs Types:** Usa `interface` para objetos y contratos públicos. Usa `type` para uniones o primitivos.
- **Strict Mode:** El código debe compilar exitosamente bajo `tsc --noEmit` respetando el `strict: true` de tsconfig.
- **Exportaciones explícitas:** Los componentes y funciones utilitarias deben exportar explícitamente los tipos de sus propiedades y retornos si son consumidos por otros archivos.
