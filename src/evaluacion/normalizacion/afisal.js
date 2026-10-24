/**
 * @module evaluacion/normalizacion/afisal
 * @description Baremos AFISAL-INEFC (Rodríguez et al., 1998) para las cuatro capacidades de la batería confirmada.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la tabulación de los baremos AFISAL.
 *  - O (Abierto/Cerrado): se añaden baremos como nuevos elementos de BAREMOS_AFISAL sin modificar el motor de normalización.
 *  - D (Inversión de dependencias): solo declara datos conformes al contrato de baremos (baremos.js); no depende de su implementación.
 * Notas: grupos 18-24 y 25-34 por sexo. Fuentes: afisal.pdf (Apunts Educación Física y Deportes 54:54-65; tablas 8, 9, 11 y 12) y
 * "Baremos según afisal por variable.docx". Cortes 'inferior_inclusivo': en mayor_mejor son los límites inferiores de Bajo, Medio,
 * Alto y Muy alto; en menor_mejor, [inf. Alto, inf. Medio, inf. Bajo, X+1 de "Muy bajo >X"].
 * Correcciones a la Tabla 9 (erratas de origen): en hombres "Muy bajo <10/<12" se interpreta como ">10/>12"; en hombres 25-34 el
 * solape Medio 5-8 / Alto 2-7 se resuelve asignando 7-8 a Medio y 2-4 a Alto.
 * Tabla 12 (erratum de origen, R-BAR-01, 2026-10): en hombres 25-34 el PDF imprime Medio 49-54 y Alto 54-60; se aplica el mismo criterio
 * (la banda Medio impresa se conserva y Alto se recorta): 54 cm es Medio y Alto parte en 55 cm.
 * Redondeo (R-BAR-03, 2026-10): dinamometría, salto y flexibilidad se redondean al entero más cercano antes de clasificar, porque las tablas
 * se publican en enteros (ver `redondeo` en baremos.js). El equilibrio es un conteo y no lo necesita.
 * Protocolo bilateral: dinamometría y equilibrio se baremizan sobre la SUMA de ambos lados (mejor intento por mano; intentos por pierna).
 */

/** Construye la fuente trazable de un baremo AFISAL.
 * @param {string} tabla - tabla y variable de origen.
 * @returns {{referencia: string, origen: string}} fuente del baremo. */
const FUENTE_BAREMO = (tabla) => ({
  referencia: `AFISAL-INEFC: ${tabla} (Rodriguez et al., 1998). Transcripcion: Baremos segun afisal por variable.docx.`,
  origen: 'baremo',
});

/** Genera los cuatro grupos sexo-edad de un baremo.
 * @param {{m: number[], f: number[]}} from18 - cortes del grupo 18-24.
 * @param {{m: number[], f: number[]}} from25 - cortes del grupo 25-34.
 * @returns {Object[]} grupos con sexo, rango de edad y cortes. */
function grupos2(from18, from25) {
  return [
    { sexo: 'masculino', edadMin: 18, edadMax: 24, cortes: from18.m },
    { sexo: 'masculino', edadMin: 25, edadMax: 34, cortes: from25.m },
    { sexo: 'femenino', edadMin: 18, edadMax: 24, cortes: from18.f },
    { sexo: 'femenino', edadMin: 25, edadMax: 34, cortes: from25.f },
  ];
}

/** Baremos AFISAL de dinamometría, salto vertical, flexibilidad y equilibrio monopodal. */
export const BAREMOS_AFISAL = [
  {
    id: 'afisal_dinamometria',
    capacidad: 'fuerza',
    version: '1.1-afisal',
    fuente: FUENTE_BAREMO('Tabla 8, fuerza maxima de prension (kg)'),
    tipo: 'cortes_ordenados',
    direccion: 'mayor_mejor',
    limite: 'inferior_inclusivo',
    redondeo: 'entero',
    grupos: grupos2(
      { m: [72, 85, 98, 112], f: [39, 50, 61, 73] },
      { m: [69, 81, 93, 106], f: [32, 44, 56, 69] },
    ),
  },
  {
    id: 'afisal_salto_vertical',
    capacidad: 'fuerza_explosiva',
    version: '1.2-afisal',
    fuente: FUENTE_BAREMO('Tabla 12, salto vertical (cm)'),
    tipo: 'cortes_ordenados',
    direccion: 'mayor_mejor',
    limite: 'inferior_inclusivo',
    redondeo: 'entero',
    grupos: grupos2(
      { m: [46, 53, 60, 68], f: [30, 36, 42, 49] },
      { m: [44, 49, 55, 61], f: [26, 33, 41, 50] },
    ),
  },
  {
    id: 'afisal_sit_and_reach',
    capacidad: 'flexibilidad',
    version: '1.1-afisal',
    fuente: FUENTE_BAREMO('Tabla 11, flexibilidad anterior del tronco (cm)'),
    tipo: 'cortes_ordenados',
    direccion: 'mayor_mejor',
    limite: 'inferior_inclusivo',
    redondeo: 'entero',
    grupos: grupos2(
      { m: [23, 32, 40, 50], f: [31, 38, 45, 53] },
      { m: [20, 28, 37, 47], f: [28, 36, 44, 53] },
    ),
  },
  {
    id: 'afisal_equilibrio_monopodal',
    capacidad: 'equilibrio',
    version: '1.0-afisal',
    fuente: FUENTE_BAREMO('Tabla 9, equilibrio monopodal sin vision (n.º intentos en 1 min), con correcciones documentadas arriba'),
    tipo: 'cortes_ordenados',
    direccion: 'menor_mejor',
    limite: 'inferior_inclusivo',
    grupos: grupos2(
      { m: [2, 5, 7, 11], f: [2, 5, 8, 11] },
      { m: [2, 5, 9, 13], f: [2, 6, 11, 16] },
    ),
  },
];
