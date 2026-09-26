# REQUERIMIENTO DE IMPLEMENTACIÓN: OPCIONES DE GENERADORES Y COMBUSTIBLE EN SANDBOX (BUILD 42)

## 1. RESUMEN EJECUTIVO
Este documento especifica los cambios requeridos en el módulo de **Sandbox Vars** de `pz-panel` para corregir desfasajes existentes e incorporar las nuevas variables de control de **Generadores Eléctricos** y **Estaciones de Servicio** introducidas en Project Zomboid (Build 42).

Actualmente, varias opciones de generadores en `src/constants/sandbox.ts` presentan valores por defecto erróneos, rangos incompatibles con el motor del juego, y falta la nueva variable de rango vertical (`GeneratorVerticalPowerRange`).

---

## 2. DIAGNÓSTICO DE INCONSISTENCIAS DETECTADAS EN `pz-panel`

### 2.1 Falta de opción: `GeneratorVerticalPowerRange` (Build 42)
* **Estado actual en `pz-panel`**: No existe.
* **Comportamiento en PZ**: Permite definir cuántos niveles/pisos (tanto hacia arriba como hacia abajo en sótanos) alimenta de electricidad un generador.
* **Valores del motor**: Min: `1`, Max: `15`, Default: `3`.

### 2.2 Desfase de escala y default: `GeneratorFuelConsumption`
* **Estado actual en `pz-panel`**:
  ```ts
  defaultValue: 1.0, min: 0.1, max: 10.0, step: 0.1
  ```
* **Comportamiento en PZ**:
  * En el juego el default oficial es **`0.10`** (consumo de combustible por hora in-game). Poner `1.0` multiplica el consumo por 10.
  * El motor soporta un rango de `0.00` a `100.00`. Al limitar el mínimo a `0.1`, los administradores no pueden configurar consumo reducido (ej. `0.05`) ni consumo nulo (`0.0`).
  * El `step` debe ser `0.01` o `0.05` para permitir ajustes precisos.

### 2.3 Desfase crítico en opciones: `GeneratorSpawning`
* **Estado actual en `pz-panel`**: Tiene 5 opciones (1 a 5) con `defaultValue: 3`.
* **Comportamiento en PZ**:
  * El motor de PZ define **7 niveles** para esta variable:
    - `1` = None (Ninguno)
    - `2` = Insanely Rare
    - `3` = Extremely Rare
    - `4` = Rare *(Default oficial)*
    - `5` = Normal
    - `6` = Common
    - `7` = Abundant
  * **Impacto**: Si un usuario selecciona "Rare" en el panel actual (valor 2), en el juego se escribe 2 (`Insanely Rare`).

### 2.4 Descripción imprecisa: `AllowExteriorGenerator`
* **Estado actual en `pz-panel`**: Label dice *"Exterior Generator Rain Safety"* y la descripción menciona explosiones por lluvia.
* **Comportamiento en PZ**: La variable del motor habilita que el generador alimente baldosas fuera de recintos cerrados (*exterior tiles*), lo cual es el requisito para alimentar los surtidores de las gasolineras.

### 2.5 Rango de `GeneratorTileRange`
* **Estado actual en `pz-panel`**: `min: 5, max: 100, step: 1, defaultValue: 20`.
* **Comportamiento en PZ**: En el motor el mínimo permitido es `1` (Min: 1, Max: 100, Default: 20).

### 2.6 Opciones complementarias de Estaciones de Servicio (Build 42)
* En Build 42 se incorporaron variables granulares de combustible en estaciones de servicio además de `FuelStationGasInfinite`:
  * `FuelStationGasEmptyChance`: Porcentaje de surtidores que inician sin combustible (Min: 0, Max: 100, Default: 20).
  * `FuelStationGasMin` y `FuelStationGasMax`: Niveles mínimo y máximo de combustible inicial (Min: 0.0, Max: 1.0).

---

## 3. ESPECIFICACIÓN TÉCNICA DE CAMBIOS

### Archivo a modificar:
`src/constants/sandbox.ts` (dentro de la categoría correspondiente, e.g. `advanced` o subsección de Generadores y Combustible).

### Definición exacta de campos sugerida:

