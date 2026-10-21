/**
 * @module test/evaluacion.test
 * @description Pruebas del flujo de evaluación de extremo a extremo (node --test).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el contrato del flujo de evaluación.
 * Notas: los baremos y el motor usados son FALSOS y solo verifican contratos; no son valores del proyecto.
 */

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
  // equilibrio 6 (Medio), Léger nivel 3 → VO2 32,6 → Bajo.
  // Velocidad exige: fuerza Baja ✓, explosiva Muy alta ✓, vo2max Baja ✓, flex Media ✓, equil Media ✓ → 100% firme.
  // Fondo exige vo2max Muy alta → brecha severa (Bajo no cumple Muy alta).
  const datos = {
    participante,
    realesF: {
      fuerza: '80', fuerzaDer: '40', fuerzaIzq: '40', fuerzaExp: '50',
      resistencia: '3', flexibilidad: '40', equilibrio: '6',
      equilibrioDer: '3', equilibrioIzq: '3',
    },
    antropometricas: {},
    cuestionarios: { parq: parqNo },
    leger: { palier: 3 },
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

test('resistencia aeróbica: solo se acepta el nivel máximo alcanzado como entero 1-21', () => {
  const vo2 = (valor) => ejecutarFlujoEvaluacion({
    participante,
    realesF: { ...realesF, resistencia: String(valor) },
    antropometricas: {}, cuestionarios: {},
    leger: { palier: String(valor) },
  }, { ahora: AHORA }).etapas.modulos.fisica_vo2max;
  for (const invalido of ['3.7', '3.5', '0', '22', '-1']) {
    assert.equal(vo2(invalido).estado, 'sin_datos', `${invalido} debe quedar sin dato`);
  }
  assert.equal(vo2('1').resultadoEvaluacion.valor, 6 * 8.5 - 24.4);
  assert.equal(vo2('21').resultadoEvaluacion.valor, 6 * 18.5 - 24.4);
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

test('PAR-Q+ desde la UI: condicion respondida "No" no abre seguimiento; apto en la UI = autoriza en el flujo', async () => {
  const { datosEntradaDesdeAnalisis } = await import('../src/evaluacion/entrada.js');
  const { evaluarParq } = await import('../src/logic/parq.js');
  const generales = { g1: 'si', g2: 'no', g3: 'no', g4: 'no', g5: 'no', g6: 'no', g7: 'no' };
  const condicionesNo = { c1: 'no', c2: 'no', c3: 'no', c5: 'no', c6: 'no', c7: 'no', c8: 'no', c9: 'no', c10: 'no' };
  const correr = (respuestas) => ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis({
    participante, realesF, antropometricas: {}, parq: { respuestas, detalles: {} },
  }), { ahora: AHORA }).etapas;

  // Hipertension con subpreguntas en No → UI "apto" y flujo autoriza el Leger.
  const apto = { ...generales, ...condicionesNo, c4: 'si', c4a: 'no', c4b: 'no' };
  assert.equal(evaluarParq(apto), 'apto');
  const e1 = correr(apto);
  assert.equal(e1.modulos.parq.resultadoEvaluacion.clasificacion, 'seguimiento_sin_positivos');
  assert.equal(e1.reglas.pruebaMaxima.autorizada, true);

  // Una subpregunta en Si → UI "consultar" y flujo no autoriza.
  const consultar = { ...apto, c4b: 'si' };
  assert.equal(evaluarParq(consultar), 'consultar');
  const e2 = correr(consultar);
  assert.equal(e2.modulos.parq.resultadoEvaluacion.clasificacion, 'seguimiento_con_positivos');
  assert.equal(e2.reglas.pruebaMaxima.autorizada, false);

  // Todas las generales en No → autoriza y sin aviso de seguimiento sobrante.
  const todoNo = { ...generales, g1: 'no' };
  const e3 = correr(todoNo);
  assert.equal(e3.reglas.pruebaMaxima.autorizada, true);
  assert.ok(!e3.modulos.parq.advertencias.some(a => a.includes('seguimiento')));
});

test('PAR-Q+: orden oficial de subpreguntas (version en espanol / Google Form)', async () => {
  const { CONDICIONES } = await import('../src/logic/parq.js');
  const hijas = Object.fromEntries(CONDICIONES.flatMap(c => c.hijas).map(h => [h.id, h.texto]));
  // La pregunta "dificultades para controlar..." es la (a) en 1, 3, 4, 6, 7, 8 y 9.
  for (const id of ['c1a', 'c3a', 'c4a', 'c6a', 'c7a', 'c8a', 'c9a']) {
    assert.match(hijas[id], /dificultades para controlar/, id);
  }
  assert.match(hijas.c3b, /arritmia/);
  assert.match(hijas.c4b, /160\/90/);
  assert.match(hijas.c7b, /oxígeno/);
  assert.match(hijas.c8b, /baja presión/);
  assert.match(hijas.c9b, /movilidad/);
  // La pregunta de conmocion cerebral solo esta en 10a.
  const conmocion = Object.entries(hijas).filter(([, t]) => /comoción cerebral/.test(t)).map(([id]) => id);
  assert.deepEqual(conmocion, ['c10a']);
});

test('PSQI: textos de la version colombiana (ICSP-VC, Escobar-Cordoba 2005)', async () => {
  const { ITEMS_PSQI_PERTURBACIONES, OPCIONES_CALIDAD, OPCIONES_CONVIVENCIA } = await import('../src/logic/psqi.js');
  assert.equal(ITEMS_PSQI_PERTURBACIONES.find(i => i.id === 'p5c').texto, 'Tener que levantarse para ir al baño');
  assert.deepEqual(OPCIONES_CALIDAD.map(o => o.etiqueta), ['Muy buena', 'Bastante buena', 'Bastante mala', 'Muy mala']);
  assert.equal(OPCIONES_CONVIVENCIA[0].etiqueta, 'No tengo pareja ni compañero/a de habitación');
});

test('R-DEC-03: sin familia firme no hay recomendación; con brechas severas en todas → Estado 3 con pautas ACSM', async () => {
  const { construirRanking } = await import('../src/evaluacion/decision/ranking.js');
  const { construirPlanAdaptacion } = await import('../src/evaluacion/reglas/planAdaptacion.js');
  const { DecisionEngineReferencia } = await import('../src/evaluacion/decision/decisionEngine.js');
  const capacidades = { fuerza: 'Muy bajo', fuerza_explosiva: 'Muy bajo', vo2max: 'Bajo', flexibilidad: 'Muy bajo', equilibrio: 'Alto' };
  const salida = new DecisionEngineReferencia().evaluar({ capacidades, ipaq: null, psqi: null, experiencias: [] });
  const ranking = construirRanking({ salida });
  assert.equal(ranking.recomendada, null);
  assert.equal(ranking.sinFamiliaCompatible, true);
  assert.equal(ranking.familias[0].id, 'atletismo_velocidad'); // sigue listada con su 40%
  assert.equal(ranking.familias[0].porcentaje, 40);
  const plan = construirPlanAdaptacion({ ranking, capacidades });
  assert.equal(plan.estado, 3);
  assert.equal(plan.nombre, 'Adaptación desde cero');
  assert.deepEqual(plan.prioridades.map(p => p.capacidad), ['fuerza', 'fuerza_explosiva', 'flexibilidad', 'vo2max']);
  assert.deepEqual(plan.pautasComponentes.map(p => p.id), ['fuerza', 'flexibilidad', 'aerobico']);
  assert.ok(plan.pautasGenerales.length >= 3);
  assert.match(plan.fuente.referencia, /ACSM|American College of Sports Medicine/);
});

test('R-DEC-03: si alguna familia solo falla por datos faltantes → pide datos, no Estado 3', async () => {
  const { construirRanking } = await import('../src/evaluacion/decision/ranking.js');
  const { construirPlanAdaptacion } = await import('../src/evaluacion/reglas/planAdaptacion.js');
  const { DecisionEngineReferencia } = await import('../src/evaluacion/decision/decisionEngine.js');
  const capacidades = { fuerza: 'Medio', fuerza_explosiva: null, vo2max: null, flexibilidad: 'Medio', equilibrio: 'Medio' };
  const ranking = construirRanking({ salida: new DecisionEngineReferencia().evaluar({ capacidades, ipaq: null, psqi: null, experiencias: [] }) });
  const plan = construirPlanAdaptacion({ ranking, capacidades });
  if (ranking.sinFamiliaCompatible) {
    assert.equal(plan.estado, null);
    assert.equal(plan.tipo, 'datos_insuficientes');
    assert.ok(plan.faltantes.includes('fuerza_explosiva') || plan.faltantes.includes('vo2max'));
  } else {
    assert.equal(plan.aplica, false);
  }
});

test('R-SEG-04: antecedente de lesión → alerta de adaptación y recuperación (no cambia el ranking)', async () => {
  const { datosEntradaDesdeAnalisis } = await import('../src/evaluacion/entrada.js');
  const base = {
    participante, realesF, antropometricas: {},
    parq: { respuestas: { g1: 'no', g2: 'no', g3: 'no', g4: 'no', g5: 'no', g6: 'no', g7: 'no' }, detalles: {} },
  };
  const complementarias = {
    lesion_2anios: true, cirugia_musculoesqueletica: false, dolor_articular: false,
    zona_articulacion: 'rodilla derecha', fecha_aprox_lesion: '2025-03', tratamiento_medico: true,
    limitacion_pruebas: false, practica_deporte: false, practica_actual: false,
  };
  const con = ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis({ ...base, complementarias: { respuestas: complementarias } }), { ahora: AHORA });
  const alerta = con.informe.seguridad.alertas.find(a => a.codigo === 'ANTECEDENTE_LESION');
  assert.ok(alerta);
  assert.match(alerta.mensaje, /adaptación y recuperación previa antes de iniciar nuevamente con algún deporte/);
  assert.match(alerta.mensaje, /rodilla derecha/);
  const sin = ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis({ ...base, complementarias: { respuestas: { ...complementarias, lesion_2anios: false } } }), { ahora: AHORA });
  assert.ok(!sin.informe.seguridad.alertas.some(a => a.codigo === 'ANTECEDENTE_LESION'));
  assert.deepEqual(con.etapas.ranking.familias.map(f => f.porcentaje), sin.etapas.ranking.familias.map(f => f.porcentaje));
});

