import test from 'node:test';
import assert from 'node:assert/strict';
import { generarAnalisisDemo } from '../src/utils/rellenoDemo.js';
import { ejecutarFlujoEvaluacion } from '../src/evaluacion/index.js';
import { datosEntradaDesdeAnalisis } from '../src/evaluacion/entrada.js';
import { construirResumenIA } from '../src/ia/resumenIA.js';

test('resumen IA: completo, pequeño y sin nombre', () => {
  const a = generarAnalisisDemo();
  const r = construirResumenIA(a, ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(a)));
  const json = JSON.stringify(r);
  assert.ok(!json.includes(a.participante.nombre));
  assert.ok(json.length < 12000);
  assert.ok(Object.keys(r.capacidadesFisicas).length >= 4);
  assert.ok(r.recomendacion.top5.length > 0);
  assert.ok(r.estilosYHabitos.ipaq && r.estilosYHabitos.psqi && r.estilosYHabitos.motivacionBreq);
});

import { parseInterpretacion } from '../src/ia/parseInterpretacion.js';
test('parseInterpretacion: JSON, cercas de código y respaldo en texto plano', () => {
  const json = { lectura: 'Perfil equilibrado.', fortalezas: ['a', 'b'], mejorar: ['c'], deportes: [{ nombre: 'Ciclismo', porcentaje: '60', razon: 'x' }], precauciones: [] };
  const r = parseInterpretacion('```json\n' + JSON.stringify(json) + '\n```');
  assert.equal(r.resumen, 'Perfil equilibrado.');
  assert.equal(r.deportes[0].porcentaje, 60);
  assert.deepEqual(r.fuertes.map(x => x.detalle), ['a', 'b']);
  assert.equal(parseInterpretacion('Texto libre sin JSON').textoPlano, 'Texto libre sin JSON');
  assert.equal(parseInterpretacion('{roto').textoPlano, '{roto');
});

test('parseInterpretacion: formato nuevo y compatibilidad con el anterior', () => {
  const n = parseInterpretacion(JSON.stringify({ resumen: 'Buen perfil.', fuertes: [{ titulo: 'Resistencia', detalle: 'Muy alta' }], mejorar: [{ titulo: 'Flexibilidad', detalle: 'Estira' }], deportes: [{ nombre: 'Ciclismo', porcentaje: 80, razon: 'x' }], precaucion: 'Cuida el sueño' }));
  assert.equal(n.fuertes[0].titulo, 'Resistencia');
  assert.equal(n.precaucion, 'Cuida el sueño');
  const v = parseInterpretacion(JSON.stringify({ lectura: 'Perfil.', fortalezas: ['a'], mejorar: ['b'], precauciones: ['c'], deportes: [] }));
  assert.equal(v.resumen, 'Perfil.');
  assert.deepEqual(v.fuertes, [{ titulo: '', detalle: 'a' }]);
  assert.equal(v.precaucion, 'c');
});
