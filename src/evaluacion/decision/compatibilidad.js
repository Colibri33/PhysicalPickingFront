/**
 * @module evaluacion/decision/compatibilidad
 * @description Reglas puras de compatibilidad ordinal por familia, firmeza de la recomendación y desempate Mitchell (referencia auditable del DecisionEngine).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la regla de compatibilidad y de orden del ranking.
 *  - O (Abierto/Cerrado): la matriz de demandas y la relevancia Mitchell son datos inyectados; cambian sin modificar las funciones.
 *  - D (Inversión de dependencias): la matriz se recibe por parámetro; las tablas de cumplimiento provienen de matrizDemanda.js.
 * Notas: compatibilidad = requisitos cumplidos / evaluados; sin dato no penaliza (baja la cobertura = evaluadas / 5). Sin conversiones
 * numéricas de niveles. Carencias (v1.1, decisión propia): una demanda Alta/Muy alta o una capacidad Mitchell-relevante sin dato deja la
 * familia como NO FIRME, sin alterar su porcentaje, porque la demanda es el mínimo exigible y recomendar sin evaluarla es una mala aplicación
 * de la matriz. R-DEC-02 (v1.2, 2026-10): una brecha severa (nivel Muy bajo/Bajo ante demanda Alta/Muy alta) también deja la familia NO FIRME,
 * sin pesos ni umbrales nuevos. Mitchell no modifica el porcentaje: solo cuenta brechas relevantes para desempatar. Orden del ranking:
 * firmes primero; luego compatibilidad (desc), carencias relevantes, brechas relevantes y brechas severas (asc), cobertura (desc);
 * se permiten empates con orden estable.
 */

import {
  CAPACIDADES_MATRIZ, CUMPLE_DESDE, DEMANDA_ALTA, NIVEL_BAJO,
  capacidadesRelevantes,
} from './matrizDemanda.js';

/** Determina si un nivel cumple una demanda.
 * @param {string|null} nivel - nivel de la capacidad.
 * @param {string} demanda - demanda de la familia.
 * @returns {boolean|null} true si cumple; false si no cumple o la demanda es desconocida; null si no hay dato. */
export function cumpleDemanda(nivel, demanda) {
  if (nivel == null) return null;
  return (CUMPLE_DESDE[demanda] ?? []).includes(nivel);
}

/** Determina si una brecha es severa (demanda Alta/Muy alta con nivel Muy bajo/Bajo).
 * @param {string} nivel - nivel de la capacidad.
 * @param {string} demanda - demanda de la familia.
 * @returns {boolean} true si es severa. */
export function esBrechaSevera(nivel, demanda) {
  return DEMANDA_ALTA.includes(demanda) && NIVEL_BAJO.includes(nivel);
}

/** Evalúa la compatibilidad de un perfil de niveles contra una familia.
 * @param {Object<string, string|null>} niveles - nivel o null por capacidad.
 * @param {Object} familia - entrada de MATRIZ_DEMANDA.
 * @returns {Object} compatibilidad, cobertura, brechas, carencias, firmeza y motivos de no firmeza. */
export function evaluarFamilia(niveles, familia) {
  const relevantes = new Set(capacidadesRelevantes(familia));
  const brechas = [];
  const carencias = [];
  let cumplidas = 0;
  let evaluadas = 0;
  for (const cap of CAPACIDADES_MATRIZ) {
    const demanda = familia.demandas[cap];
    const cumple = cumpleDemanda(niveles?.[cap] ?? null, demanda);
    if (cumple === null) {
      // Sin dato: fuera de numerador y denominador; se registra como carencia para firmeza y desempate.
      carencias.push({
        capacidad: cap,
        demanda,
        relevanteMitchell: relevantes.has(cap),
        demandaAlta: DEMANDA_ALTA.includes(demanda),
      });
      continue;
    }
    evaluadas += 1;
    if (cumple) { cumplidas += 1; continue; }
    brechas.push({
      capacidad: cap,
      demanda: familia.demandas[cap],
      nivel: niveles[cap],
      relevanteMitchell: relevantes.has(cap),
      severa: esBrechaSevera(niveles[cap], familia.demandas[cap]),
    });
  }
  const brechasRelevantes = brechas.filter(b => b.relevanteMitchell).length;
  const brechasSeveras = brechas.filter(b => b.severa).length;
  const carenciasRelevantes = carencias.filter(c => c.relevanteMitchell).length;
  const motivosNoFirme = [
    ...carencias.filter(c => c.relevanteMitchell || c.demandaAlta)
      .map(c => ({ tipo: 'sin_dato', capacidad: c.capacidad, demanda: c.demanda })),
    ...brechas.filter(b => b.severa)
      .map(b => ({ tipo: 'brecha_severa', capacidad: b.capacidad, demanda: b.demanda, nivel: b.nivel })),
  ];
  return {
    familiaId: familia.id,
    mitchell: familia.mitchell,
    evaluadas,
    cumplidas,
    compatibilidad: evaluadas > 0 ? Math.round((cumplidas / evaluadas) * 10000) / 10000 : null,
    cobertura: Math.round((evaluadas / CAPACIDADES_MATRIZ.length) * 10000) / 10000,
    brechas,
    brechasRelevantes,
    brechasSeveras,
    carencias,
    carenciasRelevantes,
    // Firme: sin carencias en demandas Alta/Muy alta ni capacidades relevantes, y sin brechas severas (R-DEC-02).
    firme: motivosNoFirme.length === 0,
    motivosNoFirme,
  };
}

/** Comparador del ranking: las familias firmes preceden a las provisionales aunque estas tengan mayor porcentaje.
 * Devuelve 0 en empate para conservar el orden de entrada.
 * @param {Object} a - resultado de evaluarFamilia.
 * @param {Object} b - resultado de evaluarFamilia.
 * @returns {number} valor de ordenación. */
export function compararFamilias(a, b) {
  const fa = a.firme === false ? 0 : 1;
  const fb = b.firme === false ? 0 : 1;
  if (fa !== fb) return fb - fa;
  const ca = a.compatibilidad ?? -1;
  const cb = b.compatibilidad ?? -1;
  if (ca !== cb) return cb - ca;
  if (a.carenciasRelevantes !== b.carenciasRelevantes) return a.carenciasRelevantes - b.carenciasRelevantes;
  if (a.brechasRelevantes !== b.brechasRelevantes) return a.brechasRelevantes - b.brechasRelevantes;
  if (a.brechasSeveras !== b.brechasSeveras) return a.brechasSeveras - b.brechasSeveras;
  if (a.cobertura !== b.cobertura) return b.cobertura - a.cobertura;
  return 0;
}

/** Evalúa y ordena todas las familias sin mutar la entrada.
 * @param {Object<string, string|null>} niveles - nivel o null por capacidad.
 * @param {Object[]} matriz - familias con sus demandas.
 * @returns {Object[]} resultados ordenados. */
export function ordenarFamilias(niveles, matriz) {
  return matriz.map(f => evaluarFamilia(niveles, f)).sort(compararFamilias);
}
