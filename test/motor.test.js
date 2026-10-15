/* Pruebas del DecisionEngine de referencia v1 (node --test). */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ejecutarFlujoEvaluacion, obtenerDecisionEngine, registrarDecisionEngine,
  DecisionEngineReferencia, MODULOS,
} from '../src/evaluacion/index.js';
import { FAMILIAS_DEPORTIVAS } from '../src/evaluacion/decision/familias.js';

const AHORA = '2026-10-06T00:00:00.000Z';
const participante = { nombre: 'Prueba', edad: 22, genero: 'femenino', perfil: 'general', deporte: 'ninguno' };
const datos = {
  participante,
  realesF: { fuerza: '100', fuerzaExp: '60', flexibilidad: '50', equilibrio: '2' },
  antropometricas: {},
  cuestionarios: { parq: { p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false } },
};

test('hay un motor de referencia registrado por defecto', () => {
  assert.ok(obtenerDecisionEngine() instanceof DecisionEngineReferencia);
});

test('flujo completo por defecto: motor ejecutado con ranking de 13 familias', () => {
  const r = ejecutarFlujoEvaluacion(datos, { ahora: AHORA });
  assert.equal(r.etapas.decisionEngine.estado, 'ejecutado');
  assert.equal(r.etapas.ranking.estado, 'completo');
  assert.equal(r.etapas.ranking.familias.length, 13);
  for (const f of FAMILIAS_DEPORTIVAS) {
    assert.ok(r.etapas.ranking.familias.some(x => x.id === f.id), f.id);
  }
  assert.ok(!r.informe.pendientesConfiguracion.includes('Integrar la logica definitiva del DecisionEngine.'));
});

test('porcentaje = compatibilidad × 100; compatibilidad null → porcentaje null', () => {
  const r = ejecutarFlujoEvaluacion(datos, { ahora: AHORA });
  for (const f of r.etapas.ranking.familias) {
    if (f.compatibilidad === null) assert.equal(f.porcentaje, null);
    else assert.equal(f.porcentaje, Math.round(f.compatibilidad * 100));
  }
});

test('decisionEngine: null fuerza pendiente_integracion', () => {
  const r = ejecutarFlujoEvaluacion(datos, { ahora: AHORA, decisionEngine: null });
  assert.equal(r.etapas.decisionEngine.estado, 'pendiente_integracion');
  assert.equal(r.etapas.ranking.familias, null);
});

test('el motor es sustituible y se restaura', () => {
  const anterior = obtenerDecisionEngine();
  const falso = { evaluar: () => { throw new Error('falla'); } };
  registrarDecisionEngine(falso);
  const r = ejecutarFlujoEvaluacion(datos, { ahora: AHORA });
  assert.equal(r.etapas.decisionEngine.estado, 'error');
  registrarDecisionEngine(anterior);
  assert.equal(obtenerDecisionEngine(), anterior);
});

test('MODULOS sigue expuesto para auditoria', () => {
  assert.ok(Array.isArray(MODULOS) && MODULOS.length > 0);
});
