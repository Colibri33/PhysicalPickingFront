/* ═══════════════════════════════════════════════════════════════
   evaluacion/decision/compatibilidad.js
   Regla de compatibilidad + desempate Mitchell (referencia auditable
   del DecisionEngine). Funciones puras, sin números sobre niveles:
   - cumpleDemanda(): tabla ordinal CUMPLE_DESDE (cumple / no cumple).
   - Compatibilidad = requisitos cumplidos / requisitos evaluados
     (solo capacidades CON dato; sin dato no penaliza, baja cobertura).
   - Cobertura = capacidades evaluadas / 5.
   - Carencias v1.1 (decision propia, auditable): demandas NO EVALUABLES
     por falta de dato. Una carencia en demanda Alta/Muy alta o en
     capacidad Mitchell-relevante deja a la familia como NO FIRME: su
     porcentaje no se toca (sigue sin penalizar), pero no puede
     encabezar por delante de familias firmes en empates ni
     presentarse como recomendación firme (ver ranking.js). Motivo:
     la demanda es el nivel mínimo exigible; recomendar en primer
     lugar una familia sin haber evaluado su demanda definitoria
     (p. ej. fondo con VO2max Muy alta sin dato) es una mala
     aplicación de la matriz, aunque el porcentaje sea 100% de lo
     evaluado.
   - Mitchell NO modifica el porcentaje: solo cuenta brechas en
     capacidades relevantes para desempatar.
   - Orden del ranking: compatibilidad ↓, carencias relevantes ↑ (menos),
     brechas relevantes ↑ (menos), brechas severas ↑ (menos),
     cobertura ↓, empates permitidos (orden estable, sin desempate
     arbitrario).
   ═══════════════════════════════════════════════════════════════ */

import {
  CAPACIDADES_MATRIZ, CUMPLE_DESDE, DEMANDA_ALTA, NIVEL_BAJO,
  capacidadesRelevantes,
} from './matrizDemanda.js';

/** ¿El nivel cumple la demanda? (false si falta el nivel o la demanda es desconocida). */
export function cumpleDemanda(nivel, demanda) {
  if (nivel == null) return null; // sin dato: no evaluable
  return (CUMPLE_DESDE[demanda] ?? []).includes(nivel);
}

/** ¿La brecha es severa? (demanda Alta/Muy alta incumplida en nivel Muy bajo/Bajo). */
export function esBrechaSevera(nivel, demanda) {
  return DEMANDA_ALTA.includes(demanda) && NIVEL_BAJO.includes(nivel);
}

/**
 * evaluarFamilia — compatibilidad de un perfil de niveles contra una familia.
 * @param {{[cap]: nivel|null}} niveles (NIVELES o null por capacidad)
 * @param {object} familia (entrada de MATRIZ_DEMANDA)
 */
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
      // Sin dato: fuera del numerador Y del denominador (no penaliza),
      // pero se registra la carencia para firmeza y desempate.
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
    // Firme = todas sus demandas definitorias evaluadas: ninguna
    // carencia en demanda Alta/Muy alta ni en capacidad relevante.
    firme: carenciasRelevantes === 0 && !carencias.some(c => c.demandaAlta),
  };
}

/** Orden del ranking (empates permitidos: devuelve 0 y conserva el orden de entrada).
   Las familias firmes (todas sus demandas definitorias evaluadas) van primero;
   las provisionales (carencia en demanda Alta/Muy alta o capacidad Mitchell-relevante)
   van después, aunque tengan alto porcentaje. */
export function compararFamilias(a, b) {
  // Primero las firmes (firme !== false), luego las provisionales
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

/** Evalúa y ordena todas las familias (no muta la entrada). */
export function ordenarFamilias(niveles, matriz) {
  return matriz.map(f => evaluarFamilia(niveles, f)).sort(compararFamilias);
}
