/* Pruebas del flujo de evaluacion (node --test). Los baremos y el
   motor usados aqui son FALSOS, solo para verificar contratos: no son
   valores del proyecto. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ejecutarFlujoEvaluacion, MODULOS, crearRegistroBaremos } from '../src/evaluacion/index.js';
import { CAMPOS_TRAZABILIDAD } from '../src/evaluacion/trazabilidad.js';
import { construirEntradaDecisionEngine } from '../src/evaluacion/decision/decisionEnginePort.js';
import { FAMILIAS_DEPORTIVAS } from '../src/evaluacion/decision/familias.js';
import { MODULO_PARQ } from '../src/evaluacion/modulos/seguridad/parq.js';
import { MODULO_COMPLEMENTARIAS } from '../src/evaluacion/modulos/complementarias/physicalpicking.js';
import { calcularConsolidado, estadoAnalisisInicial, calcularICC, clasificarICC } from '../src/logic/modelo.js';
import { migrarRegistroLegado, retirarGrasaMuscular } from '../src/logic/registroLegado.js';

const AHORA = '2026-10-05T00:00:00.000Z';
const participante = { nombre: 'Prueba', edad: 22, genero: 'femenino', perfil: 'general', deporte: 'ninguno' };
const realesF = { fuerza: '90', fuerzaExp: '35', resistencia: '8', flexibilidad: '10', equilibrio: '15' };
const parqNo = { p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false };
const base = (cuestionarios = {}) => ({ participante, realesF, antropometricas: { peso: '60', talla: '165' }, cuestionarios });
const flujo = (c, o = {}) => ejecutarFlujoEvaluacion(base(c), { ahora: AHORA, ...o });

test('sin baremos ni motor: todo queda pendiente, sin inventar niveles ni ranking', () => {
  const r = flujo({}, { baremos: [], decisionEngine: null });
  assert.equal(r.etapas.modulos.fisica_fuerza.estado, 'pendiente_baremo');
  assert.equal(r.etapas.modulos.fisica_fuerza.nivel, null);
  // Resistencia aeróbica: el nivel se conserva aunque el baremo esté pendiente.
  assert.equal(r.etapas.modulos.fisica_vo2max.estado, 'pendiente_baremo');
  assert.equal(r.etapas.modulos.fisica_vo2max.resultadoEvaluacion.palier, 8);
  assert.equal(r.etapas.decisionEngine.estado, 'pendiente_integracion');
  assert.equal(r.etapas.ranking.familias, null);
  assert.ok(r.informe.pendientesConfiguracion.some(p => p.includes('DecisionEngine')));
  assert.ok(r.informe.pendientesConfiguracion.some(p => p.includes('AFISAL')));
});

test('cada modulo conserva los campos de trazabilidad', () => {
  const r = flujo({ parq: parqNo });
  for (const m of Object.values(r.etapas.modulos)) {
    for (const campo of CAMPOS_TRAZABILIDAD) assert.ok(campo in m, `${m.moduloId} sin ${campo}`);
    assert.ok(m.fuente?.referencia, `${m.moduloId} sin referencia de fuente`);
  }
  assert.deepEqual(r.etapas.modulos.parq.respuestaOriginal, parqNo);
});

test('PAR-Q+: todas No → autoriza prueba maxima', () => {
  const r = flujo({ parq: parqNo });
  assert.equal(r.etapas.modulos.parq.nivel, 'sin_positivos');
  assert.equal(r.etapas.reglas.pruebaMaxima.autorizada, true);
});

test('PAR-Q+: un Si sin seguimiento → incompleto y no autoriza', () => {
  const r = flujo({ parq: { ...parqNo, p2: true } });
  assert.equal(r.etapas.modulos.parq.estado, 'incompleto');
  assert.equal(r.etapas.modulos.parq.nivel, 'seguimiento_incompleto');
  assert.equal(r.etapas.reglas.pruebaMaxima.autorizada, false);
});

const seguimiento = (positiva) => Object.fromEntries(
  MODULO_PARQ.categoriasSeguimiento.map(c => [c.id, c.id === 'c3' ? { aplica: true, respuestas: { a: positiva } } : { aplica: false }]));

test('PAR-Q+: seguimiento con Si → no autoriza; seguimiento sin Si → autoriza', () => {
  const con = flujo({ parq: { ...parqNo, p1: true, seguimiento: seguimiento(true) } });
  assert.equal(con.etapas.modulos.parq.nivel, 'seguimiento_con_positivos');
  assert.equal(con.etapas.reglas.pruebaMaxima.autorizada, false);
  const sin = flujo({ parq: { ...parqNo, p1: true, seguimiento: seguimiento(false) } });
  assert.equal(sin.etapas.modulos.parq.nivel, 'seguimiento_sin_positivos');
  assert.equal(sin.etapas.reglas.pruebaMaxima.autorizada, true);
});

test('PAR-Q+ no entra al porcentaje: capacidades del motor identicas con o sin positivos (salvo VO2 por regla)', () => {
  const baremos = crearRegistroBaremos([{
    id: 'afisal_dinamometria', fuente: { referencia: 'PRUEBA', origen: 'baremo' }, tipo: 'cortes_ordenados',
    direccion: 'mayor_mejor', limite: 'inferior_inclusivo', grupos: [{ sexo: null, cortes: [10, 20, 30, 40] }],
  }]);
  const a = flujo({ parq: parqNo }, { baremos }).etapas.decisionEngine.entrada.capacidades;
  const b = flujo({ parq: { ...parqNo, p1: true, seguimiento: seguimiento(true) } }, { baremos }).etapas.decisionEngine.entrada.capacidades;
  assert.deepEqual(a, b);
  assert.equal(a.fuerza, 'Muy alto'); // 90 (suma) con cortes de prueba [10,20,30,40]
  assert.equal(MODULO_PARQ.destino, 'seguridad');
});

test('baremo inyectado: nivel asignado y trazado; sin grupo para el sexo → null con advertencia', () => {
  const baremos = crearRegistroBaremos([{
    id: 'afisal_salto_vertical', fuente: { referencia: 'PRUEBA', origen: 'baremo' }, tipo: 'cortes_ordenados',
    direccion: 'mayor_mejor', limite: 'inferior_inclusivo', grupos: [{ sexo: 'masculino', cortes: [1, 2, 3, 4] }],
  }]);
  const m = flujo({}, { baremos }).etapas.modulos.fisica_fuerza_explosiva;
  assert.equal(m.nivel, null);
  assert.ok(m.advertencias.some(a => a.includes('no hay grupo')));
});

test('el motor recibe solo datos normalizados y el ranking se valida contra las 13 familias', () => {
  let recibida = null;
  const motorFalso = {
    evaluar(entrada) {
      recibida = entrada;
      return { compatibilidad: { ranking: FAMILIAS_DEPORTIVAS.map(f => ({ id: f.id, porcentaje: null })) } };
    },
  };
  const r = flujo({ parq: parqNo }, { decisionEngine: motorFalso });
  assert.equal(r.etapas.decisionEngine.estado, 'ejecutado');
  assert.equal(r.etapas.ranking.estado, 'completo');
  assert.equal(r.etapas.ranking.familias.length, 13);
  const texto = JSON.stringify(recibida);
  assert.ok(!texto.includes('respuestaOriginal'));
  assert.deepEqual(Object.keys(recibida.capacidades).sort(), ['equilibrio', 'flexibilidad', 'fuerza', 'fuerza_explosiva', 'vo2max']);
});

test('VO2max se entrega sin dato al motor si la prueba maxima no esta autorizada', () => {
  const perfil = { participante: {}, compatibilidad: { capacidades: Object.fromEntries(['fuerza', 'fuerza_explosiva', 'flexibilidad', 'equilibrio', 'vo2max'].map(id => [id, { nivel: 'Alto', valor: 1 }])) },
    preparacion: {}, seguridad: { parq: null }, informativas: {} };
  const entrada = construirEntradaDecisionEngine(perfil, { pruebaMaxima: { autorizada: false, legerAplicado: false } });
  assert.equal(entrada.capacidades.vo2max, null);
  assert.equal(entrada.capacidades.fuerza, 'Alto');
});

test('preguntas complementarias: separadas del PAR-Q+ y disponibles para el perfil', () => {
  const complementarias = {
    lesion_2anios: true, cirugia_musculoesqueletica: false, dolor_articular: false,
    zona_articulacion: 'rodilla derecha', fecha_aprox_lesion: 'marzo de 2024', tratamiento_medico: true,
    limitacion_pruebas: true, limitacion_pruebas_afectadas: ['salto_vertical'], limitacion_descripcion: 'dolor al saltar',
    practica_deporte: true,
    experiencias: [{ deporte: 'futbol', tipo: 'formativo_club', anios: 3, modalidad: 'colectivo', habilidad: 'abierta' }],
    practica_actual: false,
  };
  const r = flujo({ parq: parqNo, complementarias });
  const idsParq = MODULO_PARQ.items.map(i => i.id);
  assert.ok(!idsParq.some(id => id.startsWith('lesion') || id.startsWith('practica')));
  assert.equal(MODULO_COMPLEMENTARIAS.fuente.origen, 'decision_propia');
  assert.ok(MODULO_COMPLEMENTARIAS.fuente.noEsPARQ);
  assert.equal(r.etapas.modulos.complementarias_physicalpicking.estado, 'completo');
  assert.equal(r.etapas.decisionEngine.entrada.experiencias[0].tipo, 'formativo_club');
  assert.equal(r.etapas.decisionEngine.entrada.antecedentes.zona, 'rodilla derecha');
  assert.ok(r.etapas.reglas.avisosPorPrueba.fuerza_explosiva);
});

test('complementarias: lesion sin zona/fecha/tratamiento → incompleto', () => {
  const r = flujo({ complementarias: {
    lesion_2anios: true, cirugia_musculoesqueletica: false, dolor_articular: false,
    limitacion_pruebas: false, practica_deporte: false, practica_actual: false,
  } });
  const m = r.etapas.modulos.complementarias_physicalpicking;
  assert.equal(m.estado, 'incompleto');
  assert.ok(m.datosFaltantes.includes('zona_articulacion'));
});

test('complementarias: tipo de experiencia con valores nuevos; anios > edad → invalido', () => {
  const base = {
    lesion_2anios: false, cirugia_musculoesqueletica: false, dolor_articular: false,
    limitacion_pruebas: false, practica_deporte: true, practica_actual: true,
  };
  const ok = flujo({ complementarias: { ...base,
    experiencias: [{ deporte: 'x', tipo: 'federado_competitivo', anios: 3, modalidad: 'individual', habilidad: 'cerrada' }] } });
  assert.equal(ok.etapas.modulos.complementarias_physicalpicking.estado, 'completo');
  const mal = flujo({ complementarias: { ...base,
    experiencias: [{ deporte: 'x', tipo: 'recreativo', anios: 40, modalidad: 'individual', habilidad: 'cerrada' }] } });
  assert.equal(mal.etapas.modulos.complementarias_physicalpicking.estado, 'invalido');
});

test('IPAQ: califica MET-min/semana y categoría; fuera de coherencia → invalido', () => {
  const ok = flujo({ ipaq: { i1: 0, i3: 2, i4: 30, i5: 5, i6: 20, i7: 300 } }).etapas.modulos.ipaq;
  assert.equal(ok.estado, 'completo');
  assert.ok(ok.validacion.omitidosPorCondicion.includes('i2'));
  assert.equal(ok.resultadoEvaluacion.categoria, 'Moderado');
  assert.equal(ok.datoNormalizado.categoria, 'Moderado');
  assert.equal(ok.datoNormalizado.metMinSemana, 570);
  const mal = flujo({ ipaq: { i1: 9, i3: 0, i5: 0, i7: 100 } }).etapas.modulos.ipaq;
  assert.equal(mal.estado, 'invalido');
});

test('IPAQ: ejemplo del cuestionario (5 días x 30 min vigorosa) → 1200 MET y Moderado', () => {
  const m = flujo({ ipaq: { i1: 5, i2: 30, i3: 0, i5: 0, i7: 300 } }).etapas.modulos.ipaq;
  assert.equal(m.estado, 'completo');
  assert.equal(m.resultadoEvaluacion.met.vigorosa, 1200);
  assert.equal(m.resultadoEvaluacion.categoria, 'Moderado');
});

test('PSQI/ICSP-VC: buen dormidor global 0; caso grave >14', () => {
  const bueno = {
    p1: '23:00', p2: 10, p3: '07:00', p4: 7.5,
    p5a: 0, p5b: 0, p5c: 0, p5d: 0, p5e: 0, p5f: 0, p5g: 0, p5h: 0, p5i: 0, p5j: 0,
    p6: 0, p7: 0, p8: 0, p9: 0, p10: 0,
  };
  const rb = flujo({ psqi: bueno }).etapas.modulos.psqi;
  assert.equal(rb.estado, 'completo');
  assert.equal(rb.resultadoEvaluacion.puntajeGlobal, 0);
  assert.equal(rb.datoNormalizado.puntajeGlobal, 0);
  const malo = { ...bueno, p2: 70, p5a: 3, p5b: 3, p5c: 3, p5d: 3, p5e: 3, p5f: 3, p5g: 3, p5h: 3, p5i: 3, p6: 3, p7: 3, p8: 3, p9: 3 };
  const rm = flujo({ psqi: malo }).etapas.modulos.psqi;
  assert.ok(rm.resultadoEvaluacion.puntajeGlobal > 14);
  assert.equal(rm.resultadoEvaluacion.categoria, 'Problema de sueño grave');
});

test('entrada: analisis.ipaq/psqi de la UI se sincronizan a cuestionarios del flujo', async () => {
  const { datosEntradaDesdeAnalisis } = await import('../src/evaluacion/entrada.js');
  const entrada = datosEntradaDesdeAnalisis({
    participante, realesF, antropometricas: {},
    ipaq: { respuestas: { i1: 0, i3: 0, i5: 0, i7: 100 } },
    psqi: { respuestas: {
      p1: '23:00', p2: 10, p3: '07:00', p4: 7,
      p5a: 0, p5b: 0, p5c: 0, p5d: 0, p5e: 0, p5f: 0, p5g: 0, p5h: 0, p5i: 0, p5j: 0,
      p6: 0, p7: 0, p8: 0, p9: 1, p10: 0,
    } },
    cuestionarios: {},
  });
  assert.deepEqual(entrada.cuestionarios.ipaq, { i1: 0, i3: 0, i5: 0, i7: 100 });
  assert.equal(entrada.cuestionarios.psqi.p9, 1);
});

test('entrada: complementarias y leger se sincronizan; vo2max se califica con baremo integrado', async () => {
  const { datosEntradaDesdeAnalisis } = await import('../src/evaluacion/entrada.js');
  const entrada = datosEntradaDesdeAnalisis({
    participante, realesF, antropometricas: {},
    complementarias: { respuestas: {
      lesion_2anios: false, cirugia_musculoesqueletica: false, dolor_articular: false,
      limitacion_pruebas: false, practica_deporte: false, practica_actual: true,
    } },
    leger: { palier: '8' },
    cuestionarios: {},
  });
  assert.equal(entrada.cuestionarios.complementarias.practica_actual, true);
  assert.deepEqual(entrada.leger, { palier: 8 });
  const r = ejecutarFlujoEvaluacion(entrada, { ahora: AHORA }).etapas.modulos.fisica_vo2max;
  assert.equal(r.resultadoEvaluacion.palier, 8);
  assert.equal(r.estado, 'completo');
  // Palier 8, nivelEntero 8, V = 12 km/h, VO2 = 6×12 − 24,4 = 47,6. Mujer 22: Muy alto (>46,25).
  assert.equal(r.nivel, 'Muy alto');
  assert.equal(r.resultadoEvaluacion.valor, 47.6);
});

test('AFISAL por defecto: dinamometria, salto, flexibilidad y equilibrio califican por sexo/edad', () => {
  // Mujer 22 años. Fuerza 90 kg (suma) → Muy alto (>72); salto 40 cm → Medio (36-41);
  // flexibilidad 35 cm → Bajo (31-37); equilibrio 3 intentos → Alto (2-4).
  // Sin dato de resistencia aeróbica: vo2max queda sin datos.
  const datos = {
    participante,
    realesF: { ...realesF, fuerza: '90', fuerzaExp: '40', flexibilidad: '35', equilibrio: '3', resistencia: '' },
    antropometricas: { peso: '60', talla: '165' },
    cuestionarios: {},
  };
  const r = ejecutarFlujoEvaluacion(datos, { ahora: AHORA }).etapas.modulos;
  assert.equal(r.fisica_fuerza.nivel, 'Muy alto');
  assert.equal(r.fisica_fuerza_explosiva.nivel, 'Medio');
  assert.equal(r.fisica_flexibilidad.nivel, 'Bajo');
  assert.equal(r.fisica_equilibrio.nivel, 'Alto');
  assert.equal(r.fisica_vo2max.estado, 'sin_datos');
  assert.equal(r.fisica_vo2max.nivel, null);
});

test('ranking: fondo con VO2 Bajo tiene brecha severa; velocidad es la firme', () => {
  // Mujer 22: fuerza 80 (Bajo), salto 50 (Muy alto), flex 40 (Medio),
  // equilibrio 6 (Medio), Léger 3.5 → VO2 32,6 → Bajo.
  // Velocidad exige: fuerza Baja ✓, explosiva Muy alta ✓, vo2max Baja ✓, flex Media ✓, equil Media ✓ → 100% firme.
  // Fondo exige vo2max Muy alta → brecha severa (Bajo no cumple Muy alta).
  const datos = {
    participante,
    realesF: {
      fuerza: '80', fuerzaDer: '40', fuerzaIzq: '40', fuerzaExp: '50',
      resistencia: '3.5', flexibilidad: '40', equilibrio: '6',
      equilibrioDer: '3', equilibrioIzq: '3',
    },
    antropometricas: {},
    cuestionarios: { parq: parqNo },
    leger: { palier: 3.5 },
  };
  const r = ejecutarFlujoEvaluacion(datos, { ahora: AHORA });
  assert.equal(r.etapas.modulos.fisica_vo2max.estado, 'completo');
  assert.equal(r.etapas.modulos.fisica_vo2max.nivel, 'Bajo');
  const { familias, recomendada, advertencias } = r.etapas.ranking;
  assert.equal(familias[0].id, 'atletismo_velocidad');
  assert.equal(familias[0].compatibilidad, 1);
  assert.equal(familias[0].firme, true);
  assert.equal(recomendada.id, 'atletismo_velocidad');
  const fondo = familias.find(f => f.id === 'atletismo_fondo');
  assert.ok(fondo);
  assert.equal(fondo.compatibilidad, 0.8);
  assert.ok(fondo.brechas.some(b => b.severa && b.capacidad === 'vo2max'));
  assert.ok(!advertencias.some(a => a.includes('provisional')));
  assert.ok(!r.informe.advertencias.some(a => a.includes('provisional')));
});

test('resistencia aeróbica: 3.7 se trata como sin dato (no es medio nivel)', () => {
  const datos = {
    participante,
    realesF: { ...realesF, resistencia: '3.7' },
    antropometricas: {}, cuestionarios: {},
    leger: { palier: '3.7' },
  };
  const m = ejecutarFlujoEvaluacion(datos, { ahora: AHORA }).etapas.modulos.fisica_vo2max;
  assert.equal(m.estado, 'sin_datos');
});

test('AFISAL: hombre 28 años con 100 kg y 55 cm → Alto en ambas', () => {
  const datos = {
    participante: { ...participante, genero: 'masculino', edad: 28 },
    realesF: { ...realesF, fuerza: '100', fuerzaExp: '55' },
    antropometricas: { peso: '60', talla: '165' },
    cuestionarios: {},
  };
  const r = ejecutarFlujoEvaluacion(datos, { ahora: AHORA }).etapas.modulos;
  assert.equal(r.fisica_fuerza.nivel, 'Alto'); // H 25-34: 93-105
  assert.equal(r.fisica_fuerza_explosiva.nivel, 'Alto'); // H 25-34: 54-60
});

test('AFISAL: fuerza bilateral der 40 + izq 50 = 90 → Muy alto con detalle trazado', () => {
  const datos = {
    participante,
    realesF: { ...realesF, fuerza: '90', fuerzaDer: '40', fuerzaIzq: '50' },
    antropometricas: {}, cuestionarios: {},
  };
  const m = ejecutarFlujoEvaluacion(datos, { ahora: AHORA }).etapas.modulos.fisica_fuerza;
  assert.equal(m.estado, 'completo');
  assert.equal(m.nivel, 'Muy alto'); // Mujer 22: >72
  assert.deepEqual(m.resultadoEvaluacion.detalle, { manoDerecha: 40, manoIzquierda: 50, suma: 90 });
});

test('AFISAL: fuerza sin desglose por mano → califica valor con advertencia', () => {
  const m = flujo().etapas.modulos.fisica_fuerza;
  assert.ok(m.resultadoEvaluacion);
  assert.ok(m.advertencias.some(a => a.includes('sin desglose por mano')));
});
test('AFISAL: equilibrio bilateral der 1 + izq 2 = 3 → Alto con detalle trazado', () => {
  const datos = {
    participante,
    realesF: { ...realesF, equilibrio: '3', equilibrioDer: '1', equilibrioIzq: '2' },
    antropometricas: {}, cuestionarios: {},
  };
  const m = ejecutarFlujoEvaluacion(datos, { ahora: AHORA }).etapas.modulos.fisica_equilibrio;
  assert.equal(m.estado, 'completo');
  assert.equal(m.nivel, 'Alto');
  assert.deepEqual(m.resultadoEvaluacion.detalle, { piernaDerecha: 1, piernaIzquierda: 2, total: 3 });
});

test('AFISAL: equilibrio sin desglose por pierna → califica total con advertencia', () => {
  const m = flujo().etapas.modulos.fisica_equilibrio;
  assert.ok(m.resultadoEvaluacion);
  assert.ok(m.advertencias.some(a => a.includes('sin desglose por pierna')));
});
test('AFISAL: equilibrio 1 intento → Muy alto; 12 intentos (mujer 22) → Muy bajo', () => {
  const datos = (eq) => ({
    participante, realesF: { ...realesF, equilibrio: String(eq) },
    antropometricas: {}, cuestionarios: {},
  });
  assert.equal(ejecutarFlujoEvaluacion(datos(1), { ahora: AHORA }).etapas.modulos.fisica_equilibrio.nivel, 'Muy alto');
  assert.equal(ejecutarFlujoEvaluacion(datos(12), { ahora: AHORA }).etapas.modulos.fisica_equilibrio.nivel, 'Muy bajo');
});

test('AFISAL: sexo sin grupo ("otro") → nivel null con advertencia', () => {
  const datos = {
    participante: { ...participante, genero: 'otro' },
    realesF, antropometricas: {}, cuestionarios: {},
  };
  const m = ejecutarFlujoEvaluacion(datos, { ahora: AHORA }).etapas.modulos.fisica_fuerza;
  assert.equal(m.nivel, null);
  assert.ok(m.advertencias.some(a => a.includes('no hay grupo')));
});

test('todos los modulos requeridos estan registrados', () => {
  const ids = MODULOS.map(m => m.id);
  for (const id of ['ipaq', 'psqi', 'breq3', 'bbaq21', 'parq', 'complementarias_physicalpicking', 'antropometricas'])
    assert.ok(ids.includes(id), id);
});

test('modelo heredado: consolidado con ajuste por grasa visceral', () => {
  const e = estadoAnalisisInicial();
  assert.ok(!('cognitivas' in e) && !('corporales' in e) && 'antropometricas' in e);
  assert.ok(!('velocidad' in e.realesF) && !('agilidad' in e.realesF) && !('coordinacion' in e.realesF));
  const c = calcularConsolidado({ resistencia: 50 }, { grasaVisc: '12' });
  assert.deepEqual(Object.keys(c.resistencia).sort(), ['ajAntrop', 'base', 'total']);
  assert.equal(c.resistencia.ajAntrop, -8);
});

test('registro legado: corporales → antropometricas, cognitivo a _legado, idempotente', () => {
  const viejo = { participante, corporales: { peso: 70 }, realesC: { reaccion: 300 }, cognitivas: { reaccion: 70 },
    consolidado: { fuerza: { base: 50, ajCog: 2, ajCorp: 5, total: 57 } } };
  const n = migrarRegistroLegado(viejo);
  assert.deepEqual(n.antropometricas, { peso: 70 });
  assert.deepEqual(n.consolidado.fuerza, { base: 50, ajAntrop: 5, total: 57 });
  assert.ok(!('corporales' in n) && !('cognitivas' in n) && !('realesC' in n));
  assert.equal(n._legado.cognitivas.reaccion, 70);
  assert.deepEqual(migrarRegistroLegado(n), n);
});

test('registro: % grasa y % muscular historicos se conservan en _legado', () => {
  const r = { participante, antropometricas: { peso: '70', grasa: '20', muscular: '42' }, consolidado: {} };
  const m = migrarRegistroLegado(r);
  assert.ok(!('grasa' in m.antropometricas) && !('muscular' in m.antropometricas));
  assert.deepEqual(m._legado.antropometriaRetirada, { grasa: '20', muscular: '42' });
  assert.deepEqual(migrarRegistroLegado(m), m);
  assert.deepEqual(retirarGrasaMuscular({ antropometricas: { peso: '70' } }), { antropometricas: { peso: '70' } });
});

test('ICC: 82/96 mujer → 0.85 con riesgo; 80/100 → sin riesgo; sin cadera → null', () => {
  assert.equal(calcularICC('82', '96').valor, 0.85);
  assert.equal(clasificarICC(0.85, 'femenino'), 'Riesgo sustancialmente aumentado');
  assert.equal(clasificarICC(0.84, 'femenino'), 'Sin riesgo aumentado');
  assert.equal(clasificarICC(0.89, 'masculino'), 'Sin riesgo aumentado');
  assert.equal(clasificarICC(0.9, 'masculino'), 'Riesgo sustancialmente aumentado');
  assert.equal(calcularICC('82', '').valor, null);
  const datos = {
    participante, realesF, antropometricas: { peso: '60', talla: '165', cintura: '82', cadera: '96' }, cuestionarios: {},
  };
  const m = ejecutarFlujoEvaluacion(datos, { ahora: AHORA }).etapas.modulos.antropometricas;
  assert.equal(m.resultadoEvaluacion.icc, 0.85);
  assert.equal(m.resultadoEvaluacion.categoriaICC, 'Riesgo sustancialmente aumentado');
});
