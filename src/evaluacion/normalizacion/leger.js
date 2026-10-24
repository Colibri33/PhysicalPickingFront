/**
 * @module evaluacion/normalizacion/leger
 * @description Parámetros, ecuación de VO2máx y baremo provisional del test de Léger (course navette 20 m) para PhysicalPicking.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el protocolo y el baremo del test de Léger.
 *  - O (Abierto/Cerrado): el baremo se integra al registro mediante el contrato de baremos, sin modificar el motor.
 *  - D (Inversión de dependencias): depende solo de la escala NIVELES y del contrato de baremos.
 * Notas: muestra propia n=58 (41 hombres, 17 mujeres), 18-29 años. Cortes por z (media + z × DE muestral, por sexo) con el método de AFISAL-INEFC
 * (Rodríguez et al., 1998, parte II): z < -1,5 muy bajo; -1,5 ≤ z < -0,5 bajo; -0,5 ≤ z ≤ 0,5 medio; 0,5 < z ≤ 1,5 alto; z > 1,5 muy alto.
 * AFISAL no publica baremo para el test de Léger (su Tabla 13 corresponde al VO2máx estimado con caminata de 2 km), de ahí el baremo propio.
 * Ecuación (Léger et al., 1988, adultos, edad fijada en 18): VO2máx = 6,0 × V − 27,4, con V = 8 + 0,5 × nivel = 8,5 + (nivel − 1) × 0,5 km/h
 * (R-BAR-02, 2026-10: antes −24,4, de origen no verificado). Como el baremo es relativo a la muestra, la constante desplaza el VO2 de cada
 * nivel y los cortes por igual: la clasificación de cada nivel no cambia (test/baremos.test.js lo comprueba). Dato de captura: nivel máximo
 * alcanzado (entero 1-21); de la muestra "nivel.ida" solo se usó la parte entera. Fundamento completo: docs/FUNDAMENTO_BAREMO_RESISTENCIA.md.
 * BAREMO PROVISIONAL, sin validación externa: no presentar como estándar oficial ni atribuir a AFISAL-INEFC.
 */

import { NIVELES } from '../niveles.js';

/** Parámetros del protocolo Léger (20 m), según la hoja Parametros del Excel. */
export const LEGER_PARAMS = Object.freeze({
  velocidadPalier1: 8.5, // km/h
  incrementoPorPalier: 0.5, // km/h
  coeficienteVO2: 6.0,
  constanteVO2: -27.4,
  edadMin: 18,
  edadMax: 30, // población del proyecto
});

/** Calcula la velocidad de un nivel entero de Léger.
 * @param {number|string} nivel - nivel alcanzado.
 * @returns {number|null} velocidad en km/h; null si el nivel es inválido o menor que 1. */
export function velocidadNivel(nivel) {
  const n = Math.floor(Number(nivel));
  if (!Number.isFinite(n) || n < 1) return null;
  return LEGER_PARAMS.velocidadPalier1 + (n - 1) * LEGER_PARAMS.incrementoPorPalier;
}

/** Estima el VO2máx a partir del nivel alcanzado (parte entera).
 * @param {number|string} nivel - nivel alcanzado.
 * @returns {number|null} VO2máx en ml/kg/min; null si el nivel es inválido. */
export function vo2MaxDesdeNivel(nivel) {
  const v = velocidadNivel(nivel);
  if (v === null) return null;
  return LEGER_PARAMS.coeficienteVO2 * v + LEGER_PARAMS.constanteVO2;
}

/** Extrae el nivel entero de un registro "nivel.ida".
 * @param {number|string} valor - registro con formato nivel.ida.
 * @returns {number|null} parte entera; null si no es numérico. */
export function nivelEnteroDeRegistro(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

// Cortes de VO2máx por sexo (hoja Baremos del Excel): 4 cortes para 5 niveles.
// Media + z × DE de la muestra con VO2 = 6,0 × V − 27,4 (los cortes del Excel con −24,4 menos 3,0 exactos).
const CORTES_HOMBRES = Object.freeze([31.4109724612741, 38.4963404139207, 45.5817083665672, 52.6670763192137]);
const CORTES_MUJERES = Object.freeze([25.8355114792635, 31.6392881401467, 37.4430648010298, 43.2468414619129]);

/** Baremo provisional de VO2máx (Léger) por sexo, 18-30 años. */
export const BAREMO_LEGER_VO2MAX = Object.freeze({
  id: 'physicalpicking_vo2max',
  capacidad: 'vo2max',
  version: '1.1-provisional',
  fuente: {
    referencia: 'Baremo_Leger_PhysicalPicking.xlsx — hoja Baremos (muestra propia, método z, estilo AFISAL-INEFC). Protocolo y ecuación de adultos: Léger et al. (1988).',
    origen: 'baremo',
  },
  tipo: 'cortes_ordenados',
  direccion: 'mayor_mejor',
  limite: 'inferior_inclusivo',
  grupos: [
    { sexo: 'masculino', edadMin: LEGER_PARAMS.edadMin, edadMax: LEGER_PARAMS.edadMax, cortes: CORTES_HOMBRES },
    { sexo: 'femenino', edadMin: LEGER_PARAMS.edadMin, edadMax: LEGER_PARAMS.edadMax, cortes: CORTES_MUJERES },
  ],
});

/** Baremos de Léger a registrar. */
export const BAREMOS_LEGER = Object.freeze([BAREMO_LEGER_VO2MAX]);
