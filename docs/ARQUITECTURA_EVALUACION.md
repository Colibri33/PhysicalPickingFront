# Arquitectura del flujo de evaluación (v0.1.0)

Código en `src/evaluacion/`. Funciones puras (sin React, DOM ni red); se prueban con `npm test`.

## Flujo

| # | Etapa | Archivo | Qué hace | Qué NO hace |
|---|---|---|---|---|
| 1 | Datos ingresados | `entrada.js` | Adapta el estado del asistente al objeto de entrada. Único punto acoplado a la UI. | — |
| 2 | Validación | `validacion/validarRespuestas.js` | Tipos, opciones, límites de coherencia, obligatoriedad, visibilidad condicional. | No califica. |
| 3 | Evaluación | `modulos/*` → `evaluar()` | Calcula el resultado del instrumento o prueba. | Sin reglas de calificación cargadas → `pendiente_calificacion`. |
| 4 | Normalización | `modulos/*` → `normalizar()` + `normalizacion/baremos.js` | Convierte a nivel ordinal o al dato que pide el motor. | Sin baremo cargado → `nivel = null`, `pendiente_baremo`. |
| 5 | Perfil funcional | `perfil/construirPerfilFuncional.js` | Agrupa solo datos normalizados por capa. | No lee respuestas originales. |
| 6 | Reglas de preparación/seguridad | `reglas/preparacionSeguridad.js` | R-SEG-01 a 04 (autorización de Léger, VO2max sin dato, limitaciones por prueba, alerta por antecedente de lesión). | No modifica niveles ni porcentaje. |
| 7 | DecisionEngine | `decision/decisionEnginePort.js` | Construye y valida la entrada del motor; ejecuta el motor inyectado. | Sin motor → `pendiente_integracion`. |
| 8 | Ranking | `decision/ranking.js` | Toma el ranking del motor, verifica las 13 familias y publica la recomendación firme (o ninguna, R-DEC-03). | No reordena ni recalcula. |
| 8b | Plan de adaptación | `reglas/planAdaptacion.js` | Sin familia firme: Estado 3 (Adaptación desde cero) con orientación ACSM, o datos faltantes. | No inventa cargas; Estados 1 y 2 siguen pendientes. |
| 9 | Informe | `informe/construirInforme.js` | Seguridad primero, recomendación, estado de módulos, pendientes. | No calcula. |

Orquestador: `index.js → ejecutarFlujoEvaluacion(datos, { baremos, decisionEngine, ahora })`.

## Módulos

| Módulo | Destino | Estado de configuración |
|---|---|---|
| `fisica_fuerza`, `fisica_fuerza_explosiva`, `fisica_flexibilidad`, `fisica_equilibrio` | compatibilidad | Baremos AFISAL-INEFC integrados por defecto (grupos 18-24 y 25-34 × sexo); equilibrio se captura en intentos |
| `fisica_vo2max` | compatibilidad | Resistencia aeróbica: captura del **nivel máximo alcanzado** (entero 1-21) con compuerta PAR-Q+; VO2máx estimado (Léger et al., 1988) y baremo propio por sexo **provisional** (`normalizacion/leger.js`, n=58) |
| `antropometricas` | informativa | IMC (OMS) e ICC (WHO 2008) calculados; % grasa/muscular retirados (histórico en `_legado`); demás baremos pendientes |
| `parq` (PAR-Q+ oficial) | **seguridad** (nunca al porcentaje) | Lógica condicional integrada; textos y subpreguntas pendientes |
| `complementarias_physicalpicking` | experiencia | Módulo propio (NO es PAR-Q+): lesiones (2 años/cirugía/dolor + zona/fecha/tratamiento), limitaciones y experiencia con textos integrados |
| `ipaq` | preparación | Calificación integrada (MET-min/semana, Bajo/Moderado/Alto); textos del IPAQ corto en español |
| `psqi` (ICSP-VC) | preparación | Calificación integrada (7 componentes + global 0-21); textos del Anexo ICSP-VC; corte colombiano en el DecisionEngine |
| `breq3` | informativa | 23 ítems, 6 subescalas, sin RAI; mapa de ítems pendiente |
| `bbaq21` | informativa | 21 ítems; escala y dimensiones pendientes |

## Trazabilidad (sobre de cada módulo)

`respuestaOriginal`, `validacion`, `resultadoEvaluacion`, `datoNormalizado`, `nivel`, `advertencias`, `datosFaltantes`, `fuente` (referencia y origen), `configuracion` (id, versión, estado, pendientes).

Origen admitido: `instrumento`, `baremo`, `literatura`, `juicio_expertos`, `decision_propia`.

## Cómo conectar lo pendiente

**Baremos.** Por defecto el orquestador aplica `BAREMOS_AFISAL`
(`normalizacion/afisal.js`: dinamometría, salto vertical, sit-and-reach y
equilibrio, grupos 18-24 y 25-34 por sexo). Para el flujo sin baremos,
pasar `opciones.baremos = []` explícitamente. Baremos propios adicionales
se inyectan con `opciones.baremos = [ { id, capacidad, version, fuente: { referencia, origen }, tipo: 'cortes_ordenados', direccion, limite, grupos: [{ sexo, edadMin, edadMax, cortes: [4 valores] }] } ]`. El `id` debe coincidir con `baremoId` en `modulos/fisicas.js`. Para casos que necesiten fórmula, usar `tipo: 'funcion'` con `clasificar(valor, contexto)`.

**Calificación de cuestionarios.** En cada archivo de `modulos/cuestionarios/`, reemplazar `calificar: null` y `normalizar: null`. `normalizar` debe devolver el `contratoNormalizado` documentado en el mismo archivo.

