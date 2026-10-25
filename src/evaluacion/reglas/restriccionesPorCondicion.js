/**
 * @module evaluacion/reglas/restriccionesPorCondicion
 * @description Regla R-SEG-05: qué hace cada condición declarada en el PAR-Q+ con las familias deportivas que se pueden recomendar.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la tabla condición → efecto y su aplicación; no ordena ni calcula compatibilidad.
 *  - O (Abierto/Cerrado): una condición nueva es una fila más de RESTRICCIONES o ALERTAS; la función de aplicación no cambia.
 *  - D (Inversión de dependencias): la matriz de familias se recibe por parámetro; el ranking consume el resultado sin conocer la tabla.
 * Notas: decisión propia aprobada por el autor (2026-10). Cada fila tiene `disparadores`: el id de una categoría del PAR-Q+ (c1..c10), que cuenta
 * cuando la persona la declara (respuesta Sí) aunque sus subpreguntas estén en No, o el de una subpregunta (c6b, c7d, c10a), que exige su propio Sí.
 * Los mensajes nombran la afección que la persona manifestó. Son precauciones, no un diagnóstico ni una prescripción: la decisión final es de la
 * persona evaluada y de su evaluador. Tres efectos: (1) dolor en el pecho o mareo o pérdida de consciencia (p2, p3) impiden recomendar hasta una
 * valoración médica; (2) restricción: las familias que cumplen algún criterio de la fila quedan "no recomendables" y se explican; (3) alerta: texto
 * específico sin cambiar el ranking. "Carga cardiovascular alta" es la de Mitchell (dinámico C o estático III) o una demanda aeróbica Alta o Muy alta
 * en la matriz. La matriz no codifica el contacto, por eso esas familias se listan por id.
 */

import { MATRIZ_DEMANDA, DEMANDA_ALTA } from '../decision/matrizDemanda.js';

/** Identificador de la regla en alertas, motivos y documentación. */
export const REGLA_RESTRICCIONES = 'R-SEG-05';

/** Familias de contacto o de equipo (la matriz de demandas no incluye el contacto). */
export const FAMILIAS_DE_CONTACTO = Object.freeze(['combate_golpeo', 'combate_agarre', 'deportes_equipo']);

/** Preguntas generales que impiden recomendar hasta una valoración médica: dolor en el pecho (p2) y mareo o pérdida de consciencia (p3). */
export const SINTOMAS_DE_ALARMA = Object.freeze({
  p2: 'dolor en el pecho',
  p3: 'mareo o pérdida de consciencia',
  titulo: 'Valoración médica antes de recomendar',
});

/** Carga cardiovascular alta según Mitchell: componente dinámico C o estático III.
 * @param {{mitchell?: string}} f - familia de la matriz.
 * @returns {boolean} true si aplica. */
const cargaCardiovascularAlta = (f) => /^III|C$/.test(f.mitchell ?? '');

/** Crea un criterio: la familia exige nivel Alta o Muy alta en alguna de las capacidades dadas.
 * @param {...string} capacidades - ids de capacidad de la matriz.
 * @returns {function(Object): boolean} criterio sobre una familia. */
const exigeAlta = (...capacidades) => (f) => capacidades.some(c => DEMANDA_ALTA.includes(f.demandas?.[c]));

/** Restricciones sobre familias. `disparadores` asocia el id del PAR-Q+ con la forma en que se nombra lo que la persona manifestó;
 * `criterios` son los motivos y quiénes caen en ellos. */
export const RESTRICCIONES = Object.freeze([
  {
    id: 'cardiovascular',
    disparadores: { c3: 'una enfermedad cardiovascular o cardíaca', c4: 'hipertensión arterial', c7d: 'hipertensión pulmonar' },
    criterios: [
      { motivo: 'carga cardiovascular alta (Mitchell dinámico C o estático III)', aplicaA: cargaCardiovascularAlta },
      { motivo: 'demanda aeróbica Alta o Muy alta', aplicaA: exigeAlta('vo2max') },
    ],
  },
  {
    id: 'respiratoria',
    disparadores: { c7: 'una enfermedad respiratoria (EPOC, asma u otra)' },
    criterios: [{ motivo: 'demanda aeróbica Alta o Muy alta', aplicaA: exigeAlta('vo2max') }],
  },
  {
    id: 'musculoesqueletica',
    disparadores: { c1: 'artritis, osteoporosis o un problema de columna', c6b: 'síndrome de Down con problemas de espalda' },
    criterios: [{ motivo: 'demanda de fuerza explosiva Alta o Muy alta', aplicaA: exigeAlta('fuerza_explosiva') }],
  },
  {
    id: 'neurologica',
    disparadores: { c8: 'una lesión medular', c9: 'un accidente cerebrovascular' },
    criterios: [{ motivo: 'demanda de equilibrio o de fuerza explosiva Alta o Muy alta', aplicaA: exigeAlta('equilibrio', 'fuerza_explosiva') }],
  },
  {
    id: 'conmocion',
    disparadores: { c10a: 'una conmoción cerebral o pérdida de conocimiento por un golpe en la cabeza' },
    criterios: [{ motivo: 'deporte de contacto o de equipo', aplicaA: (f) => FAMILIAS_DE_CONTACTO.includes(f.id) }],
  },
]);

