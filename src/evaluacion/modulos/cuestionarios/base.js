/* ═══════════════════════════════════════════════════════════════
   evaluacion/modulos/cuestionarios/base.js
   Fabrica de modulos de cuestionario. Cada instrumento declara sus
   items y, cuando se integre, su funcion `calificar`. Mientras
   `calificar` sea null el modulo valida y conserva las respuestas,
   y queda en estado 'pendiente_calificacion' (no se inventa puntaje).
   ═══════════════════════════════════════════════════════════════ */

import { TIPO_MODULO, ESTADO_MODULO } from '../../trazabilidad.js';
import { validarItems } from '../../validacion/validarRespuestas.js';

/**
 * @param {object} def
 *  id, nombre, destino, version, fuente, pendientes, items,
 *  contratoNormalizado: descripcion del dato que debe producir,
 *  calificar: (respuestas, contexto) => resultadoEvaluacion | null,
 *  normalizar: (resultadoEvaluacion, contexto) => { datoNormalizado, nivel } | null
 */
export function crearModuloCuestionario(def) {
  return {
    tipo: TIPO_MODULO.CUESTIONARIO,
    estadoConfiguracion: def.calificar ? 'calificacion_integrada' : 'calificacion_pendiente',
    ...def,

    extraer(datos) {
      return datos?.cuestionarios?.[def.id];
    },

    validar(respuestas, contexto) {
      return validarItems(def.items, respuestas, contexto);
    },

    evaluar(respuestas, validacion, contexto) {
      if (typeof def.calificar !== 'function') {
        return {
          resultadoEvaluacion: null,
          estado: ESTADO_MODULO.PENDIENTE_CALIFICACION,
          advertencias: [`${def.nombre}: respuestas validadas y conservadas; reglas de calificacion pendientes de integrar.`],
          datosFaltantes: ['reglas_calificacion'],
        };
      }
      return { resultadoEvaluacion: def.calificar(respuestas, contexto) };
    },

    normalizar(resultado, contexto) {
      if (resultado === null || typeof def.normalizar !== 'function') return { datoNormalizado: null, nivel: null };
      return def.normalizar(resultado, contexto);
    },
  };
}

/** Utilidad: genera items Likert numerados (p. ej. r1..r23). */
export function itemsNumerados(prefijo, cantidad, extra = {}) {
  return Array.from({ length: cantidad }, (_, i) => ({ id: `${prefijo}${i + 1}`, tipo: 'opcion', texto: null, ...extra }));
}