```typescript
// ==========================================
// Generadores Eléctricos & Gasolineras (Build 42)
// ==========================================
{
  key: 'GeneratorFuelConsumption',
  label: 'Consumo de Combustible del Generador',
  description: 'Litros de nafta consumidos por hora de juego (0.10 = estándar del juego; 0.0 = sin consumo).',
  type: 'number',
  defaultValue: 0.1,
  min: 0.0,
  max: 100.0,
  step: 0.01,
},
{
  key: 'GeneratorSpawning',
  label: 'Probabilidad de Spawn de Generadores',
  description: 'Frecuencia con la que aparecen generadores portátiles en depósitos, garajes y tiendas.',
  type: 'select',
  defaultValue: 4,
  options: [
    { value: 1, label: '1 - Ninguno (None)' },
    { value: 2, label: '2 - Insanamente Raro (Insanely Rare)' },
    { value: 3, label: '3 - Extremadamente Raro (Extremely Rare)' },
    { value: 4, label: '4 - Raro / Por defecto (Rare)' },
    { value: 5, label: '5 - Normal' },
    { value: 6, label: '6 - Común (Common)' },
    { value: 7, label: '7 - Abundante (Abundant)' },
  ],
},
{
  key: 'AllowExteriorGenerator',
  label: 'Permitir Generador en Exteriores',
  description: 'Permite que el generador energice casillas exteriores (necesario para reactivar surtidores de combustible).',
  type: 'boolean',
  defaultValue: true,
},
{
  key: 'GeneratorTileRange',
  label: 'Radio Eléctrico Horizontal (Casillas)',
  description: 'Alcance horizontal en baldosas cubiertas por la energía del generador (default = 20).',
  type: 'number',
  defaultValue: 20,
  min: 1,
  max: 100,
  step: 1,
},
{
  key: 'GeneratorVerticalPowerRange',
  label: 'Alcance Eléctrico Vertical (Pisos/Niveles)',
  description: 'Cantidad de niveles tanto hacia arriba como hacia abajo (sótanos) que energiza el generador.',
  type: 'number',
  defaultValue: 3,
  min: 1,
  max: 15,
  step: 1,
},
{
  key: 'FuelStationGasInfinite',
  label: 'Combustible Infinito en Surtidores',
  description: 'Los surtidores de las estaciones de servicio nunca se quedan sin gasolina.',
  type: 'boolean',
  defaultValue: false,
},
{
  key: 'FuelStationGasEmptyChance',
  label: 'Probabilidad de Surtidor Vacío (%)',
  description: 'Porcentaje de probabilidad de que una bomba de gasolina aparezca inicialmente sin combustible.',
  type: 'number',
  defaultValue: 20,
  min: 0,
  max: 100,
  step: 1,
},
{
  key: 'FuelStationGasMin',
  label: 'Combustible Mínimo en Surtidores',
  description: 'Nivel mínimo inicial de gasolina en estaciones de servicio (0.0 a 1.0).',
  type: 'number',
  defaultValue: 0.0,
  min: 0.0,
  max: 1.0,
  step: 0.05,
},
{
  key: 'FuelStationGasMax',
  label: 'Combustible Máximo en Surtidores',
  description: 'Nivel máximo inicial de gasolina en estaciones de servicio (0.0 a 1.0).',
  type: 'number',
  defaultValue: 0.8,
  min: 0.0,
  max: 1.0,
  step: 0.05,
}
```

---

## 4. CRITERIOS DE ACEPTACIÓN (DoD)

1. [ ] **Renderizado en UI**:
   * Los 9 campos descritos aparecen en la sección correspondiente dentro de `/sandbox`.
   * Los controles numéricos respetan los valores mínimos, máximos y pasos (`step: 0.01` para fuel).
   * El selector de `GeneratorSpawning` muestra los 7 niveles alineados con el engine de PZ.
2. [ ] **Serialización y Persistencia**:
   * Al guardar desde la Sticky Action Bar, los valores se escriben correctamente en `data/Server/<SERVER_NAME>_SandboxVars.lua`.
   * Al recargar la página, los valores persisten fielmente reflejando el contenido del archivo Lua.
3. [ ] **Calidad de Código**:
   * `pnpm tsc --noEmit` pasa sin errores de tipado.
   * `pnpm run lint` pasa sin advertencias ni fallos.
   * `pnpm test` ejecuta todos los tests unitarios con éxito.
