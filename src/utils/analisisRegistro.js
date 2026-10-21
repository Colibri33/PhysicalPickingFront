/**
 * @module utils/analisisRegistro
 * @description Reconstruye el estado `analisis` de la aplicación a partir de un registro guardado (historial o exportación).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la correspondencia registro guardado -> estado de análisis.
 *  - D (Inversión de dependencias): depende solo de estadoAnalisisInicial, que define la forma base del estado.
 */

import { estadoAnalisisInicial } from '../logic/modelo.js';

const CLAVES = ['participante', 'parq', 'complementarias', 'breq', 'barreras', 'ipaq', 'psqi', 'leger', 'realesF', 'fisicas', 'antropometricas', 'cuestionarios'];

/** Reconstruye el estado `analisis` desde un registro guardado.
 * @param {Object} r - Registro guardado.
 * @returns {Object} estado de análisis listo para el motor de evaluación. */
export function analisisDesdeRegistro(r) {
  const base = estadoAnalisisInicial();
  const a = { ...base };
  for (const k of CLAVES) if (r?.[k] && typeof r[k] === 'object') a[k] = { ...base[k], ...r[k] };
  return a;
}
