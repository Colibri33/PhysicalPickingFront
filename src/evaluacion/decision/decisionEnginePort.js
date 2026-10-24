/**
 * @module evaluacion/decision/decisionEnginePort
 * @description Puerto de integración del DecisionEngine (etapa 7): construye y valida la entrada, y ejecuta el motor registrado.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el contrato de entrada y ejecución del motor.
 *  - O (Abierto/Cerrado): cualquier motor que implemente evaluar(entrada) se integra sin modificar el puerto.
 *  - L (Sustitución de Liskov): los motores registrados son intercambiables.
 *  - I (Segregación de interfaces): el motor solo debe exponer evaluar(entrada).
 *  - D (Inversión de dependencias): el flujo depende de este puerto, no de un motor concreto.
 * Notas: el motor definitivo no reside en este repositorio. La entrada se arma solo con datos normalizados del perfil funcional (nunca
 * respuestas crudas): { capacidades, sexo, ipaq, psqi, parq, antecedentes, experiencias, leger, informativas }. Sin motor registrado se
 * devuelve 'pendiente_integracion' sin inventar resultados. Integración: registrarDecisionEngine(motor) o { decisionEngine } en ejecutarFlujoEvaluacion().
 */

import { esNivelValido } from '../niveles.js';
import { CAPACIDADES_FISICAS } from '../capacidades.js';

let motorRegistrado = null;

/** Registra el motor de decisión global.
 * @param {{evaluar: Function}|null} motor - motor o null para quitarlo.
 * @throws {Error} si no expone evaluar(entrada). */
export function registrarDecisionEngine(motor) {
  if (motor !== null && typeof motor?.evaluar !== 'function') {
    throw new Error('El DecisionEngine debe exponer evaluar(entrada).');
  }
  motorRegistrado = motor;
}

/** Obtiene el motor registrado.
 * @returns {Object|null} motor o null. */
export function obtenerDecisionEngine() {
  return motorRegistrado;
}

const CATEGORIAS_IPAQ = ['Bajo', 'Moderado', 'Alto'];

/** Construye la entrada del motor a partir del perfil y las reglas de seguridad; anula VO2máx si la prueba máxima no está autorizada.
 * @param {Object} perfil - perfil funcional.
 * @param {Object} reglas - resultado de aplicarReglasPreparacionSeguridad.
 * @returns {Object} entrada del motor. */
export function construirEntradaDecisionEngine(perfil, reglas) {
  const capacidades = {};
  for (const c of CAPACIDADES_FISICAS) {
    const nivel = perfil.compatibilidad.capacidades[c.id]?.nivel ?? null;
    capacidades[c.id] = c.requiereAutorizacion === 'prueba_maxima' && !reglas.pruebaMaxima.autorizada ? null : nivel;
  }
  const parq = perfil.seguridad.parq;
  return {
    capacidades,
    sexo: perfil.participante.sexo,
    ipaq: perfil.preparacion.ipaq?.categoria ?? null,
    psqi: perfil.preparacion.psqi?.puntajeGlobal != null ? { puntajeGlobal: perfil.preparacion.psqi.puntajeGlobal } : null,
    parq: parq ? { respuestas: parq.respuestasGenerales, clasificacion: parq.clasificacion, categoriasPositivas: parq.categoriasPositivas } : null,
    antecedentes: perfil.antecedentes,
    experiencias: perfil.experiencia?.experiencias ?? [],
    leger: { autorizado: reglas.pruebaMaxima.autorizada, aplicado: reglas.pruebaMaxima.legerAplicado },
    informativas: perfil.informativas,
  };
}

/** Valida la entrada contra el contrato del motor.
 * @param {Object} entrada - entrada del motor.
 * @returns {{ok: boolean, errores: string[]}} resultado de la validación. */
export function validarEntradaDecisionEngine(entrada) {
  const errores = [];
  for (const c of CAPACIDADES_FISICAS) {
    if (!(c.id in entrada.capacidades)) errores.push(`Falta la capacidad "${c.id}".`);
    else if (!esNivelValido(entrada.capacidades[c.id])) errores.push(`Nivel invalido para "${c.id}".`);
  }
  if (entrada.ipaq !== null && !CATEGORIAS_IPAQ.includes(entrada.ipaq)) errores.push(`Categoria IPAQ invalida "${entrada.ipaq}".`);
  if (!Array.isArray(entrada.experiencias)) errores.push('experiencias debe ser una lista.');
  return { ok: errores.length === 0, errores };
}

/** Ejecuta el motor sobre una entrada válida sin lanzar excepciones.
 * @param {Object} entrada - entrada del motor.
 * @param {Object|null} [motor] - motor a usar; por defecto el registrado.
 * @returns {{estado: string, salida: Object|null}} estado ('ejecutado', 'pendiente_integracion', 'entrada_invalida' o 'error') y salida. */
export function ejecutarDecisionEngine(entrada, motor = motorRegistrado) {
  const contrato = validarEntradaDecisionEngine(entrada);
  if (!contrato.ok) return { estado: 'entrada_invalida', errores: contrato.errores, salida: null };
  if (!motor) {
    return {
      estado: 'pendiente_integracion',
      salida: null,
      mensaje: 'DecisionEngine definitivo no integrado: no se calcula compatibilidad ni ranking.',
    };
  }
  try {
    return { estado: 'ejecutado', salida: motor.evaluar(entrada) };
  } catch (e) {
    return { estado: 'error', salida: null, errores: [String(e?.message ?? e)] };
  }
}