**Matriz de demanda + Mitchell (referencia del DecisionEngine).**
`decision/matrizDemanda.js` transcribe la Matriz de capacidades (13 familias ×
5 capacidades, demandas Baja/Media/Alta/Muy alta) y la correspondencia Mitchell
adoptada (marco AHA/ACC 2015, `mitchell.pdf`; no se presenta como clasificación
original). `decision/compatibilidad.js` implementa la regla auditable sin
números sobre niveles: la demanda es nivel mínimo (Baja→desde Bajo,
Media→desde Medio, Alta→desde Alto, Muy alta→solo Muy alto; Muy bajo no cumple
nada), compatibilidad = cumplidos/evaluados, cobertura = evaluados/5, y
Mitchell solo cuenta brechas relevantes (dinámico C→VO2max, estático
III→fuerza) para desempatar. v1.1 añade carencias (demandas sin dato) al
desempate: compatibilidad ↓, carencias relevantes ↑, brechas relevantes ↑,
brechas severas ↑, cobertura ↓, empates permitidos. Una familia con carencias
en demanda Alta/Muy alta o relevante no es firme: `decision/ranking.js`
publica `recomendada` (primera firme) y advierte si el líder por compatibilidad
es provisional. La ejecuta el motor de
referencia v1 (`decision/decisionEngine.js`); un motor externo debe
reproducirla (`test/compatibilidad.test.js` la fija).

**Decisiones propias v1.2 (2026-10), identificadas como tales:**

- **R-DEC-02 · Brecha severa.** Una brecha severa (nivel Muy bajo o Bajo donde
  la familia exige Alta o Muy alta; definición ya existente en
  `matrizDemanda.js`) también deja a la familia como no firme. Si faltar el dato
  de la demanda definitoria impide recomendar, tener ese dato en nivel bajo no
  puede permitirlo. No se añaden pesos ni umbrales y el porcentaje no cambia.
  Cada familia publica `motivosNoFirme` (`sin_dato` / `brecha_severa`).
- **R-DEC-03 · Sin familia firme.** Si ninguna familia es firme no se presenta
  ningún deporte. Si todas tienen al menos una brecha severa → **Estado 3,
  Adaptación desde cero**, con prioridades (capacidades del perfil en Muy bajo
  o Bajo) y orientación general parafraseada del ACSM (2021, 11.ª ed., cap. 5:
  Tablas 5.1, 5.5, 5.6 y *Progression of Aerobic Exercise*). Si alguna familia
  solo falla por datos faltantes → se piden esos datos (no se asigna el Estado 3).
- **R-SEG-04 · Antecedente de lesión.** Lesión deportiva en los últimos 2 años,
  cirugía musculoesquelética o dolor articular recurrente (preguntas
  complementarias) → alerta de adaptación y recuperación previa antes de iniciar
  nuevamente un deporte. Solo alerta.
- **R-BAR-01 · Erratum Tabla 12 (salto vertical, hombres 25-34).** El PDF imprime Medio 49-54 y Alto 54-60. Se aplica el criterio ya usado en la Tabla 9 (la banda impresa de Medio se conserva y Alto se recorta): 54 cm es Medio y Alto parte en 55 cm. `test/baremos.test.js` fija todos los baremos AFISAL, la clasificación Léger de la muestra y la matriz contra sus fuentes.
- **R-BAR-02 · Ecuación de Léger y fundamento del baremo.** `VO2máx = 6,0 × V − 27,4` (Léger et al., 1988, adultos); los cortes se desplazan −3,0 y ningún nivel cambia. El método z coincide con el de AFISAL-INEFC. Detalle y limitaciones: `FUNDAMENTO_BAREMO_RESISTENCIA.md`.
- Orden del ranking: familias firmes primero; dentro de cada grupo, el orden
  descrito arriba.

**DecisionEngine.** Motor de referencia v1 registrado por defecto (auditable;
sustituible con `registrarDecisionEngine()` o `decisionEngine: null`). La entrada
sigue el contrato de `DecisionEngine.evaluar()`: `{ capacidades, sexo, ipaq, psqi, parq, antecedentes, experiencias, leger, informativas }`.

## Catálogo de capacidades y registros anteriores

`evaluacion/capacidades.js` es la única declaración de las cinco capacidades físicas: nombre, unidad, rango de captura, dirección, prueba y baremo.
La captura (`VARIABLES_CAPTURA`), los módulos de evaluación, el informe y los PDF leen de ahí. `id` es el del motor y `campo` la clave de `realesF`
(`fuerzaExp`, `resistencia`), que se conserva para no invalidar registros guardados. El backend mantiene una copia de los rangos
(`DEFINICIONES_FISICAS`); `test/baremos.test.js` verifica que coincidan y que los cinco niveles de cada baremo sean alcanzables.

`evaluacion/antropometria.js` calcula IMC e ICC; se informan, pero no modifican niveles ni recomendación. El estado vacío del análisis y la
reconstrucción desde un registro están en `utils/analisisRegistro.js`.

**R-MIG-01 · Retiro del cálculo heredado (2026-10).** `logic/modelo.js` (puntajes 0-100, ajustes antropométricos de −8/−6 sin fuente, perfiles
Resistencia/Potencia, ranking de 15 actividades e interpretación) se eliminó. Los registros nuevos guardan solo `evaluacion`; el perfil físico
se muestra por nivel. Los registros anteriores se leen tal como se guardaron (Historial y PDF muestran su consolidado y su ranking antiguos) y el
backend sigue exigiendo el bloque heredado cuando un registro no trae `evaluacion`. Despliegue: primero el backend y después el frontend.
