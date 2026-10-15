/* evaluacion/decision/familias.js
   Las 13 familias deportivas confirmadas. Solo identificacion para
   validar la salida del motor y armar el informe. La matriz de
   demanda + Mitchell de referencia vive en matrizDemanda.js y la
   regla auditable en compatibilidad.js (el DecisionEngine externo
   debe reproducirla; no se duplica aqui).
   Verificar que estos ids coincidan con familias.json del motor. */
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
