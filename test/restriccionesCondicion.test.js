/**
 * @module test/restriccionesCondicion.test
 * @description Pruebas de la regla R-SEG-05: efecto de cada condición del PAR-Q+ sobre las familias recomendables (node --test).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la tabla condición → efecto aprobada por el autor.
 *  - D (Inversión de dependencias): los conjuntos esperados se derivan a mano de la matriz de demandas y no del código bajo prueba.
 * Notas: cada fila de la tabla tiene su prueba. Familias esperadas (matriz de capacidades.xlsx): cardiovascular = Mitchell dinámico C o estático III
 * o demanda aeróbica Alta o Muy alta;
 * respiratoria = demanda aeróbica Alta o Muy alta; musculoesquelética = fuerza explosiva Alta o Muy alta; neurológica = equilibrio o explosiva
 * Alta o Muy alta; conmoción = contacto y equipo.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generarAnalisisDemo } from '../src/utils/rellenoDemo.js';
import { parqCon } from './ayudas/parq.js';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../src/evaluacion/index.js';
import { construirRanking, etiquetaNoFirme, textoMotivosNoFirme } from '../src/evaluacion/decision/ranking.js';
import { construirPlanAdaptacion } from '../src/evaluacion/reglas/planAdaptacion.js';
import { aplicarRestriccionesPorCondicion } from '../src/evaluacion/reglas/restriccionesPorCondicion.js';

/** Ejecuta el flujo con un participante demo y el PAR-Q+ dado. */
function flujoCon(...si) {
  const analisis = generarAnalisisDemo(() => 0.6, 'masculino');
  analisis.parq = { respuestas: parqCon(...si), detalles: {} };
  return ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis));
}

// Familias que quedaron restringidas en el ranking.
const restringidas = (flujo) => flujo.etapas.ranking.familias
  .filter(f => f.motivosNoFirme.some(m => m.tipo === 'restriccion_seguridad')).map(f => f.id).sort();

/** Misma salida del motor sin aplicar R-SEG-05, para comparar. */
const sinRegla = (flujo) => construirRanking(flujo.etapas.decisionEngine, null);

const CARDIOVASCULAR = ['combate_agarre', 'combate_golpeo', 'ciclismo', 'deportes_equipo', 'deportes_fuerza', 'escalada', 'natacion', 'raqueta', 'senderismo_montanismo', 'atletismo_fondo', 'atletismo_velocidad'].sort();
const RESPIRATORIA = ['deportes_equipo', 'natacion', 'ciclismo', 'atletismo_fondo', 'atletismo_velocidad', 'senderismo_montanismo'].sort();
const MUSCULOESQUELETICA = ['deportes_equipo', 'voleibol', 'atletismo_velocidad', 'combate_golpeo', 'combate_agarre', 'raqueta', 'tenis_de_mesa', 'danza', 'deportes_fuerza', 'escalada'].sort();
const NEUROLOGICA = [...MUSCULOESQUELETICA, 'senderismo_montanismo'].sort();
const CONMOCION = ['combate_golpeo', 'combate_agarre', 'deportes_equipo'].sort();

test('sin condiciones positivas no se restringe ninguna familia (regresión)', () => {
  const f = flujoCon();
  assert.deepEqual(restringidas(f), []);
  assert.equal(f.etapas.ranking.bloqueoMedico, null);
  assert.deepEqual(f.etapas.ranking.familias.map(x => x.id), sinRegla(f).familias.map(x => x.id));
});