test('detalleCapacidades: valor medido, referencia del mismo baremo y diferencia (sin inventar porcentajes)', async () => {
  const { detalleCapacidades, mayorOportunidad } = await import('../src/evaluacion/informe/detalleCapacidades.js');
  const parqNo = { p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false };
  const flujo = ejecutarFlujoEvaluacion({
    participante: { edad: 20, genero: 'masculino' },
    realesF: { fuerza: '60', fuerzaDer: '30', fuerzaIzq: '30', fuerzaExp: '40', resistencia: '4', flexibilidad: '5', equilibrio: '7', equilibrioDer: '3', equilibrioIzq: '4' },
    antropometricas: {}, cuestionarios: { parq: parqNo }, leger: { palier: 4 },
  }, { ahora: AHORA });
  const equipo = Object.fromEntries(detalleCapacidades(flujo, 'deportes_equipo').map(d => [d.id, d]));
  // Fuerza 60 kg (hombre 18-24, AFISAL Tabla 8): Muy bajo; equipo exige Alta → ≥ 98 kg.
  assert.equal(equipo.fuerza.nivel, 'Muy bajo');
  assert.equal(equipo.fuerza.estado, 'severa');
  assert.equal(equipo.fuerza.umbral.texto, '≥ 98 kg');
  assert.equal(equipo.fuerza.diferencia.texto, 'Faltan 38 kg');
  // Equilibrio 7 intentos (a menos, mejor): Bajo; equipo exige Media → ≤ 6 intentos.
  assert.equal(equipo.equilibrio.nivel, 'Bajo');
  assert.equal(equipo.equilibrio.umbral.texto, '≤ 6 intentos');
  assert.equal(equipo.equilibrio.diferencia.texto, '1 intento de más');
  // VO2: Léger 4 → 35,6 ml/kg/min (Bajo); Alta exige ≥ 48,6 ≈ nivel 9 del Léger.
  assert.equal(equipo.vo2max.umbral.texto, '≥ 48,6 ml/kg/min');
  assert.equal(equipo.vo2max.legerNecesario, 9);
  // Sin familia: la referencia es el siguiente nivel del baremo.
  const solo = Object.fromEntries(detalleCapacidades(flujo, null).map(d => [d.id, d]));
  assert.equal(solo.fuerza.nivelObjetivo, 'Bajo');
  assert.equal(solo.fuerza.umbral.texto, '≥ 72 kg');
  assert.equal(solo.fuerza.estado, null);
  assert.equal(mayorOportunidad(detalleCapacidades(flujo, 'deportes_equipo')).estado, 'severa');
});

