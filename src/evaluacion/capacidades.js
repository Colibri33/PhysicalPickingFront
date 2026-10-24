/**
 * @module evaluacion/capacidades
 * @description Catálogo único de las cinco capacidades físicas de la batería: cómo se captura cada una, con qué prueba y con qué baremo se califica.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es qué capacidades se miden y cómo se capturan.
 *  - O (Abierto/Cerrado): una capacidad nueva es una entrada más del catálogo; el flujo y las pantallas la toman de aquí sin modificarse.
 *  - D (Inversión de dependencias): pantallas, flujo e informes leen este catálogo; ninguno declara por su cuenta nombres, rangos o baremos.
 * Notas: `id` es el identificador del motor (escala del DecisionEngine); `campo` es la clave con la que la captura y los registros guardados
 * (`realesF`) nombran la misma capacidad. No se unifican para no invalidar registros ya guardados ni el backend.
 * `captura` son topes para evitar errores de digitación, no puntos de corte: deben quedar por encima del corte más alto de cada baremo para
 * que los cinco niveles sean alcanzables (test/baremos.test.js lo comprueba). El backend conserva una copia de estos rangos en
 * src/utils/validacion.js (DEFINICIONES_FISICAS) porque se despliega por separado; el mismo test verifica que coincidan.
 * `nombre` es el de la pantalla de captura; `etiqueta` es la capacidad tal como la nombra la matriz de demandas y los informes.
 * Fuerza y equilibrio se capturan por lado y se guarda la suma de ambos, que es sobre lo que se aplica el baremo.
 */

import { BAREMO_LEGER_VO2MAX } from './normalizacion/leger.js';

const AFISAL = 'AFISAL-INEFC (Rodriguez et al., 1998; Espana; n=238; grupos 18-24 y 25-34)';

/** Capacidades físicas, en el orden en que se presentan. */
export const CAPACIDADES_FISICAS = Object.freeze([
  {
    id: 'fuerza', etiqueta: 'Fuerza', campo: 'fuerza', nombre: 'Fuerza prensil', color: '#6d28d9', unidad: 'kg',
    captura: { minimo: 20, maximo: 200, paso: 1 }, direccion: 'mayor_mejor',
    prueba: 'dinamometria_manual', baremoId: 'afisal_dinamometria', referenciaBaremo: AFISAL, pendientes: [],
  },
  {
    id: 'fuerza_explosiva', etiqueta: 'Fuerza explosiva', campo: 'fuerzaExp', nombre: 'Fuerza explosiva', color: '#9333ea', unidad: 'cm',
    captura: { minimo: 5, maximo: 100, paso: 1 }, direccion: 'mayor_mejor',
    prueba: 'salto_vertical', baremoId: 'afisal_salto_vertical', referenciaBaremo: AFISAL, pendientes: [],
  },
  {
    // Nivel máximo alcanzado en el course navette. Solo se pide si el PAR-Q+ autoriza la prueba máxima.
    id: 'vo2max', etiqueta: 'Resistencia aeróbica', campo: 'resistencia', nombre: 'Resistencia aeróbica', color: '#0f9d66', unidad: 'nivel',
    captura: { minimo: 1, maximo: 21, paso: 1 }, direccion: 'mayor_mejor',
    prueba: 'leger_course_navette_20m', requiereAutorizacion: 'prueba_maxima',
    baremoId: 'physicalpicking_vo2max', referenciaBaremo: BAREMO_LEGER_VO2MAX.fuente, pendientes: [],
  },
  {
    id: 'flexibilidad', etiqueta: 'Flexibilidad', campo: 'flexibilidad', nombre: 'Flexibilidad', color: '#db2777', unidad: 'cm',
    captura: { minimo: -20, maximo: 60, paso: 1 }, direccion: 'mayor_mejor',
    prueba: 'sit_and_reach', baremoId: 'afisal_sit_and_reach', referenciaBaremo: AFISAL, pendientes: [],
  },
  {
    id: 'equilibrio', etiqueta: 'Equilibrio', campo: 'equilibrio', nombre: 'Equilibrio', color: '#7c3aed', unidad: 'intentos',
    captura: { minimo: 0, maximo: 60, paso: 1 }, direccion: 'menor_mejor',
    prueba: 'equilibrio_monopodal_sin_vision', baremoId: 'afisal_equilibrio_monopodal', referenciaBaremo: AFISAL,
    pendientes: ['Tabla 9 AFISAL con erratas de origen corregidas (ver normalizacion/afisal.js); verificar contra publicacion.'],
  },
]);

/** Nombre de cada capacidad en la matriz de demandas y en los informes, por id del motor. */
export const ETIQUETAS_CAPACIDAD = Object.freeze(Object.fromEntries(CAPACIDADES_FISICAS.map(c => [c.id, c.etiqueta])));

/** Vista de captura del catálogo: una variable por capacidad, con la clave `campo` como id (la que usa `realesF`).
 * @type {Array<{id: string, capacidad: string, nombre: string, color: string, unidad: string, minimo: number, maximo: number, paso: number, direccion: string}>} */
export const VARIABLES_CAPTURA = Object.freeze(CAPACIDADES_FISICAS.map(c => Object.freeze({
  id: c.campo, capacidad: c.id, nombre: c.nombre, color: c.color, unidad: c.unidad,
  minimo: c.captura.minimo, maximo: c.captura.maximo, paso: c.captura.paso, direccion: c.direccion,
})));

/** Topes por lado de las capturas bilaterales (el total se guarda en `fuerza` y `equilibrio`). */
export const FUERZA_POR_MANO_MAX = 100;
export const EQUILIBRIO_POR_PIERNA_MAX = 30;

const LEGER = VARIABLES_CAPTURA.find(v => v.id === 'resistencia');
/** Menor y mayor nivel posible del test de Léger. */
export const NIVEL_LEGER_MIN = LEGER.minimo;
export const NIVEL_LEGER_MAX = LEGER.maximo;

/** Verifica que el nivel de Léger sea un entero dentro del rango del test.
 * @param {*} n - valor a evaluar.
 * @returns {boolean} true si es válido. */
export function esNivelLegerValido(n) {
  return typeof n === 'number' && Number.isInteger(n) && n >= NIVEL_LEGER_MIN && n <= NIVEL_LEGER_MAX;
}

/** Valida las variables capturadas: vacío o no numérico bloquea; fuera de rango solo advierte.
 * @param {Array<Object>} vars - variables de captura (VARIABLES_CAPTURA o un subconjunto).
 * @param {Object} reales - valores capturados por `campo`.
 * @returns {{ok: boolean, errores: string[], advertencias: string[]}} resultado de la validación. */
export function validarFormularioVariables(vars, reales) {
  const errores = [];
  const advertencias = [];

  vars.forEach(v => {
    const raw = reales[v.id];
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      errores.push(`${v.nombre}: campo obligatorio.`);
      return;
    }
    const n = parseFloat(raw);
    // No se confía solo en el control de la interfaz: NaN o infinito bloquean.
    if (!Number.isFinite(n)) {
      errores.push(`${v.nombre}: debe ser un numero valido.`);
      return;
    }
    if (n < v.minimo || n > v.maximo) {
      advertencias.push(`${v.nombre}: ${n} ${v.unidad} esta fuera del rango de captura (${v.minimo}–${v.maximo} ${v.unidad}); se califica con el valor ingresado.`);
    }
  });

  return { ok: errores.length === 0, errores, advertencias };
}
