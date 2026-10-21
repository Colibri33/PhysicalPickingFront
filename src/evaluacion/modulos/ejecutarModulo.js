/**
 * @module evaluacion/modulos/ejecutarModulo
 * @description Ejecuta el recorrido común de un módulo (extraer, validar, evaluar, normalizar) y lo empaqueta en el sobre de trazabilidad.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la orquestación del recorrido de un módulo.
 *  - O (Abierto/Cerrado): nuevos módulos se ejecutan sin modificar este orquestador.
 *  - L (Sustitución de Liskov): cualquier módulo que cumpla el contrato es intercambiable.
 *  - I (Segregación de interfaces): solo se exigen extraer, validar, evaluar y normalizar; sinDatos es opcional.
 *  - D (Inversión de dependencias): depende del contrato del módulo y de recursos inyectados (p. ej. baremos), no de módulos concretos.
 * Notas: contrato del módulo: { id, nombre, tipo, destino, version, estadoConfiguracion, fuente, pendientes,
 * extraer(datos) → respuestas, validar(respuestas, contexto) → validación, evaluar(respuestas, validacion, contexto) →
 * { resultadoEvaluacion, estado?, advertencias?, datosFaltantes? }, normalizar(resultadoEvaluacion, contexto, recursos) →
 * { datoNormalizado, nivel, estado?, advertencias?, datosFaltantes? }, sinDatos?(contexto) }.
 */

import { crearResultadoModulo, ESTADO_MODULO } from '../trazabilidad.js';
import { estaVacio } from '../validacion/validarRespuestas.js';

/** Indica si las respuestas de un módulo carecen de contenido.
 * @param {*} respuestas - respuestas extraídas.
 * @returns {boolean} true si están vacías. */
function vacio(respuestas) {
  if (estaVacio(respuestas)) return true;
  if (typeof respuestas === 'object' && !Array.isArray(respuestas)) {
    return Object.values(respuestas).every(v => estaVacio(v) ||
      (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0));
  }
  return false;
}

/** Ejecuta un módulo y devuelve su sobre de trazabilidad.
 * @param {Object} modulo - módulo que cumple el contrato.
 * @param {Object} datosIngresados - datos crudos de la evaluación.
 * @param {Object} contexto - datos del evaluado (sexo, edad).
 * @param {Object} recursos - recursos inyectados (p. ej. baremos).
 * @returns {Object} resultado de módulo creado con crearResultadoModulo. */
export function ejecutarModulo(modulo, datosIngresados, contexto, recursos) {
  const respuestas = modulo.extraer(datosIngresados);

  if (vacio(respuestas)) {
    const extra = modulo.sinDatos?.(contexto) ?? {};
    return crearResultadoModulo({
      modulo,
      estado: ESTADO_MODULO.SIN_DATOS,
      respuestaOriginal: respuestas ?? null,
      validacion: null,
      advertencias: extra.advertencias ?? [],
      datosFaltantes: ['respuestas', ...(extra.datosFaltantes ?? [])],
    });
  }

  const validacion = modulo.validar(respuestas, contexto);
  const advertencias = [...validacion.advertencias];
  const datosFaltantes = [...validacion.faltantes];

  if (!validacion.ok) {
    return crearResultadoModulo({
      modulo, estado: ESTADO_MODULO.INVALIDO, respuestaOriginal: respuestas, validacion,
      advertencias, datosFaltantes,
    });
  }

  const ev = modulo.evaluar(respuestas, validacion, contexto) ?? {};
  advertencias.push(...(ev.advertencias ?? []));
  datosFaltantes.push(...(ev.datosFaltantes ?? []));

  const nz = modulo.normalizar(ev.resultadoEvaluacion ?? null, contexto, recursos) ?? {};
  advertencias.push(...(nz.advertencias ?? []));
  datosFaltantes.push(...(nz.datosFaltantes ?? []));

  const estado = validacion.faltantes.length > 0
    ? ESTADO_MODULO.INCOMPLETO
    : (ev.estado ?? nz.estado ?? ESTADO_MODULO.COMPLETO);

  return crearResultadoModulo({
    modulo, estado, respuestaOriginal: respuestas, validacion,
    resultadoEvaluacion: ev.resultadoEvaluacion ?? null,
    datoNormalizado: nz.datoNormalizado ?? null,
    nivel: nz.nivel ?? null,
    advertencias, datosFaltantes,
  });
}
