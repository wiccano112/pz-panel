---
trigger: model_decision
description: Reglas de React 19 y estructura de componentes
---
# Reglas de React 19

- **Hooks Modernos:** Aprovecha las novedades de React 19, como `useTransition` para manejar estados pendientes en transacciones (especialmente al usar Server Actions). Usa los nuevos hooks de formulario (`useActionState`, `useFormStatus`) si aplica.
- **Componentes Pequeños y Puros:** Divide la interfaz en componentes lo más pequeños y autocontenidos posible. Evita props drilling masivo.
- **Manejo de Errores:** Implementa `error.tsx` en las rutas para ceder el control de excepciones de forma limpia.
- **Estilos:** Usa `className` con las clases utilitarias de TailwindCSS. Si usas clases condicionales, emplea `clsx` y `tailwind-merge` para evitar conflictos en los builds de producción.
