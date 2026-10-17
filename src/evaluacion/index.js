/* ═══════════════════════════════════════════════════════════════
   evaluacion/index.js — ORQUESTADOR DEL FLUJO DE EVALUACION

     1. Datos ingresados
     2. Validacion de respuestas            (por modulo)
     3. Evaluacion de cada prueba/cuestionario
     4. Normalizacion a niveles/valores requeridos
     5. Construccion del perfil funcional
     6. Reglas de preparacion/seguridad
     7. DecisionEngine                       (puerto; motor inyectable)
     8. Ranking de las 13 familias deportivas
     9. Informe final

   Funcion pura: misma entrada + mismos recursos → misma salida.
   No usa React, DOM ni red. Sin baremos ni motor inyectados, todo lo
   que depende de ellos queda marcado como pendiente.
   ═══════════════════════════════════════════════════════════════ */

import { clonar } from './trazabilidad.js';
import { MODULOS } from './modulos/registro.js';
import { ejecutarModulo } from './modulos/ejecutarModulo.js';
import { crearRegistroBaremos } from './normalizacion/baremos.js';
import { BAREMOS_AFISAL } from './normalizacion/afisal.js';
import { BAREMOS_LEGER } from './normalizacion/leger.js';
import { construirPerfilFuncional } from './perfil/construirPerfilFuncional.js';
import { aplicarReglasPreparacionSeguridad } from './reglas/preparacionSeguridad.js';
import { construirEntradaDecisionEngine, ejecutarDecisionEngine, obtenerDecisionEngine, registrarDecisionEngine } from './decision/decisionEnginePort.js';
import { DecisionEngineReferencia } from './decision/decisionEngine.js';
import { construirRanking } from './decision/ranking.js';
import { construirInforme } from './informe/construirInforme.js';

// Motor de referencia v1 por defecto (auditable, sustituible con
// registrarDecisionEngine() o pasando { decisionEngine } explícito,
// incluido null para forzar 'pendiente_integracion').
if (!obtenerDecisionEngine()) {
  registrarDecisionEngine(new DecisionEngineReferencia());
}

export const VERSION_FLUJO = '0.1.0';

export function contextoDesdeParticipante(participante) {
  const edad = Number(participante?.edad);
  return {
    sexo: participante?.genero || null,
    edad: Number.isFinite(edad) ? edad : null,
  };
}

/**
 * @param {{participante, realesF, antropometricas, cuestionarios}} datosIngresados
 * @param {{ baremos?: Map|Array, decisionEngine?: {evaluar:Function}|null, ahora?: string }} opciones
 * Por defecto se aplican los BAREMOS_AFISAL (si se quiere el flujo sin
 * baremos, pasar `baremos: []` explícitamente).
 */
export function ejecutarFlujoEvaluacion(datosIngresados, opciones = {}) {
  // 1. Datos ingresados (copia inmutable)
  const datos = clonar(datosIngresados ?? {});
  const contexto = contextoDesdeParticipante(datos.participante);
  const baremos = opciones.baremos instanceof Map ? opciones.baremos : crearRegistroBaremos(opciones.baremos ?? [...BAREMOS_AFISAL, ...BAREMOS_LEGER]);

  // 2-4. Validacion → evaluacion → normalizacion por modulo
  const resultados = {};
  for (const modulo of MODULOS) {
    resultados[modulo.id] = ejecutarModulo(modulo, datos, contexto, { baremos });
  }

  // 5. Perfil funcional (solo datos normalizados)
  const perfil = construirPerfilFuncional(resultados, contexto);

  // 6. Reglas de preparacion/seguridad
  const reglas = aplicarReglasPreparacionSeguridad(perfil);

  // 7. DecisionEngine
  const motor = 'decisionEngine' in opciones ? opciones.decisionEngine : obtenerDecisionEngine();
  const entradaMotor = construirEntradaDecisionEngine(perfil, reglas);
  const decision = ejecutarDecisionEngine(entradaMotor, motor);

  // 8. Ranking
  const ranking = construirRanking(decision);

  // 9. Informe
  const informe = construirInforme({ resultados, reglas, decision, ranking });

  return {
    versionFlujo: VERSION_FLUJO,
    generadoEn: opciones.ahora ?? new Date().toISOString(),
    contexto,
    etapas: {
      modulos: resultados,
      perfilFuncional: perfil,
      reglas,
      decisionEngine: { entrada: entradaMotor, ...decision },
      ranking,
    },
    informe,
  };
}

export { MODULOS, IDS_CUESTIONARIOS } from './modulos/registro.js';
export { registrarDecisionEngine, obtenerDecisionEngine } from './decision/decisionEnginePort.js';
export { DecisionEngineReferencia, VERSION_MOTOR_REFERENCIA } from './decision/decisionEngine.js';
export { crearRegistroBaremos } from './normalizacion/baremos.js';
export { BAREMOS_AFISAL } from './normalizacion/afisal.js';
export { datosEntradaDesdeAnalisis } from './entrada.js';
