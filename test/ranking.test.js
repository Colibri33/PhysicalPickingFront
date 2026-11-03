/**
 * @module test/ranking.test
 * @description Pruebas de la recomendación firme y del conjunto de familias empatadas (R-DEC-04) (node --test).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la derivación de la recomendación a partir del ranking del motor.
 * Notas: combina casos sintéticos con una barrida exhaustiva de los 3125 perfiles posibles de cinco capacidades en cinco niveles.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { NIVELES } from '../src/evaluacion/niveles.js';
import { MATRIZ_DEMANDA, CAPACIDADES_MATRIZ } from '../src/evaluacion/decision/matrizDemanda.js';
import { ordenarFamilias } from '../src/evaluacion/decision/compatibilidad.js';
import { construirRanking, textoRecomendacion } from '../src/evaluacion/decision/ranking.js';

/** Convierte la salida de ordenarFamilias a la forma del motor de referencia. */
const comoMotor = (lista) => ({
  salida: {
    compatibilidad: {
      ranking: lista.map(r => ({ id: r.familiaId, porcentaje: r.compatibilidad === null ? null : Math.round(r.compatibilidad * 100), ...r })),
    },
  },
});

/** Entrada sintética de una familia firme. */
const fam = (id, extra = {}) => ({
  id, compatibilidad: 0.75, porcentaje: 75, cobertura: 1,
  carenciasRelevantes: 0, brechasRelevantes: 0, brechasSeveras: 0, firme: true, ...extra,
});
const motor = (...lista) => ({ salida: { compatibilidad: { ranking: lista } } });

test('empate exacto: la recomendación incluye todas las familias empatadas', () => {
  const r = construirRanking(motor(fam('combate_agarre'), fam('deportes_fuerza'), fam('escalada', { compatibilidad: 0.5, porcentaje: 50 })));
  assert.equal(r.recomendada.id, 'combate_agarre');
  assert.deepEqual(r.empatadas.map(f => f.id), ['combate_agarre', 'deportes_fuerza']);
  assert.match(textoRecomendacion(r), /empatadas con 75% de compatibilidad/);
});

test('un criterio de desempate (brechas relevantes) rompe el empate', () => {
  const r = construirRanking(motor(fam('combate_agarre'), fam('deportes_fuerza', { brechasRelevantes: 1 })));
  assert.deepEqual(r.empatadas.map(f => f.id), ['combate_agarre']);
  assert.equal(textoRecomendacion(r), `${r.recomendada.nombre} (75% de compatibilidad)`);
});

test('una familia no firme con el mismo porcentaje no entra en el conjunto', () => {
  const r = construirRanking(motor(fam('combate_agarre'), fam('deportes_fuerza', { firme: false })));
  assert.deepEqual(r.empatadas.map(f => f.id), ['combate_agarre']);
});

test('sin familia firme no hay recomendación ni empatadas', () => {
  const r = construirRanking(motor(fam('combate_agarre', { firme: false })));
  assert.equal(r.recomendada, null);
  assert.deepEqual(r.empatadas, []);
  assert.equal(textoRecomendacion(r), null);
});

test('registros guardados sin `empatadas` siguen dando texto con la recomendada', () => {
  assert.equal(textoRecomendacion({ recomendada: { id: 'danza', nombre: 'Danza', porcentaje: 60 } }), 'Danza (60% de compatibilidad)');
});

test('barrida de los 3125 perfiles: el conjunto empatado es coherente', () => {
  const total = NIVELES.length ** CAPACIDADES_MATRIZ.length;
  let conEmpate = 0;
  for (let n = 0; n < total; n += 1) {
    const niveles = {};
    let resto = n;
    for (const cap of CAPACIDADES_MATRIZ) { niveles[cap] = NIVELES[resto % NIVELES.length]; resto = Math.floor(resto / NIVELES.length); }
    const r = construirRanking(comoMotor(ordenarFamilias(niveles, MATRIZ_DEMANDA)));
    if (!r.recomendada) { assert.deepEqual(r.empatadas, []); continue; }
    assert.equal(r.empatadas[0].id, r.recomendada.id);
    for (const f of r.empatadas) {
      assert.equal(f.firme, true);
      assert.equal(f.compatibilidad, r.recomendada.compatibilidad);
      assert.equal(f.cobertura, r.recomendada.cobertura);
    }
    if (r.empatadas.length > 1) conEmpate += 1;
  }
  assert.ok(conEmpate > 0, 'se esperaban perfiles con empate (la compatibilidad solo toma 6 valores)');
});
