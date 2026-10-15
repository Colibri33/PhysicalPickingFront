/* evaluacion/niveles.js
   Escala ordinal compartida con el DecisionEngine. Solo expresa
   orden (categorias ordinales), no distancias iguales. */
export const NIVELES = Object.freeze(['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto']);

export function esNivelValido(nivel) {
  return nivel === null || NIVELES.includes(nivel);
}