test('R-SEG-04: la alerta de lesión no se pierde si el bloque complementario queda inválido por otra pregunta', async () => {
  const { datosEntradaDesdeAnalisis } = await import('../src/evaluacion/entrada.js');
  const flujo = ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis({
    participante, realesF, antropometricas: {},
    complementarias: { respuestas: {
      lesion_2anios: true, cirugia_musculoesqueletica: false, dolor_articular: false,
      zona_articulacion: 'rodilla', fecha_aprox_lesion: '2025', tratamiento_medico: true,
      limitacion_pruebas: false, practica_deporte: true, practica_actual: false,
      // 40 años de experiencia con 22 de edad → bloque inválido
      experiencias: [{ deporte: 'fútbol', anios: 40, tipo: 'recreativo', modalidad: 'colectivo', habilidad: 'abierta' }],
    } },
  }), { ahora: AHORA });
  assert.equal(flujo.etapas.modulos.complementarias_physicalpicking.estado, 'invalido');
  const alerta = flujo.informe.seguridad.alertas.find(a => a.codigo === 'ANTECEDENTE_LESION');
  assert.ok(alerta);
  assert.match(alerta.mensaje, /rodilla/);
});

test('R-SEG-04: registros guardados antes de la regla también muestran la alerta (historial y PDF de mis datos)', async () => {
  const { alertaAntecedenteLesion } = await import('../src/evaluacion/reglas/preparacionSeguridad.js');
  const { resumirRegistro } = await import('../src/utils/informeMisDatosPdf.js');
  const antecedentes = { lesion2anios: false, cirugiaMusculoesqueletica: true, dolorArticular: false, zona: 'hombro' };
  assert.match(alertaAntecedenteLesion(antecedentes).mensaje, /cirugía.*hombro/);
  assert.equal(alertaAntecedenteLesion({ lesion2anios: false, cirugiaMusculoesqueletica: false, dolorArticular: false }), null);
  const viejo = { participante: { nombre: 'X' }, complementarias: { resultado: { antecedentes } }, evaluacion: { informe: { seguridad: { alertas: [] } } } };
  assert.ok(resumirRegistro(viejo).alertasSeguridad.some(a => a.codigo === 'ANTECEDENTE_LESION'));
});
