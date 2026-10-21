/**
 * @module evaluacion/modulos/cuestionarios/base
 * @description Fábrica de módulos de cuestionario a partir de una definición declarativa de ítems y calificación.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la construcción genérica de módulos de cuestionario.
 *  - O (Abierto/Cerrado): cada instrumento se añade como definición, sin modificar la fábrica.
 *  - L (Sustitución de Liskov): los módulos producidos cumplen el contrato de ejecutarModulo.
 *  - D (Inversión de dependencias): la calificación y la normalización se inyectan en la definición (calificar, normalizar).
 * Notas: mientras `calificar` sea null el módulo valida y conserva las respuestas con estado 'pendiente_calificacion'; no se inventa puntaje.
 */

import { TIPO_MODULO, ESTADO_MODULO } from '../../trazabilidad.js';
import { validarItems } from '../../validacion/validarRespuestas.js';

/** Crea un módulo de cuestionario a partir de su definición.
 * @param {Object} def - definición del instrumento.
 * @param {string} def.id - identificador del módulo.
 * @param {Object[]} def.items - ítems a validar.
 * @param {string} def.contratoNormalizado - descripción del dato normalizado que produce.
 * @param {Function|null} [def.calificar] - (respuestas, contexto) => resultadoEvaluacion.
 * @param {Function} [def.normalizar] - (resultadoEvaluacion, contexto) => { datoNormalizado, nivel }.
 * @returns {Object} módulo conforme al contrato de ejecutarModulo. */
export function crearModuloCuestionario(def) {
  return {
    tipo: TIPO_MODULO.CUESTIONARIO,
    estadoConfiguracion: def.calificar ? 'calificacion_integrada' : 'calificacion_pendiente',
    ...def,

    /** Obtiene las respuestas del instrumento.
     * @param {Object} datos - datos ingresados.
     * @returns {Object|undefined} respuestas. */
    extraer(datos) {
      return datos?.cuestionarios?.[def.id];
    },

    /** Valida las respuestas contra los ítems declarados.
     * @param {Object} respuestas - respuestas extraídas.
     * @param {Object} contexto - datos del evaluado.
     * @returns {Object} resultado de validarItems. */
    validar(respuestas, contexto) {
      return validarItems(def.items, respuestas, contexto);
    },

    /** Califica el instrumento o lo deja pendiente si no hay reglas.
     * @param {Object} respuestas - respuestas validadas.
     * @param {Object} validacion - validación previa.
     * @param {Object} contexto - datos del evaluado.
     * @returns {Object} resultado de la evaluación. */
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

    /** Normaliza el resultado según la definición.
     * @param {Object|null} resultado - resultado de evaluar.
     * @param {Object} contexto - datos del evaluado.
     * @returns {{datoNormalizado: Object|null, nivel: *}} dato normalizado y nivel. */
    normalizar(resultado, contexto) {
      if (resultado === null || typeof def.normalizar !== 'function') return { datoNormalizado: null, nivel: null };
      return def.normalizar(resultado, contexto);
    },
  };
}

/** Genera ítems de opción numerados (p. ej. r1..r23).
 * @param {string} prefijo - prefijo del id.
 * @param {number} cantidad - número de ítems.
 * @param {Object} [extra] - propiedades comunes.
 * @returns {Object[]} ítems generados. */
export function itemsNumerados(prefijo, cantidad, extra = {}) {
  return Array.from({ length: cantidad }, (_, i) => ({ id: `${prefijo}${i + 1}`, tipo: 'opcion', texto: null, ...extra }));
}
