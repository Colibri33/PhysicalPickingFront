/* Pruebas de la regla de compatibilidad + Mitchell (node --test).
   Sin números sobre niveles: todo es cumple/no cumple ordinal. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { NIVELES } from '../src/evaluacion/niveles.js';
import {
  MATRIZ_DEMANDA, CUMPLE_DESDE, capacidadesRelevantes,
} from '../src/evaluacion/decision/matrizDemanda.js';
import {
  cumpleDemanda, esBrechaSevera, evaluarFamilia, ordenarFamilias,
} from '../src/evaluacion/decision/compatibilidad.js';
import { FAMILIAS_DEPORTIVAS } from '../src/evaluacion/decision/familias.js';

test('la matriz cubre las 13 familias confirmadas', () => {
  assert.equal(MATRIZ_DEMANDA.length, 13);
  for (const f of FAMILIAS_DEPORTIVAS) assert.ok(MATRIZ_DEMANDA.some(m => m.id === f.id), f.id);
});

test('cumpleDemanda: Muy bajo no cumple nada; Muy alto cumple todo', () => {
  for (const d of Object.keys(CUMPLE_DESDE)) {
    assert.equal(cumpleDemanda('Muy bajo', d), false);
    assert.equal(cumpleDemanda('Muy alto', d), true);
  }
  assert.equal(cumpleDemanda('Bajo', 'Baja'), true);
  assert.equal(cumpleDemanda('Bajo', 'Media'), false);
  assert.equal(cumpleDemanda('Medio', 'Media'), true);
  assert.equal(cumpleDemanda('Medio', 'Alta'), false);
  assert.equal(cumpleDemanda('Alto', 'Alta'), true);
  assert.equal(cumpleDemanda('Alto', 'Muy alta'), false);
  assert.equal(cumpleDemanda(null, 'Baja'), null);
});

test('relevancia Mitchell v1: C → vo2max, III → fuerza, IB/IIB → ninguna', () => {
  const porId = Object.fromEntries(MATRIZ_DEMANDA.map(f => [f.id, f]));
  assert.deepEqual(capacidadesRelevantes(porId.natacion).sort(), ['vo2max']); // IIC
  assert.deepEqual(capacidadesRelevantes(porId.escalada).sort(), ['fuerza']); // IIIA
  assert.deepEqual(capacidadesRelevantes(porId.voleibol), []); // IB
  assert.deepEqual(capacidadesRelevantes(porId.danza), []); // IIB
});

test('Escalada: 4/4 con VO2 sin dato (compat 1, cobertura 0.8, sin brechas)', () => {
  const fam = MATRIZ_DEMANDA.find(f => f.id === 'escalada');
  const r = evaluarFamilia(
    { fuerza: 'Muy alto', fuerza_explosiva: 'Alto', vo2max: null, flexibilidad: 'Alto', equilibrio: 'Muy alto' }, fam);
  assert.equal(r.cumplidas, 4);
  assert.equal(r.evaluadas, 4);
  assert.equal(r.compatibilidad, 1);
  assert.equal(r.cobertura, 0.8);
  assert.deepEqual(r.brechas, []);
  // VO2 sin dato en escalada (demanda Baja, no relevante IIIA): sigue firme.
  assert.equal(r.firme, true);
  assert.deepEqual(r.carenciasRelevantes, 0);
});

test('fondo con VO2 sin dato: 100% de lo evaluado pero no firme (carencia definitoria)', () => {
  const fam = MATRIZ_DEMANDA.find(f => f.id === 'atletismo_fondo');
  const r = evaluarFamilia(
    { fuerza: 'Bajo', fuerza_explosiva: 'Alto', vo2max: null, flexibilidad: 'Medio', equilibrio: 'Medio' }, fam);
  assert.equal(r.compatibilidad, 1);
  assert.equal(r.firme, false);
  assert.equal(r.carenciasRelevantes, 1);
  assert.deepEqual(r.carencias, [{ capacidad: 'vo2max', demanda: 'Muy alta', relevanteMitchell: true, demandaAlta: true }]);
});

test('empate al 100% sin VO2: gana la firme (velocidad sobre fondo/ciclismo)', () => {
  const niveles = {
    fuerza: 'Medio', fuerza_explosiva: 'Muy alto', vo2max: null,
    flexibilidad: 'Medio', equilibrio: 'Medio',
  };
  const ord = ordenarFamilias(niveles, MATRIZ_DEMANDA);
  const top3 = ord.slice(0, 3).map(r => r.familiaId);
  // Las firmes van primero: velocidad (firme), voleibol (firme), deportes_fuerza (firme).
  // Fondo y ciclismo son provisionales (carencia en vo2max Muy alta) y van después.
  assert.deepEqual(top3, ['atletismo_velocidad', 'voleibol', 'deportes_fuerza']);
  assert.equal(ord[0].firme, true);
  // Las provisionales (fondo, ciclismo) no están entre las 3 primeras firmes.
  const provisionalEnTop3 = ord.slice(0, 3).some(r => r.firme === false);
  assert.equal(provisionalEnTop3, false);
});

test('sin ningún dato: compatibilidad null, cobertura 0', () => {
  const r = evaluarFamilia(
    { fuerza: null, fuerza_explosiva: null, vo2max: null, flexibilidad: null, equilibrio: null },
    MATRIZ_DEMANDA[0]);
  assert.equal(r.compatibilidad, null);
  assert.equal(r.cobertura, 0);
});

test('brecha severa: demanda Muy alta en nivel Bajo', () => {
  assert.equal(esBrechaSevera('Bajo', 'Muy alta'), true);
  assert.equal(esBrechaSevera('Medio', 'Muy alta'), false);
  assert.equal(esBrechaSevera('Bajo', 'Media'), false);
});

test('desempate Mitchell: igual compatibilidad, gana la de menos brechas relevantes', () => {
  // Perfil: todo Alto salvo vo2max Bajo y fuerza Bajo.
  const niveles = { fuerza: 'Bajo', fuerza_explosiva: 'Alto', vo2max: 'Bajo', flexibilidad: 'Alto', equilibrio: 'Alto' };
  const nat = evaluarFamilia(niveles, MATRIZ_DEMANDA.find(f => f.id === 'natacion'));
  const ord = ordenarFamilias(niveles, MATRIZ_DEMANDA);
  assert.ok(nat.brechasRelevantes >= 1);
  // Ciclismo (IIIC) exige VO2 Muy alta: misma o menor compat que natación con brecha relevante.
  const cic = ord.find(r => r.familiaId === 'ciclismo');
  assert.ok(cic.brechasRelevantes >= 1);
  // El orden respeta: compat ↓, luego brechas relevantes ↑.
  for (let i = 1; i < ord.length; i++) {
    const a = ord[i - 1];
    const b = ord[i];
    assert.ok(a.compatibilidad >= b.compatibilidad, `${a.familiaId} antes que ${b.familiaId}`);
  }
});

test('NIVELES tiene los 5 niveles usados por la regla', () => {
  assert.deepEqual([...NIVELES], ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto']);
});
