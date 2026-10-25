/**
 * @module test/caducidad.test
 * @description Pruebas de la caducidad del historial de invitado (node --test).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la regla de caducidad de utils/caducidad.js.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAS_CADUCIDAD_INVITADO, haCaducado, purgarCaducados, diasRestantes, textoCaducidad, instanteGuardado,
} from '../src/utils/caducidad.js';

const DIA = 24 * 60 * 60 * 1000;
const AHORA = 1_790_000_000_000;

test('caducidad: dura 5 días', () => {
  assert.equal(DIAS_CADUCIDAD_INVITADO, 5);
});

test('caducidad: un registro vigente se conserva y a los 5 días exactos caduca', () => {
  assert.equal(haCaducado({ id: AHORA - 4 * DIA }, AHORA), false);
  assert.equal(haCaducado({ id: AHORA - 5 * DIA }, AHORA), true);
  assert.equal(haCaducado({ id: AHORA - 6 * DIA }, AHORA), true);
});

test('caducidad: usa guardadoEn y, si falta, el id (marca de tiempo de creación)', () => {
  assert.equal(instanteGuardado({ id: AHORA - DIA, guardadoEn: AHORA }), AHORA);
  assert.equal(instanteGuardado({ id: AHORA - DIA }), AHORA - DIA);
});

test('caducidad: sin un instante válido se considera caducado', () => {
  for (const r of [{}, { id: 'abc' }, { id: 5 }, null, undefined]) assert.equal(haCaducado(r, AHORA), true);
  assert.equal(diasRestantes({}, AHORA), null);
  assert.equal(textoCaducidad({}, AHORA), '');
});

test('caducidad: purgarCaducados conserva el orden y descarta solo los vencidos', () => {
  const a = { id: AHORA - 1 * DIA, n: 'a' };
  const b = { id: AHORA - 9 * DIA, n: 'b' };
  const c = { id: AHORA - 4 * DIA, n: 'c' };
  assert.deepEqual(purgarCaducados([a, b, c], AHORA).map(r => r.n), ['a', 'c']);
  assert.deepEqual(purgarCaducados(null, AHORA), []);
});

test('caducidad: días restantes redondeados hacia arriba y texto legible', () => {
  assert.equal(diasRestantes({ id: AHORA }, AHORA), 5);
  assert.equal(diasRestantes({ id: AHORA - 1.5 * DIA }, AHORA), 4);
  assert.equal(diasRestantes({ id: AHORA - 4.2 * DIA }, AHORA), 1);
  assert.equal(textoCaducidad({ id: AHORA - 2 * DIA }, AHORA), 'Se borra en 3 días');
  assert.equal(textoCaducidad({ id: AHORA - 4.5 * DIA }, AHORA), 'Se borra hoy');
});
