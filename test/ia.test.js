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
  assert.equal(r.lectura, 'Perfil equilibrado.');
  assert.equal(r.deportes[0].porcentaje, 60);
  assert.deepEqual(r.fortalezas, ['a', 'b']);
  assert.equal(parseInterpretacion('Texto libre sin JSON').textoPlano, 'Texto libre sin JSON');
  assert.equal(parseInterpretacion('{roto').textoPlano, '{roto');
});
