/**
 * @module evaluacion/decision/matrizDemanda
 * @description Matriz de demandas por capacidad de las 13 familias y su correspondencia Mitchell (configuración del DecisionEngine).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la configuración de demandas y relevancia Mitchell.
 *  - O (Abierto/Cerrado): se ajusta la configuración (familias, relevancia) sin modificar la regla de compatibilidad.
 * Notas: no calcula (ver compatibilidad.js); los ids coinciden con FAMILIAS_DEPORTIVAS. Demandas: "Matriz de capacidades.xlsx" (Hoja1),
 * transcripción literal (Escalada/VO2max = Baja, confirmado). Mitchell: correspondencia ADOPTADA a partir del marco AHA/ACC (Levine et al.,
 * Circulation 2015; mitchell.pdf), no la clasificación original; p. ej. combate de golpeo/agarre → IIIA y danza → IIB. Relevancia v1
 * (configurable): dinámico C → VO2máx; estático III → fuerza.
 */

/** Niveles de demanda. */
export const DEMANDAS = Object.freeze(['Baja', 'Media', 'Alta', 'Muy alta']);

/** Cumplimiento ordinal sin números: la demanda es el nivel mínimo (Baja desde Bajo, Media desde Medio, Alta desde Alto, Muy alta solo Muy alto). "Muy bajo" no cumple ninguna. */
export const CUMPLE_DESDE = Object.freeze({
  Baja: Object.freeze(['Bajo', 'Medio', 'Alto', 'Muy alto']),
  Media: Object.freeze(['Medio', 'Alto', 'Muy alto']),
  Alta: Object.freeze(['Alto', 'Muy alto']),
  'Muy alta': Object.freeze(['Muy alto']),
});

/** Demandas que, incumplidas con nivel bajo, constituyen brecha severa (v1, configurable). */
export const DEMANDA_ALTA = Object.freeze(['Alta', 'Muy alta']);
/** Niveles que cuentan como bajos en una brecha severa. */
export const NIVEL_BAJO = Object.freeze(['Muy bajo', 'Bajo']);

/** Capacidades relevantes por componente Mitchell (v1). */
export const RELEVANCIA_MITCHELL = Object.freeze({
  dinamico: Object.freeze({ A: [], B: [], C: ['vo2max'] }),
  estatico: Object.freeze({ I: [], II: [], III: ['fuerza'] }),
});

/** Capacidades que evalúa la matriz. */
export const CAPACIDADES_MATRIZ = Object.freeze(
  ['fuerza', 'fuerza_explosiva', 'vo2max', 'flexibilidad', 'equilibrio'],
);

/** Construye una familia de la matriz.
 * @param {string} id - id de la familia.
 * @param {string} mitchell - clasificación combinada.
 * @param {string} estatico - componente estático (I-III).
 * @param {string} dinamico - componente dinámico (A-C).
 * @param {Object<string, string>} demandas - demanda por capacidad.
 * @returns {Object} familia. */
const F = (id, mitchell, estatico, dinamico, demandas) => ({ id, mitchell, estatico, dinamico, demandas });

/** Matriz de demandas de las 13 familias. */
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

/** Obtiene las capacidades fisiológicamente relevantes de una familia según Mitchell v1.
 * @param {Object} familia - entrada de MATRIZ_DEMANDA.
 * @returns {string[]} ids de capacidades. */
export function capacidadesRelevantes(familia) {
  const rel = new Set([
    ...(RELEVANCIA_MITCHELL.dinamico[familia.dinamico] ?? []),
    ...(RELEVANCIA_MITCHELL.estatico[familia.estatico] ?? []),
  ]);
  return [...rel];
}
