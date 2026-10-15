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
| 6 | Reglas de preparación/seguridad | `reglas/preparacionSeguridad.js` | R-SEG-01 a 03 (autorización de Léger, VO2max sin dato, limitaciones por prueba). | No modifica niveles ni porcentaje. Los Estados 1-3 siguen dentro del DecisionEngine. |
| 7 | DecisionEngine | `decision/decisionEnginePort.js` | Construye y valida la entrada del motor; ejecuta el motor inyectado. | Sin motor → `pendiente_integracion`. |
| 8 | Ranking | `decision/ranking.js` | Toma el ranking del motor y verifica las 13 familias. | No reordena ni recalcula. |
| 9 | Informe | `informe/construirInforme.js` | Seguridad primero, recomendación, estado de módulos, pendientes. | No calcula. |

Orquestador: `index.js → ejecutarFlujoEvaluacion(datos, { baremos, decisionEngine, ahora })`.

## Módulos

| Módulo | Destino | Estado de configuración |
|---|---|---|
| `fisica_fuerza`, `fisica_fuerza_explosiva`, `fisica_flexibilidad`, `fisica_equilibrio` | compatibilidad | Baremos AFISAL-INEFC integrados por defecto (grupos 18-24 y 25-34 × sexo); equilibrio se captura en intentos |
| `fisica_vo2max` | compatibilidad | Resistencia aeróbica: captura de nivel Léger 0-21 (admite medios niveles) con compuerta PAR-Q+; estimación y baremos propios pendientes |
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

**DecisionEngine.** Motor de referencia v1 registrado por defecto (auditable;
sustituible con `registrarDecisionEngine()` o `decisionEngine: null`). La entrada
sigue el contrato de `DecisionEngine.evaluar()`: `{ capacidades, sexo, ipaq, psqi, parq, antecedentes, experiencias, leger, informativas }`.

## Cálculo heredado

`logic/modelo.js` (consolidado base/ajustes, radar, perfiles Resistencia/Potencia
y ranking de `DEPORTES`) se conserva solo como desglose descriptivo y para el
historial guardado. Las pantallas de perfil, informe y recomendación consumen el
ranking del DecisionEngine (13 familias).
