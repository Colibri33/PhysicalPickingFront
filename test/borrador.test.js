/**
 * @module test/borrador.test
 * @description Pruebas de coherencia del análisis demo frente a los validadores de cada módulo.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el contrato entre rellenoDemo y los validadores de completitud.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { generarAnalisisDemo } from '../src/utils/rellenoDemo.js';
import { pendientes } from '../src/logic/parq.js';
import { faltantesIpaq } from '../src/logic/ipaq.js';
import { faltantesPsqi } from '../src/logic/psqi.js';
import { faltantesBreq } from '../src/logic/breq.js';
import { faltantesBarreras } from '../src/logic/barreras.js';
import { esNivelLegerValido } from '../src/logic/modelo.js';
import { ejecutarFlujoEvaluacion } from '../src/evaluacion/index.js';
import { datosEntradaDesdeAnalisis } from '../src/evaluacion/entrada.js';

test('relleno demo: 200 análisis completos y coherentes', () => {
  for (let i = 0; i < 200; i++) {
    const a = generarAnalisisDemo();
    assert.deepEqual(pendientes(a.parq.respuestas), []);
    assert.deepEqual(faltantesIpaq(a.ipaq.respuestas), []);
    assert.deepEqual(faltantesPsqi(a.psqi.respuestas), []);
    assert.equal(faltantesBreq(a.breq.respuestas).length, 0);
    assert.equal(faltantesBarreras(a.barreras.respuestas).length, 0);
    assert.ok(esNivelLegerValido(Number(a.leger.palier)));
    const e = Number(a.participante.edad);
    assert.ok(e >= 18 && e <= 30);
    for (const v of Object.values(a.fisicas)) assert.ok(v >= 0 && v <= 100);
    assert.ok(a.antropometricas.imc > 17 && a.antropometricas.imc < 30);
    assert.ok(a.antropometricas.icc > 0.6 && a.antropometricas.icc < 1);
    const r = ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(a));
    assert.ok(r, 'el motor devuelve resultado');
  }
});