for (const [nombre, ids, esperadas] of [
  ['cardíaca (c3)', ['c3'], CARDIOVASCULAR],
  ['cardíaca (c3) con una subpregunta en Sí', ['c3', 'c3a'], CARDIOVASCULAR],
  ['hipertensión (c4)', ['c4'], CARDIOVASCULAR],
  ['hipertensión pulmonar (c7d)', ['c7', 'c7d'], CARDIOVASCULAR],
]) {
  test(`${nombre}: quedan no recomendables las familias de carga cardiovascular alta`, () => {
    const f = flujoCon(...ids);
    assert.deepEqual(restringidas(f), esperadas);
    // Quedan voleibol, danza y tenis de mesa (IB, VO2 Baja); atletismo de velocidad sale por su demanda aeróbica Muy alta en la matriz, no por Mitchell (IIB).
    for (const permitida of ['voleibol', 'danza', 'tenis_de_mesa']) assert.ok(!restringidas(f).includes(permitida));
    const velocidad = f.etapas.ranking.familias.find(x => x.id === 'atletismo_velocidad').motivosNoFirme.find(m => m.tipo === 'restriccion_seguridad');
    assert.equal(velocidad.motivo, 'demanda aeróbica Alta o Muy alta');
    const natacion = f.etapas.ranking.familias.find(x => x.id === 'natacion').motivosNoFirme.find(m => m.tipo === 'restriccion_seguridad');
    assert.match(natacion.motivo, /carga cardiovascular alta/);
  });
}

test('respiratoria o asma (c7): solo las familias con demanda aeróbica Alta o Muy alta, y voleibol y raqueta siguen disponibles', () => {
  const f = flujoCon('c7', 'c7c');
  assert.deepEqual(restringidas(f), RESPIRATORIA);
  // Familia del ranking por id.
  const fam = (id) => f.etapas.ranking.familias.find(x => x.id === id);
  assert.ok(!fam('voleibol').motivosNoFirme.some(m => m.tipo === 'restriccion_seguridad'));
  assert.ok(!fam('raqueta').motivosNoFirme.some(m => m.tipo === 'restriccion_seguridad'));
  assert.ok(!fam('tenis_de_mesa').motivosNoFirme.some(m => m.tipo === 'restriccion_seguridad'));
});

for (const [nombre, ids] of [['artritis, osteoporosis o columna (c1)', ['c1', 'c1a']], ['Down con problema de espalda (c6b)', ['c6', 'c6b']]]) {
  test(`${nombre}: familias con fuerza explosiva Alta o Muy alta no recomendables`, () => {
    assert.deepEqual(restringidas(flujoCon(...ids)), MUSCULOESQUELETICA);
  });
}

for (const [nombre, ids] of [['lesión medular (c8)', ['c8', 'c8a']], ['accidente cerebrovascular (c9)', ['c9', 'c9a']]]) {
  test(`${nombre}: familias con equilibrio o fuerza explosiva Alta o Muy alta no recomendables`, () => {
    assert.deepEqual(restringidas(flujoCon(...ids)), NEUROLOGICA);
  });
}

test('conmoción cerebral (c10a): familias de contacto y deportes de equipo no recomendables', () => {
  assert.deepEqual(restringidas(flujoCon('c10', 'c10a')), CONMOCION);
});

test('cáncer, metabólica, salud mental y otras (c10b, c10c): solo alerta, sin cambiar el ranking', () => {
  const casos = [
    [['c2'], 'PARQ_ALERTA_CANCER'],
    [['c2', 'c2a'], 'PARQ_ALERTA_CANCER'],
    [['c5', 'c5b'], 'PARQ_ALERTA_METABOLICA'],
    [['c6', 'c6a'], 'PARQ_ALERTA_SALUD_MENTAL'],
    [['c10', 'c10b'], 'PARQ_ALERTA_OTRAS'],
    [['c10', 'c10c'], 'PARQ_ALERTA_OTRAS'],
  ];
  for (const [ids, codigo] of casos) {
    const f = flujoCon(...ids);
    assert.ok(f.informe.seguridad.alertas.some(a => a.codigo === codigo), `${ids}: falta ${codigo}`);
    assert.deepEqual(restringidas(f), [], `${ids}: no debe restringir familias`);
    const base = sinRegla(f);
    assert.deepEqual(f.etapas.ranking.familias.map(x => [x.id, x.porcentaje, x.firme]), base.familias.map(x => [x.id, x.porcentaje, x.firme]));
  }
});

