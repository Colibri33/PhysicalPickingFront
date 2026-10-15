/* ═══════════════════════════════════════════════════════════════
   evaluacion/decision/decisionEnginePort.js
   Etapa 7: DecisionEngine (puerto de integracion).

   El motor definitivo NO esta en este repositorio. Este puerto:
   1. construye la entrada del motor UNICAMENTE con datos ya
      evaluados/normalizados del perfil funcional (nunca respuestas
      crudas), con la forma que espera DecisionEngine.evaluar():
        { capacidades, ipaq, psqi, parq, antecedentes, experiencias,
          leger, informativas }
   2. valida esa entrada contra el contrato,
   3. ejecuta el motor registrado o, si no hay, devuelve
      'pendiente_integracion' (sin inventar resultados).

   Para integrar: registrarDecisionEngine(new DecisionEngine(config))
   o pasar { decisionEngine } a ejecutarFlujoEvaluacion().
   ═══════════════════════════════════════════════════════════════ */

import { esNivelValido } from '../niveles.js';
import { CAPACIDADES } from '../modulos/fisicas.js';

let motorRegistrado = null;

export function registrarDecisionEngine(motor) {
  if (motor !== null && typeof motor?.evaluar !== 'function') {
    throw new Error('El DecisionEngine debe exponer evaluar(entrada).');
  }
  motorRegistrado = motor;
}

export function obtenerDecisionEngine() {
  return motorRegistrado;
}

const CATEGORIAS_IPAQ = ['Bajo', 'Moderado', 'Alto'];

export function construirEntradaDecisionEngine(perfil, reglas) {
  const capacidades = {};
  for (const c of CAPACIDADES) {
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

export function validarEntradaDecisionEngine(entrada) {
  const errores = [];
  for (const c of CAPACIDADES) {
    if (!(c.id in entrada.capacidades)) errores.push(`Falta la capacidad "${c.id}".`);
    else if (!esNivelValido(entrada.capacidades[c.id])) errores.push(`Nivel invalido para "${c.id}".`);
  }
  if (entrada.ipaq !== null && !CATEGORIAS_IPAQ.includes(entrada.ipaq)) errores.push(`Categoria IPAQ invalida "${entrada.ipaq}".`);
  if (!Array.isArray(entrada.experiencias)) errores.push('experiencias debe ser una lista.');
  return { ok: errores.length === 0, errores };
}

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
