/**
 * @module evaluacion/decision/familias
 * @description Catálogo de las 13 familias deportivas confirmadas (solo identificación).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el catálogo de familias.
 * Notas: sirve para validar la salida del motor y armar el informe. La matriz de demandas está en matrizDemanda.js y la regla en
 * compatibilidad.js. Verificar que los ids coincidan con familias.json del motor.
 */
/** Familias deportivas con id y nombre. */
export const FAMILIAS_DEPORTIVAS = [
  { id: 'deportes_equipo', nombre: 'Deportes de equipo' },
  { id: 'voleibol', nombre: 'Voleibol' },
  { id: 'natacion', nombre: 'Natacion' },
  { id: 'ciclismo', nombre: 'Ciclismo' },
  { id: 'atletismo_fondo', nombre: 'Atletismo de fondo' },
  { id: 'atletismo_velocidad', nombre: 'Atletismo de velocidad' },
  { id: 'senderismo_montanismo', nombre: 'Senderismo / montanismo' },
  { id: 'combate_golpeo', nombre: 'Combate de golpeo' },
  { id: 'combate_agarre', nombre: 'Combate de agarre' },
  { id: 'raqueta', nombre: 'Raqueta' },
  { id: 'danza', nombre: 'Danza' },
  { id: 'deportes_fuerza', nombre: 'Deportes de fuerza' },
  { id: 'escalada', nombre: 'Escalada' },
];
