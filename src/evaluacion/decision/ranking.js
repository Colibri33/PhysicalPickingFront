/**
 * @module evaluacion/decision/ranking
 * @description Ranking de las 13 familias (etapa 8): valida la salida del motor y deriva la recomendación firme.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la presentación del ranking y la derivación de la recomendación.
 *  - D (Inversión de dependencias): consume la salida del motor tal cual (sin reordenar ni recalcular) y el catálogo de familias.
 * Notas: la recomendación firme es la primera familia firme (ver compatibilidad.js). R-DEC-03 (decisión propia, 2026-10): si ninguna es firme,
 * no se presenta ninguna recomendación; el flujo deriva al Estado 3 (Adaptación desde cero) o solicita datos (reglas/planAdaptacion.js).
 * R-DEC-04 (decisión propia, 2026-10): con solo 5 capacidades la compatibilidad toma pocos valores y los empates exactos son frecuentes; la regla no
 * los rompe de forma arbitraria: `empatadas` reúne todas las familias firmes que empatan con la recomendada tras aplicar todos los criterios del
 * comparador, y la salida las presenta como un conjunto. `recomendada` se conserva (primera del conjunto) por compatibilidad con registros guardados.
 */
import { FAMILIAS_DEPORTIVAS } from './familias.js';
import { compararFamilias } from './compatibilidad.js';

/** Etiquetas legibles de las capacidades. */
const ETIQUETAS = {
  fuerza: 'fuerza',
  fuerza_explosiva: 'fuerza explosiva',
  vo2max: 'resistencia aeróbica',
  flexibilidad: 'flexibilidad',
  equilibrio: 'equilibrio',
};

/** Obtiene los motivos por los que una familia no es firme, compatible con registros antiguos.
 * @param {Object} fam - familia del ranking.
 * @returns {Object[]} motivos. */
export function motivosNoFirme(fam) {
  if (Array.isArray(fam?.motivosNoFirme)) return fam.motivosNoFirme;
  // Registros anteriores a R-DEC-02 solo contenían carencias.
  return (fam?.carencias ?? [])
    .filter(c => c.relevanteMitchell || c.demandaAlta || c.demanda === 'Alta' || c.demanda === 'Muy alta')
    .map(c => ({ tipo: 'sin_dato', capacidad: c.capacidad, demanda: c.demanda }));
}

/** Genera el texto legible de los motivos (p. ej. "fuerza explosiva: Muy bajo frente a demanda Muy alta").
 * @param {Object} fam - familia del ranking.
 * @returns {string[]} textos. */
export function textoMotivosNoFirme(fam) {
  return motivosNoFirme(fam).map(m => (m.tipo === 'brecha_severa'
    ? `${ETIQUETAS[m.capacidad] ?? m.capacidad}: ${m.nivel} frente a demanda ${m.demanda}`
    : `${ETIQUETAS[m.capacidad] ?? m.capacidad}: sin dato (demanda ${m.demanda})`));
}

/** Reúne las familias firmes que empatan con la recomendada según todos los criterios del comparador.
 * @param {Object[]} familias - ranking ordenado por el motor.
 * @param {Object|null} recomendada - primera familia firme.
 * @returns {Object[]} familias empatadas (incluye la recomendada, primera); vacío si no hay recomendada. */
function familiasEmpatadas(familias, recomendada) {
  if (!recomendada) return [];
  const comparable = (f) => typeof f.compatibilidad === 'number';
  if (!comparable(recomendada)) return [recomendada];
  return familias.filter(f => f === recomendada
    || (f.firme !== false && comparable(f) && compararFamilias(f, recomendada) === 0));
}

/** Texto legible de la recomendación firme; incluye todas las familias empatadas.
 * @param {{recomendada?: Object|null, empatadas?: Object[]}} ranking - salida de construirRanking (o su copia guardada).
 * @returns {string|null} texto sin punto final, o null si no hay recomendación. */
export function textoRecomendacion(ranking) {
  const lista = ranking?.empatadas?.length ? ranking.empatadas : (ranking?.recomendada ? [ranking.recomendada] : []);
  if (lista.length === 0) return null;
  const nombres = lista.map(f => f.nombre ?? f.id);
  const pct = lista[0].porcentaje ?? '—';
  if (nombres.length === 1) return `${nombres[0]} (${pct}% de compatibilidad)`;
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}: empatadas con ${pct}% de compatibilidad`;
}

/** Construye el ranking validado y la recomendación firme a partir de la salida del motor.
 * @param {Object} resultadoMotor - resultado de ejecutarDecisionEngine.
 * @returns {Object} estado, familias, recomendada, empatadas, sinFamiliaCompatible y advertencias. */
export function construirRanking(resultadoMotor) {
  const lista = resultadoMotor?.salida?.compatibilidad?.ranking;
  if (!Array.isArray(lista)) {
    return {
      estado: 'pendiente', familias: null, recomendada: null, sinFamiliaCompatible: false,
      advertencias: ['Ranking pendiente: requiere el DecisionEngine definitivo.'],
    };
  }
  const advertencias = [];
  const idsMotor = lista.map(f => f.id ?? f.familia);
  const faltan = FAMILIAS_DEPORTIVAS.filter(f => !idsMotor.includes(f.id)).map(f => f.id);
  const desconocidas = idsMotor.filter(id => !FAMILIAS_DEPORTIVAS.some(f => f.id === id));
  if (faltan.length) advertencias.push(`El motor no devolvio estas familias: ${faltan.join(', ')}.`);
  if (desconocidas.length) advertencias.push(`El motor devolvio familias no reconocidas: ${desconocidas.join(', ')}.`);
  const familias = lista.map((f, i) => ({
    posicion: i + 1,
    ...f,
    nombre: f.nombre ?? FAMILIAS_DEPORTIVAS.find(x => x.id === (f.id ?? f.familia))?.nombre ?? null,
  }));
  // Los registros antiguos sin `firme` se consideran firmes para no reescribir el historial.
  const esFirme = (f) => f.firme !== false;
  const recomendada = familias.find(esFirme) ?? null;
  const empatadas = familiasEmpatadas(familias, recomendada);
  const sinFamiliaCompatible = familias.length > 0 && !recomendada;
  const lider = familias[0] ?? null;
  if (sinFamiliaCompatible) {
    advertencias.push(
      'Ninguna familia deportiva puede presentarse como recomendación firme con el perfil actual: ' +
      'no se muestra un deporte recomendado (ver plan de adaptación o datos faltantes).',
    );
  } else if (lider && !esFirme(lider)) {
    // Solo en registros guardados con el orden anterior.
    advertencias.push(
      `${lider.nombre ?? lider.id} lidera por compatibilidad (${lider.porcentaje ?? '—'}%) ` +
      `pero no es recomendable (${textoMotivosNoFirme(lider).join('; ')}). ` +
      `Recomendación firme: ${recomendada.nombre ?? recomendada.id} (${recomendada.porcentaje ?? '—'}%).`,
    );
  }
  return {
    estado: faltan.length || desconocidas.length ? 'incompleto' : 'completo',
    familias,
    recomendada,
    empatadas,
    sinFamiliaCompatible,
    advertencias,
  };
}