/** Alertas específicas que no cambian el ranking. */
export const ALERTAS = Object.freeze([
  {
    id: 'cancer', disparadores: { c2: 'cáncer' }, titulo: 'Cáncer declarado',
    mensaje: 'Manifestaste tener cáncer. La actividad adecuada depende del tipo y del tratamiento: consúltala con tu equipo médico.',
  },
  {
    id: 'metabolica', disparadores: { c5: 'una condición metabólica' }, titulo: 'Condición metabólica declarada',
    mensaje: 'Manifestaste tener una condición metabólica (por ejemplo, diabetes). Pide a tu médico indicaciones sobre la glucosa antes, durante y después del ejercicio, incluido el riesgo de hipoglucemia.',
  },
  {
    id: 'salud_mental', disparadores: { c6: 'una condición de salud mental o de aprendizaje' }, titulo: 'Salud mental o aprendizaje declarados',
    mensaje: 'Manifestaste tener una condición de salud mental o de aprendizaje. Comenta con tu profesional de salud cómo adaptar la actividad.',
  },
  {
    id: 'otras', disparadores: { c10b: 'otra enfermedad', c10c: 'dos o más enfermedades crónicas' }, titulo: 'Otras condiciones declaradas',
    mensaje: 'Manifestaste tener otra enfermedad o dos o más enfermedades crónicas. Consulta con tu médico antes de aumentar la actividad.',
  },
]);

/** Indica si un disparador está presente: una categoría (c1..c10) cuenta si se declaró; una subpregunta, si se respondió Sí.
 * @param {string} id - id del disparador.
 * @param {{categoriasDeclaradas?: string[], subpreguntasPositivas?: string[]}} parq - dato normalizado del PAR-Q+.
 * @returns {boolean} true si la persona lo manifestó. */
function manifestado(id, parq) {
  return /^c\d+$/.test(id)
    ? (parq.categoriasDeclaradas ?? []).includes(id)
    : (parq.subpreguntasPositivas ?? []).includes(id);
}

/** Textos de los disparadores presentes en una fila.
 * @param {{disparadores: Object<string, string>}} fila - fila de RESTRICCIONES o ALERTAS.
 * @param {Object} parq - dato normalizado del PAR-Q+.
 * @returns {string[]} cómo se nombra cada cosa que la persona manifestó. */
function declaradas(fila, parq) {
  return Object.entries(fila.disparadores).filter(([id]) => manifestado(id, parq)).map(([, texto]) => texto);
}

/** Une textos en una enumeración legible ("a, b y c").
 * @param {string[]} items - textos.
 * @returns {string} enumeración. */
const enumerar = (items) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`);

/** Aplica la tabla condición → efecto al PAR-Q+ del participante.
 * @param {Object|null} parq - dato normalizado del PAR-Q+ (generalesPositivas, categoriasDeclaradas, subpreguntasPositivas).
 * @param {Object[]} [matriz] - familias con sus demandas.
 * @returns {{regla: string, bloqueo: Object|null, familias: Object<string, Object[]>, alertas: Object[], condiciones: string[]}}
 *   bloqueo (o null), restricciones por id de familia, alertas para el informe y condiciones activadas. */
export function aplicarRestriccionesPorCondicion(parq, matriz = MATRIZ_DEMANDA) {
  const salida = { regla: REGLA_RESTRICCIONES, bloqueo: null, familias: {}, alertas: [], condiciones: [] };
  if (!parq) return salida;

  const sintomas = ['p2', 'p3'].filter(id => (parq.generalesPositivas ?? []).includes(id));
  if (sintomas.length > 0) {
    const nombres = enumerar(sintomas.map(id => SINTOMAS_DE_ALARMA[id]));
    const mensaje = `Manifestaste ${nombres}. Antes de recibir una recomendación deportiva consulta con un profesional de la salud.`;
    salida.bloqueo = { condiciones: sintomas, sintomas: nombres, mensaje };
    salida.condiciones.push('sintomas_de_alarma');
    salida.alertas.push({
      codigo: 'PARQ_VALORACION_MEDICA', regla: REGLA_RESTRICCIONES, severidad: 'restriccion',
      titulo: `${SINTOMAS_DE_ALARMA.titulo}: manifestaste ${nombres}`, mensaje, condicion: 'sintomas_de_alarma',
    });
  }

  for (const r of RESTRICCIONES) {
    const quien = enumerar(declaradas(r, parq));
    if (!quien) continue;
    salida.condiciones.push(r.id);
    const marcadas = new Set();
    for (const criterio of r.criterios) {
      for (const f of matriz.filter(criterio.aplicaA)) {
        if (marcadas.has(f.id)) continue;
        marcadas.add(f.id);
        (salida.familias[f.id] ??= []).push({ regla: REGLA_RESTRICCIONES, restriccion: r.id, condicion: quien, motivo: criterio.motivo });
      }
    }
    salida.alertas.push({
      codigo: `PARQ_RESTRICCION_${r.id.toUpperCase()}`, regla: REGLA_RESTRICCIONES, severidad: 'restriccion',
      titulo: `Restricción: manifestaste tener ${quien}`,
      mensaje: `Por eso no se recomiendan las familias con ${r.criterios.map(c => c.motivo).join(', ni con ')}.`,
      condicion: r.id, declarada: quien, familias: [...marcadas],
    });
  }

  for (const a of ALERTAS) {
    const quien = enumerar(declaradas(a, parq));
    if (!quien) continue;
    salida.condiciones.push(a.id);
    salida.alertas.push({
      codigo: `PARQ_ALERTA_${a.id.toUpperCase()}`, regla: REGLA_RESTRICCIONES, severidad: 'precaucion',
      titulo: a.titulo, mensaje: a.mensaje, condicion: a.id, declarada: quien,
    });
  }
  return salida;
}
