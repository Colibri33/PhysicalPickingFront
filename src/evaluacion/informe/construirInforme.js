/* ═══════════════════════════════════════════════════════════════
   evaluacion/informe/construirInforme.js
   Etapa 9: informe final. Solo organiza para lectura lo producido en
   las etapas anteriores; no calcula. Las alertas de seguridad van
   antes de la recomendacion.
   ═══════════════════════════════════════════════════════════════ */

import { ESTADO_MODULO } from '../trazabilidad.js';

export function construirInforme({ resultados, reglas, decision, ranking }) {
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
    recomendacion: ranking.familias ? { ranking: ranking.familias, estado: decision.salida?.estado ?? null, experiencia: decision.salida?.experiencia ?? null } : null,
    // El perfil funcional completo esta en etapas.perfilFuncional (no se duplica).
    modulos,
    advertencias: [...reglas.advertencias, ...ranking.advertencias, ...(decision.errores ?? [])],
    pendientesConfiguracion,
  };
}
