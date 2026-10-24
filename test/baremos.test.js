/**
 * @module test/baremos.test
 * @description Fidelidad de los baremos y de la matriz de capacidades frente a sus fuentes (node --test).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la verificación de baremos y matriz contra su fuente.
 *  - D (Inversión de dependencias): las fuentes se transcriben aquí como rangos; la implementación usa cortes, así que no se verifica a sí misma.
 * Notas: AFISAL: bandas enteras de afisal.pdf (Tablas 8, 9, 11 y 12) con las correcciones documentadas en normalizacion/afisal.js.
 * Léger: clasificación de la hoja Datos de Baremo_Leger_PhysicalPicking.xlsx. Matriz: "Matriz de capacidades.xlsx" (Hoja1).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { NIVELES } from '../src/evaluacion/niveles.js';
import { crearRegistroBaremos, aplicarBaremo } from '../src/evaluacion/normalizacion/baremos.js';
import { BAREMOS_AFISAL } from '../src/evaluacion/normalizacion/afisal.js';
import { BAREMOS_LEGER, BAREMO_LEGER_VO2MAX, vo2MaxDesdeNivel } from '../src/evaluacion/normalizacion/leger.js';
import { MATRIZ_DEMANDA } from '../src/evaluacion/decision/matrizDemanda.js';
import { VARIABLES_CAPTURA } from '../src/evaluacion/capacidades.js';

const REGISTRO = crearRegistroBaremos([...BAREMOS_AFISAL, ...BAREMOS_LEGER]);

/** Bandas por nivel, de Muy bajo a Muy alto, como [mínimo, máximo] enteros inclusivos (null = abierto).
 * Cada grupo: { sexo, edad (representativa), bandas }. */
const AFISAL = {
  afisal_dinamometria: {
    rango: [0, 200],
    grupos: [
      { sexo: 'masculino', edad: 20, bandas: [[null, 71], [72, 84], [85, 97], [98, 111], [112, null]] },
      { sexo: 'masculino', edad: 30, bandas: [[null, 68], [69, 80], [81, 92], [93, 105], [106, null]] },
      { sexo: 'femenino', edad: 20, bandas: [[null, 38], [39, 49], [50, 60], [61, 72], [73, null]] },
      { sexo: 'femenino', edad: 30, bandas: [[null, 31], [32, 43], [44, 55], [56, 68], [69, null]] },
    ],
  },
  afisal_salto_vertical: {
    rango: [0, 120],
    grupos: [
      { sexo: 'masculino', edad: 20, bandas: [[null, 45], [46, 52], [53, 59], [60, 67], [68, null]] },
      // Erratum de origen: el PDF imprime Medio 49-54 y Alto 54-60; se conserva Medio y Alto parte en 55.
      { sexo: 'masculino', edad: 30, bandas: [[null, 43], [44, 48], [49, 54], [55, 60], [61, null]] },
      { sexo: 'femenino', edad: 20, bandas: [[null, 29], [30, 35], [36, 41], [42, 48], [49, null]] },
      { sexo: 'femenino', edad: 30, bandas: [[null, 25], [26, 32], [33, 40], [41, 49], [50, null]] },
    ],
  },
  afisal_sit_and_reach: {
    rango: [-20, 80],
    grupos: [
      { sexo: 'masculino', edad: 20, bandas: [[null, 22], [23, 31], [32, 39], [40, 49], [50, null]] },
      { sexo: 'masculino', edad: 30, bandas: [[null, 19], [20, 27], [28, 36], [37, 46], [47, null]] },
      { sexo: 'femenino', edad: 20, bandas: [[null, 30], [31, 37], [38, 44], [45, 52], [53, null]] },
      { sexo: 'femenino', edad: 30, bandas: [[null, 27], [28, 35], [36, 43], [44, 52], [53, null]] },
    ],
  },
  // Menos intentos es mejor: de Muy bajo (muchos intentos) a Muy alto (0-1).
  afisal_equilibrio_monopodal: {
    rango: [0, 60],
    grupos: [
      { sexo: 'masculino', edad: 20, bandas: [[11, null], [7, 10], [5, 6], [2, 4], [null, 1]] },
      // Correcciones de la Tabla 9: Muy bajo ">12" y solape Medio 5-8 / Alto 2-7 resuelto como Alto 2-4.
      { sexo: 'masculino', edad: 30, bandas: [[13, null], [9, 12], [5, 8], [2, 4], [null, 1]] },
      { sexo: 'femenino', edad: 20, bandas: [[11, null], [8, 10], [5, 7], [2, 4], [null, 1]] },
      { sexo: 'femenino', edad: 30, bandas: [[16, null], [11, 15], [6, 10], [2, 5], [null, 1]] },
    ],
  },
};

