/**
 * @module evaluacion/niveles
 * @description Escala ordinal de cinco niveles compartida con el DecisionEngine.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la definición de la escala.
 * Notas: expresa solo orden (categorías ordinales), no distancias iguales.
 */
export const NIVELES = Object.freeze(['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto']);

/** Verifica que un nivel pertenezca a la escala.
 * @param {string|null} nivel - nivel a comprobar.
 * @returns {boolean} true si es null o un elemento de NIVELES. */
export function esNivelValido(nivel) {
  return nivel === null || NIVELES.includes(nivel);
}
