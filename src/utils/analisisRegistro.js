/**
 * @module utils/analisisRegistro
 * @description Define el estado vacío de un análisis y lo reconstruye a partir de un registro guardado (historial o exportación).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la forma del estado `analisis` y su correspondencia con el registro guardado.
 *  - D (Inversión de dependencias): las claves de la batería física salen del catálogo de capacidades, no se repiten aquí.
 * Notas: los registros guardados antes de la migración conservan `fisicas` (puntajes 0-100 del cálculo heredado); ya no se usa ni se genera.
 */

import { VARIABLES_CAPTURA } from '../evaluacion/capacidades.js';

const CLAVES = ['participante', 'parq', 'complementarias', 'breq', 'barreras', 'ipaq', 'psqi', 'leger', 'realesF', 'antropometricas', 'cuestionarios'];

/** Crea el estado vacío de un análisis completo.
 * @returns {Object} estado inicial con todas las secciones del análisis. */
export function estadoAnalisisInicial() {
  return {
    participante: { nombre: '', edad: '', genero: '', perfil: '', deporte: '' },
    parq:     { respuestas: {}, detalles: {} },
    complementarias: { respuestas: {} },
    breq:     { respuestas: {} },
    barreras: { respuestas: {} },
    ipaq:     { respuestas: {} },
    psqi:     { respuestas: {} },
    leger:    { palier: '' },
    realesF:  Object.fromEntries(VARIABLES_CAPTURA.map(v => [v.id, ''])),
    antropometricas: { peso: '', talla: '', cintura: '', cadera: '', grasaVisc: '', imc: null, icc: null },
    // Respuestas por módulo de src/evaluacion; vacío hasta que exista su captura en la interfaz o su importación.
    cuestionarios: { parq: {}, complementarias: {}, ipaq: {}, psqi: {}, breq3: {}, bbaq21: {} },
  };
}

/** Reconstruye el estado `analisis` desde un registro guardado.
 * @param {Object} r - Registro guardado.
 * @returns {Object} estado de análisis listo para el motor de evaluación. */
export function analisisDesdeRegistro(r) {
  const base = estadoAnalisisInicial();
  const a = { ...base };
  for (const k of CLAVES) if (r?.[k] && typeof r[k] === 'object') a[k] = { ...base[k], ...r[k] };
  return a;
}
