/**
 * @module evaluacion/normalizacion/leger
 * @description Parámetros, ecuación de VO2máx y baremo provisional del test de Léger (course navette 20 m) para PhysicalPicking.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el protocolo y el baremo del test de Léger.
 *  - O (Abierto/Cerrado): el baremo se integra al registro mediante el contrato de baremos, sin modificar el motor.
 *  - D (Inversión de dependencias): depende solo de la escala NIVELES y del contrato de baremos.
 * Notas: muestra propia n=58 (41 hombres, 17 mujeres), 18-29 años. Cortes por z (media + z × DE, por sexo) según AFISAL-INEFC:
 * z < -1,5 muy bajo; -1,5 a -0,5 bajo; -0,5 a 0,5 medio; 0,5 a 1,5 alto; > 1,5 muy alto. AFISAL no incluye este test.
 * Ecuación (Léger et al., 1988, ≥ 18 años): VO2máx = 6,0 × V − 24,4, con V = 8,5 + (nivel − 1) × 0,5 km/h; constante POR VERIFICAR
 * contra el artículo original. Dato de captura: nivel máximo alcanzado (entero 1-21); de la muestra "nivel.ida" solo se usó la parte entera.
 * BAREMO PROVISIONAL, sin validación externa: no presentar como estándar oficial ni atribuir a AFISAL-INEFC.
 */

import { NIVELES } from '../niveles.js';

/** Parámetros del protocolo Léger (20 m), según la hoja Parametros del Excel. */
export const LEGER_PARAMS = Object.freeze({
  velocidadPalier1: 8.5, // km/h
  incrementoPorPalier: 0.5, // km/h
  coeficienteVO2: 6.0,
  constanteVO2: -24.4,
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
const CORTES_HOMBRES = Object.freeze([34.4109724612741, 41.4963404139207, 48.5817083665672, 55.6670763192137]);
const CORTES_MUJERES = Object.freeze([28.8355114792635, 34.6392881401467, 40.4430648010298, 46.2468414619129]);

/** Baremo provisional de VO2máx (Léger) por sexo, 18-30 años. */
export const BAREMO_LEGER_VO2MAX = Object.freeze({
  id: 'physicalpicking_vo2max',
  capacidad: 'vo2max',
  version: '1.0-provisional',
  fuente: {
    referencia: 'Baremo_Leger_PhysicalPicking.xlsx — hoja Baremos (muestra propia, método z, estilo AFISAL-INEFC). Protocolo y ecuación: Léger et al. (1988).',
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
