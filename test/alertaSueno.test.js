/**
 * @module test/alertaSueno
 * @description Pruebas de la regla R-SEG-06: PSQI global de 5 o más genera alerta de calidad de sueño.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertaCalidadSueno } from '../src/evaluacion/reglas/preparacionSeguridad.js';

test('PSQI 5 o más: alerta de sueño con puntaje y categoría', () => {
  const a = alertaCalidadSueno({ puntajeGlobal: 9, categoria: 'Merece atención y tratamiento médico' });
  assert.equal(a.codigo, 'SUENO_DEFICIENTE');
  assert.equal(a.regla, 'R-SEG-06');
  assert.equal(a.severidad, 'precaucion');
  assert.match(a.mensaje, /PSQI 9\/21/);
  assert.match(a.mensaje, /lesiones/);
});

test('PSQI menor a 5 o sin dato: no hay alerta', () => {
  assert.equal(alertaCalidadSueno({ puntajeGlobal: 4, categoria: 'Sin problema de sueño' }), null);
  assert.equal(alertaCalidadSueno(null), null);
});