/** Devuelve el nivel esperado de un valor entero; falla si las bandas dejan huecos o se solapan.
 * @param {number} valor - valor entero.
 * @param {Array<Array<number|null>>} bandas - cinco bandas de Muy bajo a Muy alto.
 * @returns {string} nivel esperado. */
function nivelEsperado(valor, bandas) {
  const idx = bandas.flatMap(([lo, hi], i) => ((lo === null || valor >= lo) && (hi === null || valor <= hi) ? [i] : []));
  assert.equal(idx.length, 1, `transcripción con hueco o solape en valor ${valor}`);
  return NIVELES[idx[0]];
}

for (const [id, { rango, grupos }] of Object.entries(AFISAL)) {
  for (const g of grupos) {
    test(`${id}: ${g.sexo} ${g.edad} años reproduce las bandas del PDF para cada entero`, () => {
      for (let v = rango[0]; v <= rango[1]; v += 1) {
        const r = aplicarBaremo(REGISTRO, id, v, { sexo: g.sexo, edad: g.edad });
        assert.equal(r.nivel, nivelEsperado(v, g.bandas), `${id} ${g.sexo} ${g.edad}: valor ${v}`);
      }
    });
  }
}

test('AFISAL: el cambio de grupo ocurre entre 24 y 25 años', () => {
  const a = aplicarBaremo(REGISTRO, 'afisal_dinamometria', 70, { sexo: 'masculino', edad: 24 });
  const b = aplicarBaremo(REGISTRO, 'afisal_dinamometria', 70, { sexo: 'masculino', edad: 25 });
  assert.equal(a.nivel, 'Muy bajo'); // 18-24: Muy bajo < 72
  assert.equal(b.nivel, 'Bajo'); // 25-34: Bajo 69-80
  assert.equal(a.baremoAplicado.grupo.edadMax, 24);
  assert.equal(b.baremoAplicado.grupo.edadMin, 25);
});

test('AFISAL: cada nivel conserva trazabilidad de baremo, versión y fuente', () => {
  const r = aplicarBaremo(REGISTRO, 'afisal_salto_vertical', 55, { sexo: 'masculino', edad: 30 });
  assert.equal(r.nivel, 'Alto');
  assert.equal(r.baremoAplicado.id, 'afisal_salto_vertical');
  assert.ok(r.baremoAplicado.version);
  assert.match(r.baremoAplicado.fuente.referencia, /AFISAL/);
});

/** Clasificación de la muestra propia (hoja Datos): [sexo, nivel entero de Léger, nivel esperado]. */
const MUESTRA_LEGER = [
  ['F', 1, 'Muy bajo'], ['F', 3, 'Bajo'], ['F', 4, 'Medio'], ['F', 5, 'Medio'], ['F', 6, 'Alto'], ['F', 7, 'Alto'], ['F', 8, 'Muy alto'],
  ['M', 2, 'Muy bajo'], ['M', 3, 'Muy bajo'], ['M', 4, 'Bajo'], ['M', 5, 'Bajo'], ['M', 6, 'Medio'], ['M', 7, 'Medio'], ['M', 8, 'Medio'],
  ['M', 9, 'Alto'], ['M', 10, 'Alto'], ['M', 11, 'Muy alto'], ['M', 12, 'Muy alto'],
];

test('Léger: reproduce la clasificación de la hoja Datos del Excel (58 registros, 18 combinaciones sexo-nivel)', () => {
  for (const [s, palier, esperado] of MUESTRA_LEGER) {
    const sexo = s === 'M' ? 'masculino' : 'femenino';
    const r = aplicarBaremo(REGISTRO, 'physicalpicking_vo2max', vo2MaxDesdeNivel(palier), { sexo, edad: 20 });
    assert.equal(r.nivel, esperado, `Léger ${sexo} nivel ${palier}`);
  }
});

test('Léger: el nivel nunca baja al subir el nivel alcanzado (1-21) y el 21 es Muy alto', () => {
  for (const sexo of ['masculino', 'femenino']) {
    let previo = -1;
    for (let palier = 1; palier <= 21; palier += 1) {
      const r = aplicarBaremo(REGISTRO, 'physicalpicking_vo2max', vo2MaxDesdeNivel(palier), { sexo, edad: 22 });
      const idx = NIVELES.indexOf(r.nivel);
      assert.ok(idx >= previo, `${sexo}: el nivel retrocede en el palier ${palier}`);
      previo = idx;
    }
    assert.equal(NIVELES[previo], 'Muy alto');
  }
});

test('Léger: fuera de 18-30 años no hay grupo y queda sin nivel con advertencia', () => {
  const r = aplicarBaremo(REGISTRO, 'physicalpicking_vo2max', 45, { sexo: 'masculino', edad: 31 });
  assert.equal(r.nivel, null);
  assert.ok(r.datosFaltantes.includes('grupo_baremo'));
});

