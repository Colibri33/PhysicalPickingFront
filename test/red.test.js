/**
 * @module test/red.test
 * @description Pruebas de errorRedAmigable.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la traducción de errores de red a mensajes legibles.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { errorRedAmigable } from '../src/utils/red.js';

describe('errorRedAmigable', () => {
  it('traduce Failed to fetch a mensaje entendible', () => {
    const msg = errorRedAmigable(new TypeError('Failed to fetch'));
    assert.match(msg, /conexi/i);
    assert.doesNotMatch(msg, /fetch/i);
  });

  it('distingue timeout (AbortError) de corte total', () => {
    const err = new Error('Timeout');
    err.name = 'AbortError';
    assert.match(errorRedAmigable(err), /tardando en responder/i);
  });

  it('conserva errores funcionales (credenciales, validación)', () => {
    assert.equal(errorRedAmigable(new Error('Email o contrasena incorrectos.')), 'Email o contrasena incorrectos.');
  });

  it('tolera valores nulos', () => {
    assert.ok(errorRedAmigable(null).length > 0);
    assert.ok(errorRedAmigable({}).length > 0);
  });
});
