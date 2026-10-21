/**
 * @module evaluacion/informe/construirInforme
 * @description Informe final (etapa 9): organiza para lectura lo producido por las etapas anteriores; no calcula.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la estructura del informe.
 *  - D (Inversión de dependencias): recibe los resultados de cada etapa como parámetros, sin invocar las etapas.
 * Notas: las alertas de seguridad se presentan antes de la recomendación.
 */

import { ESTADO_MODULO } from '../trazabilidad.js';

/** Construye el informe final.
 * @param {Object} p - resultados de las etapas.
 * @param {Object} p.resultados - sobres de trazabilidad por módulo.
 * @param {Object} p.reglas - resultado de las reglas de preparación y seguridad.
 * @param {Object} p.decision - resultado de ejecutarDecisionEngine.
 * @param {Object} p.ranking - resultado de construirRanking.
 * @param {Object|null} [p.planAdaptacion] - plan de adaptación o solicitud de datos.
 * @returns {Object} informe con resumen, seguridad, recomendación, módulos, advertencias y pendientes. */
export function construirInforme({ resultados, reglas, decision, ranking, planAdaptacion = null }) {
  const modulos = Object.values(resultados).map(m => ({
    moduloId: m.moduloId,
    nombre: m.nombre,
    tipo: m.tipo,
    destino: m.destino,
    estado: m.estado,
    nivel: m.nivel,
    advertencias: m.advertencias,
    datosFaltantes: m.datosFaltantes,
    fuente: m.fuente?.referencia ?? null,
  }));

  const pendientesConfiguracion = [...new Set(Object.values(resultados).flatMap(m => m.configuracion.pendientes))];
  if (decision.estado === 'pendiente_integracion') pendientesConfiguracion.push('Integrar la logica definitiva del DecisionEngine.');

  const conDatos = modulos.filter(m => m.estado !== ESTADO_MODULO.SIN_DATOS).length;

  return {
    resumen: {
      modulosConDatos: conDatos,
      modulosTotales: modulos.length,
      decisionEngine: decision.estado,
      ranking: ranking.estado,
      pruebaMaximaAutorizada: reglas.pruebaMaxima.autorizada,
    },
    seguridad: { alertas: [...reglas.alertas, ...(decision.salida?.seguridad?.alertas ?? [])], pruebaMaxima: reglas.pruebaMaxima },
    recomendacion: ranking.familias ? {
      ranking: ranking.familias,
      recomendada: ranking.recomendada ?? null,
      sinFamiliaCompatible: ranking.sinFamiliaCompatible ?? false,
      estado: decision.salida?.estado ?? null,
      experiencia: decision.salida?.experiencia ?? null,
    } : null,
    // Estado 3 o datos insuficientes cuando ninguna familia es firme.
    preparacion: planAdaptacion,
    // El perfil funcional completo está en etapas.perfilFuncional; no se duplica.
    modulos,
    advertencias: [...reglas.advertencias, ...ranking.advertencias, ...(decision.errores ?? [])],
    pendientesConfiguracion,
  };
}
