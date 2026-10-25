/**
 * @module test/ayudas/parq
 * @description Ayuda de pruebas: respuestas completas del PAR-Q+ con "Sí" solo en los ids indicados.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la construcción de respuestas de prueba del PAR-Q+.
 * Notas: un id de condición (c1..c10) abre la sección de seguimiento con la pregunta general g4 si no hay otra general en Sí; el resto de las
 * preguntas visibles se responde "No".
 */

import { todasVisibles, pendientes } from '../../src/logic/parq.js';

/** Construye respuestas completas del PAR-Q+.
 * @param {...string} si - ids respondidos "Sí" (g1..g7, c1..c10 y subpreguntas como c7d).
 * @returns {Object<string, string>} respuestas por id. */
export function parqCon(...si) {
  const r = {};
  for (const id of si) r[id] = 'si';
  if (si.some(id => id.startsWith('c')) && !si.some(id => /^g\d$/.test(id))) r.g4 = 'si';
  for (let i = 0; i < 6 && pendientes(r).length > 0; i += 1) {
    for (const p of todasVisibles(r)) if (!r[p.id]) r[p.id] = 'no';
  }
  return r;
}