/** Matriz de capacidades.xlsx (Hoja1): [id, Mitchell, fuerza, explosiva, VO2max, flexibilidad, equilibrio]. */
const EXCEL_MATRIZ = [
  ['deportes_equipo', 'IC', 'Alta', 'Alta', 'Alta', 'Media', 'Media'],
  ['voleibol', 'IB', 'Media', 'Muy alta', 'Media', 'Media', 'Alta'],
  ['natacion', 'IIC', 'Alta', 'Media', 'Muy alta', 'Alta', 'Media'],
  ['ciclismo', 'IIIC', 'Media', 'Media', 'Muy alta', 'Baja', 'Baja'],
  ['atletismo_fondo', 'IC', 'Baja', 'Media', 'Muy alta', 'Media', 'Baja'],
  ['atletismo_velocidad', 'IIB', 'Baja', 'Muy alta', 'Baja', 'Media', 'Media'],
  ['senderismo_montanismo', 'IC', 'Alta', 'Baja', 'Alta', 'Media', 'Alta'],
  ['combate_golpeo', 'IIIA', 'Media', 'Alta', 'Media', 'Alta', 'Alta'],
  ['combate_agarre', 'IIIA', 'Muy alta', 'Alta', 'Media', 'Media', 'Alta'],
  ['raqueta', 'IIC', 'Media', 'Alta', 'Media', 'Media', 'Alta'],
  ['danza', 'IIB', 'Media', 'Alta', 'Media', 'Muy alta', 'Muy alta'],
  ['deportes_fuerza', 'IIIA', 'Muy alta', 'Alta', 'Baja', 'Media', 'Media'],
  ['escalada', 'IIIA', 'Muy alta', 'Alta', 'Baja', 'Alta', 'Muy alta'],
];

test('matriz: las 13 familias y sus 5 demandas coinciden con el Excel', () => {
  assert.equal(MATRIZ_DEMANDA.length, EXCEL_MATRIZ.length);
  for (const [id, mitchell, fuerza, fuerzaExp, vo2max, flexibilidad, equilibrio] of EXCEL_MATRIZ) {
    const f = MATRIZ_DEMANDA.find(m => m.id === id);
    assert.ok(f, `falta la familia ${id}`);
    assert.equal(f.mitchell, mitchell, `${id}: Mitchell`);
    assert.deepEqual(f.demandas, { fuerza, fuerza_explosiva: fuerzaExp, vo2max, flexibilidad, equilibrio }, `${id}: demandas`);
  }
});

/** Variable de captura de cada baremo AFISAL. */
const VARIABLE_DE_BAREMO = {
  afisal_dinamometria: 'fuerza',
  afisal_salto_vertical: 'fuerzaExp',
  afisal_sit_and_reach: 'flexibilidad',
  afisal_equilibrio_monopodal: 'equilibrio',
};

test('captura: los cinco niveles de cada grupo AFISAL son alcanzables dentro del rango de captura', () => {
  for (const [id, varId] of Object.entries(VARIABLE_DE_BAREMO)) {
    const v = VARIABLES_CAPTURA.find(x => x.id === varId);
    for (const g of BAREMOS_AFISAL.find(b => b.id === id).grupos) {
      const vistos = new Set();
      for (let x = v.minimo; x <= v.maximo; x += v.paso) {
        vistos.add(aplicarBaremo(REGISTRO, id, x, { sexo: g.sexo, edad: g.edadMin }).nivel);
      }
      assert.equal(vistos.size, NIVELES.length,
        `${id} ${g.sexo} ${g.edadMin}-${g.edadMax}: con captura ${v.minimo}..${v.maximo} solo se alcanza ${[...vistos].join(', ')}`);
    }
  }
});

test('captura: los cinco niveles de Léger son alcanzables con los niveles 1-21', () => {
  for (const sexo of ['masculino', 'femenino']) {
    const vistos = new Set();
    for (let palier = 1; palier <= 21; palier += 1) {
      vistos.add(aplicarBaremo(REGISTRO, 'physicalpicking_vo2max', vo2MaxDesdeNivel(palier), { sexo, edad: 22 }).nivel);
    }
    assert.equal(vistos.size, NIVELES.length, `Léger ${sexo}: solo se alcanza ${[...vistos].join(', ')}`);
  }
});