for (const id of ['g2', 'g3']) {
  test(`dolor en el pecho o desmayo (${id}): ninguna familia se recomienda hasta valoración médica`, () => {
    const f = flujoCon(id);
    const r = f.etapas.ranking;
    assert.equal(r.recomendada, null);
    assert.deepEqual(r.empatadas, []);
    assert.ok(r.bloqueoMedico);
    assert.ok(r.familias.every(x => x.firme === false && x.motivosNoFirme.some(m => m.tipo === 'valoracion_medica')));
    assert.equal(f.etapas.planAdaptacion.tipo, 'valoracion_medica');
    assert.equal(f.informe.recomendacion.bloqueoMedico.condiciones[0], id.replace('g', 'p'));
    assert.ok(f.informe.seguridad.alertas.some(a => a.codigo === 'PARQ_VALORACION_MEDICA'));
    assert.equal(etiquetaNoFirme(r.familias[0]), 'restricción de seguridad');
  });
}

test('las familias no restringidas conservan su porcentaje y las restringidas pasan al final de las firmes', () => {
  const f = flujoCon('c7', 'c7c');
  const base = sinRegla(f);
  const r = f.etapas.ranking;
  for (const x of r.familias.filter(y => !restringidas(f).includes(y.id))) {
    assert.equal(x.porcentaje, base.familias.find(b => b.id === x.id).porcentaje);
  }
  const primeraNoFirme = r.familias.findIndex(x => x.firme === false);
  assert.ok(r.familias.slice(primeraNoFirme).every(x => x.firme === false), 'las no firmes van después de las firmes');
  assert.deepEqual(r.familias.map(x => x.posicion), r.familias.map((_, i) => i + 1));
  assert.ok(r.empatadas.every(x => x.firme !== false));
});

test('la restricción se explica con la condición y el criterio', () => {
  const f = flujoCon('c7', 'c7c');
  const natacion = f.etapas.ranking.familias.find(x => x.id === 'natacion');
  assert.match(textoMotivosNoFirme(natacion).join(' '), /restricción: manifestaste tener una enfermedad respiratoria \(EPOC, asma u otra\); no se recomiendan las familias con demanda aeróbica Alta o Muy alta/);
  assert.equal(etiquetaNoFirme({ motivosNoFirme: [{ tipo: 'brecha_severa' }, { tipo: 'restriccion_seguridad' }] }), 'restricción de seguridad');
  assert.equal(etiquetaNoFirme({ motivosNoFirme: [{ tipo: 'brecha_severa' }] }), 'brecha severa');
  assert.equal(etiquetaNoFirme({ motivosNoFirme: [{ tipo: 'sin_dato' }] }), 'faltan datos');
});

test('la categoría declarada cuenta aunque todas sus subpreguntas estén en No', () => {
  assert.deepEqual(restringidas(flujoCon('c7')), RESPIRATORIA);
  assert.deepEqual(restringidas(flujoCon('c1')), MUSCULOESQUELETICA);
  assert.deepEqual(restringidas(flujoCon('c8')), NEUROLOGICA);
});

test('una subpregunta concreta (c6b, c7d, c10a) exige su propio Sí: la categoría sola no la activa', () => {
  assert.deepEqual(restringidas(flujoCon('c10')), []);            // c10 sin c10a
  assert.deepEqual(restringidas(flujoCon('c6')), []);             // c6 sin c6b: solo alerta de salud mental
  assert.ok(!flujoCon('c7').etapas.ranking.familias.some(x => x.motivosNoFirme.some(m => m.restriccion === 'cardiovascular')));   // c7 sin c7d no activa la fila cardiovascular
});

