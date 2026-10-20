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
