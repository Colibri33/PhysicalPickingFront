/**
 * @module evaluacion/index
 * @description Orquestador del flujo de evaluación: datos, validación, evaluación, normalización, perfil, reglas, motor, ranking e informe.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el orden y el encadenamiento de las etapas.
 *  - O (Abierto/Cerrado): módulos, baremos y motor se incorporan por registro o inyección sin modificar el orquestador.
 *  - D (Inversión de dependencias): baremos y DecisionEngine se inyectan mediante `opciones`; el flujo depende del puerto, no del motor.
 * Notas: etapas: 1 datos ingresados; 2 validación; 3 evaluación; 4 normalización; 5 perfil funcional; 6 reglas de preparación y seguridad;
 * 7 DecisionEngine; 8 ranking de las 13 familias; 9 informe. Función pura: misma entrada y recursos producen la misma salida; no usa React, DOM ni red.
 * Sin baremos o motor inyectados, lo que depende de ellos queda como pendiente.
 */

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
import { construirPlanAdaptacion } from './reglas/planAdaptacion.js';
import { construirInforme } from './informe/construirInforme.js';

// Motor de referencia por defecto; se sustituye con registrarDecisionEngine() o { decisionEngine } (null fuerza 'pendiente_integracion').
if (!obtenerDecisionEngine()) {
  registrarDecisionEngine(new DecisionEngineReferencia());
}

/** Versión del flujo de evaluación. */
export const VERSION_FLUJO = '0.1.0';

/** Deriva el contexto (sexo y edad) de los datos del participante.
 * @param {{genero?: string, edad?: number|string}} participante - datos del participante.
 * @returns {{sexo: string|null, edad: number|null}} contexto. */
export function contextoDesdeParticipante(participante) {
  const edad = Number(participante?.edad);
  return {
    sexo: participante?.genero || null,
    edad: Number.isFinite(edad) ? edad : null,
  };
}

/** Ejecuta el flujo completo de evaluación.
 * @param {{participante: Object, realesF: Object, antropometricas: Object, cuestionarios: Object}} datosIngresados - datos de entrada.
 * @param {Object} [opciones] - recursos inyectables.
 * @param {Map|Object[]} [opciones.baremos] - registro o lista de baremos; por defecto AFISAL y Léger (`[]` ejecuta sin baremos).
 * @param {{evaluar: Function}|null} [opciones.decisionEngine] - motor de decisión.
 * @param {string} [opciones.ahora] - marca de tiempo ISO fija.
 * @returns {Object} resultado con versión, contexto, etapas e informe. */
export function ejecutarFlujoEvaluacion(datosIngresados, opciones = {}) {
  // 1. Datos ingresados (copia para no mutar la entrada)
  const datos = clonar(datosIngresados ?? {});
  const contexto = contextoDesdeParticipante(datos.participante);
  const baremos = opciones.baremos instanceof Map ? opciones.baremos : crearRegistroBaremos(opciones.baremos ?? [...BAREMOS_AFISAL, ...BAREMOS_LEGER]);

  // 2-4. Validación, evaluación y normalización por módulo
  const resultados = {};
  for (const modulo of MODULOS) {
    resultados[modulo.id] = ejecutarModulo(modulo, datos, contexto, { baremos });
  }

  // 5. Perfil funcional (solo datos normalizados)
  const perfil = construirPerfilFuncional(resultados, contexto);

  // 6. Reglas de preparación y seguridad
  const reglas = aplicarReglasPreparacionSeguridad(perfil);

  // 7. DecisionEngine
  const motor = 'decisionEngine' in opciones ? opciones.decisionEngine : obtenerDecisionEngine();
  const entradaMotor = construirEntradaDecisionEngine(perfil, reglas);
  const decision = ejecutarDecisionEngine(entradaMotor, motor);

  // 8. Ranking
  const ranking = construirRanking(decision);

  // 8b. Estado de preparación cuando ninguna familia es firme (R-DEC-03)
  const planAdaptacion = construirPlanAdaptacion({ ranking, capacidades: entradaMotor.capacidades });

  // 9. Informe
  const informe = construirInforme({ resultados, reglas, decision, ranking, planAdaptacion });

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
      planAdaptacion,
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