test('los mensajes nombran la afección que la persona manifestó', () => {
  // Alertas R-SEG-05 generadas para las condiciones dadas.
  const alertas = (...ids) => flujoCon(...ids).informe.seguridad.alertas.filter(a => a.regla === 'R-SEG-05');
  assert.match(alertas('c3').find(a => a.codigo === 'PARQ_RESTRICCION_CARDIOVASCULAR').titulo, /Restricción: manifestaste tener una enfermedad cardiovascular o cardíaca/);
  assert.match(alertas('c4').find(a => a.codigo === 'PARQ_RESTRICCION_CARDIOVASCULAR').titulo, /manifestaste tener hipertensión arterial/);
  assert.match(alertas('c3', 'c4').find(a => a.codigo === 'PARQ_RESTRICCION_CARDIOVASCULAR').titulo, /una enfermedad cardiovascular o cardíaca y hipertensión arterial/);
  assert.match(alertas('c7', 'c7c').find(a => a.codigo === 'PARQ_RESTRICCION_RESPIRATORIA').titulo, /enfermedad respiratoria/);
  assert.match(alertas('g2')[0].titulo, /manifestaste dolor en el pecho/);
  assert.match(alertas('g2', 'g3')[0].mensaje, /dolor en el pecho y mareo o pérdida de consciencia/);
  const natacion = flujoCon('c3').etapas.ranking.familias.find(x => x.id === 'natacion');
  assert.match(textoMotivosNoFirme(natacion).join(' '), /restricción: manifestaste tener una enfermedad cardiovascular o cardíaca; no se recomiendan las familias con carga cardiovascular alta/);
});

test('la regla ignora un PAR-Q+ ausente y las categorías sin seguimiento aplicado', () => {
  assert.deepEqual(aplicarRestriccionesPorCondicion(null).alertas, []);
  assert.deepEqual(aplicarRestriccionesPorCondicion({ generalesPositivas: ['p4'], categoriasDeclaradas: [], subpreguntasPositivas: [] }).familias, {});
});

/** Salida mínima del motor con tres familias firmes. */
const motor = (...familias) => ({ salida: { compatibilidad: { ranking: familias } } });
// Familia simulada del ranking con valores por defecto.
const fam = (id, extra = {}) => ({ id, compatibilidad: 0.8, porcentaje: 80, cobertura: 1, carenciasRelevantes: 0, brechasRelevantes: 0, brechasSeveras: 0, firme: true, motivosNoFirme: [], ...extra });
// Restricciones simuladas (R-SEG-05, respiratoria) para las familias dadas.
const restr = (...ids) => ({ bloqueo: null, familias: Object.fromEntries(ids.map(id => [id, [{ regla: 'R-SEG-05', restriccion: 'respiratoria', condicion: 'una enfermedad respiratoria (EPOC, asma u otra)', motivo: 'demanda aeróbica Alta o Muy alta' }]])) });

test('plan: si solo la seguridad deja fuera a todas las familias, se informa la restricción y no una adaptación', () => {
  const r = construirRanking(motor(fam('natacion'), fam('ciclismo')), restr('natacion', 'ciclismo'));
  assert.equal(r.recomendada, null);
  const plan = construirPlanAdaptacion({ ranking: r, capacidades: {} });
  assert.equal(plan.tipo, 'restricciones_seguridad');
  assert.deepEqual(plan.condiciones, ['una enfermedad respiratoria (EPOC, asma u otra)']);
  assert.match(plan.motivo, /^Restricción: manifestaste tener una enfermedad respiratoria/);
});

test('plan: si todas las familias tienen brecha severa sigue siendo Estado 3 aunque haya restricciones', () => {
  const severa = [{ tipo: 'brecha_severa', capacidad: 'fuerza', demanda: 'Alta', nivel: 'Bajo' }];
  const r = construirRanking(motor(fam('natacion', { firme: false, motivosNoFirme: severa }), fam('ciclismo', { firme: false, motivosNoFirme: severa })), restr('natacion'));
  const plan = construirPlanAdaptacion({ ranking: r, capacidades: { fuerza: 'Bajo' } });
  assert.equal(plan.estado, 3);
});

test('plan: una familia que solo espera datos tiene prioridad sobre el aviso de restricciones', () => {
  const sinDato = [{ tipo: 'sin_dato', capacidad: 'flexibilidad', demanda: 'Alta' }];
  const r = construirRanking(motor(fam('natacion'), fam('danza', { firme: false, motivosNoFirme: sinDato })), restr('natacion'));
  const plan = construirPlanAdaptacion({ ranking: r, capacidades: {} });
  assert.equal(plan.tipo, 'datos_insuficientes');
  assert.deepEqual(plan.faltantes, ['flexibilidad']);
});
