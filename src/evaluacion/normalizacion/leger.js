/* ══════════════════════════════════════════════════════════════════════
   evaluacion/normalizacion/leger.js
   Baremos del test de Léger (course navette 20 m) para PhysicalPicking.
   Muestra propia: n=58 (41 hombres, 17 mujeres), edades 18-29.

   Método: puntuación z (5 niveles), tomado de AFISAL-INEFC (Rodríguez
   et al.; afisal.pdf, "Análisis estadístico"): z < -1,5 muy bajo;
   -1,5 a -0,5 bajo; -0,5 a 0,5 medio; 0,5 a 1,5 alto; z > 1,5 muy alto.
   Los cortes se derivan de: media + z × DE, por sexo (muestra propia).
   AFISAL no incluye el test de Léger ni su ecuación: la ecuación de
   VO2máx es de Léger et al. (1988) y su constante (-24,4) queda POR
   VERIFICAR contra el artículo completo.

   Ecuación (Léger et al., 1988, protocolo 20 m):
     VO2máx (ml/kg/min) = 6,0 × V − 24,4   (≥ 18 años)
     donde V = velocidad del nivel alcanzado (km/h)
           V = 8,5 + (nivel − 1) × 0,5     (palier 1 = 8,5 km/h, +0,5 por palier)

   Dato de captura en la app: NIVEL MÁXIMO ALCANZADO (entero 1-21).
   La muestra del Excel se registró como "nivel.ida" (p. ej. 3,6 = nivel 3,
   6 idas); para el baremo se usó solo la parte entera, que equivale a este
   mismo dato. Las idas no entran al cálculo.

   ESTADO: BAREMO PROVISIONAL (muestra propia, no validada externamente).
   No presentar como estándar oficial ni atribuir a AFISAL-INEFC.
   ══════════════════════════════════════════════════════════════════════ */

import { NIVELES } from '../niveles.js';

/* Parámetros del protocolo Léger (20 m), hoja Parametros del Excel. */
export const LEGER_PARAMS = Object.freeze({
  velocidadPalier1: 8.5,   // km/h, velocidad del palier 1
  incrementoPorPalier: 0.5, // km/h, incremento por palier
  coeficienteVO2: 6.0,     // VO2máx = 6 × V − 24,4
  constanteVO2: -24.4,
  edadMin: 18,
  edadMax: 30,             // población del proyecto
});

/* Velocidad (km/h) de un nivel entero de Léger. Devuelve null si nivel < 1. */
export function velocidadNivel(nivel) {
  const n = Math.floor(Number(nivel));
  if (!Number.isFinite(n) || n < 1) return null;
  return LEGER_PARAMS.velocidadPalier1 + (n - 1) * LEGER_PARAMS.incrementoPorPalier;
}

/* VO2máx estimado (ml/kg/min) a partir del nivel alcanzado (parte entera). */
export function vo2MaxDesdeNivel(nivel) {
  const v = velocidadNivel(nivel);
  if (v === null) return null;
  return LEGER_PARAMS.coeficienteVO2 * v + LEGER_PARAMS.constanteVO2;
}

/* Nivel entero de Léger a partir de un registro "nivel.ida" (parte entera). */
export function nivelEnteroDeRegistro(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

/* Cortes de VO2máx por sexo (hoja Baremos del Excel).
   Cada grupo tiene 4 cortes para 5 niveles (NIVELES.length - 1). */
const CORTES_HOMBRES = Object.freeze([34.4109724612741, 41.4963404139207, 48.5817083665672, 55.6670763192137]);
const CORTES_MUJERES = Object.freeze([28.8355114792635, 34.6392881401467, 40.4430648010298, 46.2468414619129]);

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

export const BAREMOS_LEGER = Object.freeze([BAREMO_LEGER_VO2MAX]);