test('captura: el espejo de rangos del backend coincide con VARIABLES_CAPTURA', async (t) => {
  let back;
  try { back = await import('../../PhysicalPicking/src/utils/validacion.js'); } catch { return t.skip('backend no disponible en esta copia'); }
  assert.equal(back.DEFINICIONES_FISICAS.length, VARIABLES_CAPTURA.length);
  for (const d of back.DEFINICIONES_FISICAS) {
    const v = VARIABLES_CAPTURA.find(x => x.id === d.id);
    assert.ok(v, `el backend define ${d.id} y el front no`);
    assert.deepEqual({ min: d.min, max: d.max, paso: d.paso, direccion: d.direccion },
      { min: v.minimo, max: v.maximo, paso: v.paso, direccion: v.direccion }, `rango de ${d.id}`);
  }
});

/** Niveles máximos de la muestra propia (hoja Datos del Excel, parte entera de "nivel.ida"). */
const MUESTRA_NIVELES = {
  masculino: [2, 2, 3, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 11, 12],
  femenino: [1, 3, 3, 3, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6, 7, 8, 8],
};

test('Léger: la ecuación es la de adultos de Léger et al. (1988), 6,0 × V − 27,4, con V = 8 + 0,5 × nivel', () => {
  for (const nivel of [1, 8, 21]) {
    const v = 8 + 0.5 * nivel;
    assert.ok(Math.abs(vo2MaxDesdeNivel(nivel) - (6.0 * v - 27.4)) < 1e-9, `nivel ${nivel}`);
  }
});

test('Léger: los cortes se reproducen como media + z × DE de la muestra (método z de AFISAL, z = ±0,5 y ±1,5)', () => {
  const Z = [-1.5, -0.5, 0.5, 1.5];
  for (const [sexo, niveles] of Object.entries(MUESTRA_NIVELES)) {
    const vo2 = niveles.map(vo2MaxDesdeNivel);
    const media = vo2.reduce((a, b) => a + b, 0) / vo2.length;
    const de = Math.sqrt(vo2.reduce((a, b) => a + (b - media) ** 2, 0) / (vo2.length - 1));
    const grupo = BAREMO_LEGER_VO2MAX.grupos.find(g => g.sexo === sexo);
    assert.equal(vo2.length, sexo === 'masculino' ? 41 : 17);
    Z.forEach((z, i) => {
      assert.ok(Math.abs(grupo.cortes[i] - (media + z * de)) < 1e-6, `${sexo}: corte z=${z}`);
    });
  }
});

test('redondeo (R-BAR-03): los decimales se clasifican como el entero más cercano, mitades hacia arriba', () => {
  const nivel = (id, valor, sexo, edad) => aplicarBaremo(REGISTRO, id, valor, { sexo, edad }).nivel;
  // Dinamometría, hombre 20: "Muy alto > 111", Alto 98-111, Bajo 72-84, Medio 85-97, Muy bajo < 72.
  assert.equal(nivel('afisal_dinamometria', 111.4, 'masculino', 20), 'Alto');
  assert.equal(nivel('afisal_dinamometria', 111.5, 'masculino', 20), 'Muy alto');
  assert.equal(nivel('afisal_dinamometria', 84.4, 'masculino', 20), 'Bajo');
  assert.equal(nivel('afisal_dinamometria', 84.5, 'masculino', 20), 'Medio');
  assert.equal(nivel('afisal_dinamometria', 71.4, 'masculino', 20), 'Muy bajo');
  assert.equal(nivel('afisal_dinamometria', 71.5, 'masculino', 20), 'Bajo');
  // Salto, hombre 30: Medio 49-54, Alto 55-60.
  assert.equal(nivel('afisal_salto_vertical', 54.4, 'masculino', 30), 'Medio');
  assert.equal(nivel('afisal_salto_vertical', 54.5, 'masculino', 30), 'Alto');
  // Flexibilidad, mujer 20: Bajo 31-37, Medio 38-44.
  assert.equal(nivel('afisal_sit_and_reach', 37.4, 'femenino', 20), 'Bajo');
  assert.equal(nivel('afisal_sit_and_reach', 37.5, 'femenino', 20), 'Medio');
  // Negativos: -0,5 sube a 0 (mitades hacia arriba).
  assert.equal(aplicarBaremo(REGISTRO, 'afisal_sit_and_reach', -0.5, { sexo: 'masculino', edad: 20 }).baremoAplicado.valorClasificado, 0);
});

test('redondeo: queda registrado el valor clasificado y no se aplica a equilibrio ni a Léger', () => {
  const r = aplicarBaremo(REGISTRO, 'afisal_dinamometria', 111.5, { sexo: 'masculino', edad: 20 });
  assert.equal(r.baremoAplicado.valorClasificado, 112);
  assert.equal(BAREMOS_AFISAL.find(b => b.id === 'afisal_equilibrio_monopodal').redondeo, undefined);
  assert.equal(BAREMO_LEGER_VO2MAX.redondeo, undefined);
});
