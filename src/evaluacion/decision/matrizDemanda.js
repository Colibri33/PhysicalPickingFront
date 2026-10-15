/* ═══════════════════════════════════════════════════════════════
   evaluacion/decision/matrizDemanda.js
   Matriz de demandas de las 13 familias + correspondencia Mitchell.
   CONFIGURACIÓN del DecisionEngine (referencia auditable; el motor
   externo debe reproducir esta regla). No calcula: ver
   compatibilidad.js. Los ids coinciden con FAMILIAS_DEPORTIVAS.

   Fuentes:
   - Demandas por capacidad: "Matriz de capacidades.xlsx" (Hoja1),
     transcripción literal (Escalada/VO2max = Baja, confirmado).
   - Mitchell: correspondencia ADOPTADA para las familias de
     PhysicalPicking a partir del marco AHA/ACC (Levine et al.,
     Circulation 2015; mitchell.pdf). NO se presenta como
     clasificación original de Mitchell: si una familia no aparece
     literal en la fuente, aquí queda documentada la equivalencia
     adoptada (p. ej. "Combate de golpeo/agarre" → IIIA por boxeo/
     lucha; "Danza" → IIB por gimnasia/baile de intensidad moderada).
   - Relevancia Mitchell v1 (configurable): componente dinámico C →
     VO2max relevante; componente estático III → fuerza relevante.
     A/B/I/II no marcan nada automáticamente en v1.
   ═══════════════════════════════════════════════════════════════ */

export const DEMANDAS = Object.freeze(['Baja', 'Media', 'Alta', 'Muy alta']);

/* Cumplimiento ordinal SIN números (demanda = nivel mínimo):
   Baja → desde Bajo; Media → desde Medio; Alta → desde Alto;
   Muy alta → solo Muy alto. "Muy bajo" no cumple ninguna. */
export const CUMPLE_DESDE = Object.freeze({
  Baja: Object.freeze(['Bajo', 'Medio', 'Alto', 'Muy alto']),
  Media: Object.freeze(['Medio', 'Alto', 'Muy alto']),
  Alta: Object.freeze(['Alto', 'Muy alto']),
  'Muy alta': Object.freeze(['Muy alto']),
});

/* Brecha severa v1 (configurable): demanda Alta/Muy alta incumplida
   con nivel Muy bajo o Bajo. */
export const DEMANDA_ALTA = Object.freeze(['Alta', 'Muy alta']);
export const NIVEL_BAJO = Object.freeze(['Muy bajo', 'Bajo']);

/* Relevancia fisiológica por componente Mitchell (v1). */
export const RELEVANCIA_MITCHELL = Object.freeze({
  dinamico: Object.freeze({ A: [], B: [], C: ['vo2max'] }),
  estatico: Object.freeze({ I: [], II: [], III: ['fuerza'] }),
});

export const CAPACIDADES_MATRIZ = Object.freeze(
  ['fuerza', 'fuerza_explosiva', 'vo2max', 'flexibilidad', 'equilibrio'],
);

const F = (id, mitchell, estatico, dinamico, demandas) => ({ id, mitchell, estatico, dinamico, demandas });

export const MATRIZ_DEMANDA = Object.freeze([
  F('deportes_equipo', 'IC', 'I', 'C', { fuerza: 'Alta', fuerza_explosiva: 'Alta', vo2max: 'Alta', flexibilidad: 'Media', equilibrio: 'Media' }),
  F('voleibol', 'IB', 'I', 'B', { fuerza: 'Media', fuerza_explosiva: 'Muy alta', vo2max: 'Media', flexibilidad: 'Media', equilibrio: 'Alta' }),
  F('natacion', 'IIC', 'II', 'C', { fuerza: 'Alta', fuerza_explosiva: 'Media', vo2max: 'Muy alta', flexibilidad: 'Alta', equilibrio: 'Media' }),
  F('ciclismo', 'IIIC', 'III', 'C', { fuerza: 'Media', fuerza_explosiva: 'Media', vo2max: 'Muy alta', flexibilidad: 'Baja', equilibrio: 'Baja' }),
  F('atletismo_fondo', 'IC', 'I', 'C', { fuerza: 'Baja', fuerza_explosiva: 'Media', vo2max: 'Muy alta', flexibilidad: 'Media', equilibrio: 'Baja' }),
  F('atletismo_velocidad', 'IIB', 'II', 'B', { fuerza: 'Baja', fuerza_explosiva: 'Muy alta', vo2max: 'Baja', flexibilidad: 'Media', equilibrio: 'Media' }),
  F('senderismo_montanismo', 'IC', 'I', 'C', { fuerza: 'Alta', fuerza_explosiva: 'Baja', vo2max: 'Alta', flexibilidad: 'Media', equilibrio: 'Alta' }),
  F('combate_golpeo', 'IIIA', 'III', 'A', { fuerza: 'Media', fuerza_explosiva: 'Alta', vo2max: 'Media', flexibilidad: 'Alta', equilibrio: 'Alta' }),
  F('combate_agarre', 'IIIA', 'III', 'A', { fuerza: 'Muy alta', fuerza_explosiva: 'Alta', vo2max: 'Media', flexibilidad: 'Media', equilibrio: 'Alta' }),
  F('raqueta', 'IIC', 'II', 'C', { fuerza: 'Media', fuerza_explosiva: 'Alta', vo2max: 'Media', flexibilidad: 'Media', equilibrio: 'Alta' }),
  F('danza', 'IIB', 'II', 'B', { fuerza: 'Media', fuerza_explosiva: 'Alta', vo2max: 'Media', flexibilidad: 'Muy alta', equilibrio: 'Muy alta' }),
  F('deportes_fuerza', 'IIIA', 'III', 'A', { fuerza: 'Muy alta', fuerza_explosiva: 'Alta', vo2max: 'Baja', flexibilidad: 'Media', equilibrio: 'Media' }),
  F('escalada', 'IIIA', 'III', 'A', { fuerza: 'Muy alta', fuerza_explosiva: 'Alta', vo2max: 'Baja', flexibilidad: 'Alta', equilibrio: 'Muy alta' }),
]);

/** Capacidades fisiológicamente relevantes de una familia según Mitchell v1. */
export function capacidadesRelevantes(familia) {
  const rel = new Set([
    ...(RELEVANCIA_MITCHELL.dinamico[familia.dinamico] ?? []),
    ...(RELEVANCIA_MITCHELL.estatico[familia.estatico] ?? []),
  ]);
  return [...rel];
}
