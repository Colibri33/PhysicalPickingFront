/**
 * @module test/adaptacionPrevia
 * @description Pruebas de la regla R-DEC-05: actividad física baja (IPAQ) antepone una fase de adaptación a la recomendación firme.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirPlanAdaptacion } from '../src/evaluacion/reglas/planAdaptacion.js';

const rankingFirme = { recomendada: { id: 'atletismo_fondo' }, familias: [{ id: 'atletismo_fondo', firme: true }], sinFamiliaCompatible: false };

test('IPAQ Bajo con recomendación firme: plan de adaptación previa, sin tocar el ranking', () => {
  const plan = construirPlanAdaptacion({ ranking: rankingFirme, capacidades: {}, ipaq: 'Bajo' });
  assert.equal(plan.aplica, true);
  assert.equal(plan.tipo, 'adaptacion_previa');
  assert.equal(plan.regla, 'R-DEC-05');
  assert.match(plan.motivo, /poca actividad física/);
  assert.ok(plan.pautasGenerales.length > 0);
  assert.equal(rankingFirme.recomendada.id, 'atletismo_fondo');
});

test('IPAQ Moderado o Alto con recomendación firme: no aplica', () => {
  for (const ipaq of ['Moderado', 'Alto', null]) {
    assert.equal(construirPlanAdaptacion({ ranking: rankingFirme, capacidades: {}, ipaq }).aplica, false);
  }
});

test('la valoración médica tiene prioridad sobre la adaptación previa', () => {
  const plan = construirPlanAdaptacion({ ranking: { ...rankingFirme, bloqueoMedico: { mensaje: 'x', condiciones: [] } }, capacidades: {}, ipaq: 'Bajo' });
  assert.equal(plan.tipo, 'valoracion_medica');
});
