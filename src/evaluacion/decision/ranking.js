/**
 * @module evaluacion/decision/ranking
 * @description Ranking de las 14 familias (etapa 8): valida la salida del motor y deriva la recomendación firme.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la presentación del ranking y la derivación de la recomendación.
 *  - D (Inversión de dependencias): consume la salida del motor tal cual (sin reordenar ni recalcular) y el catálogo de familias.
 * Notas: la recomendación firme es la primera familia firme (ver compatibilidad.js). R-DEC-03 (decisión propia, 2026-10): si ninguna es firme,
 * no se presenta ninguna recomendación; el flujo deriva al Estado 3 (Adaptación desde cero) o solicita datos (reglas/planAdaptacion.js).
 * R-DEC-04 (decisión propia, 2026-10): con solo 5 capacidades la compatibilidad toma pocos valores y los empates exactos son frecuentes; la regla no
 * los rompe de forma arbitraria: `empatadas` reúne todas las familias firmes que empatan con la recomendada tras aplicar todos los criterios del
 * comparador, y la salida las presenta como un conjunto. `recomendada` se conserva (primera del conjunto) por compatibilidad con registros guardados.
 * R-SEG-05 (2026-10): las restricciones por condición del PAR-Q+ (reglas/restriccionesPorCondicion.js) se aplican aquí, no en el motor, para que valgan
 * con cualquier motor: la familia restringida queda no firme con un motivo propio y el ranking se reordena con el mismo comparador; un bloqueo por
 * síntomas de alarma deja todas las familias no firmes y la salida lo informa en `bloqueoMedico`.
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
  return motivosNoFirme(fam).map(m => {
    if (m.tipo === 'valoracion_medica') return `valoración médica pendiente: manifestaste ${m.sintomas ?? 'dolor en el pecho o mareo o pérdida de consciencia'}`;
    if (m.tipo === 'restriccion_seguridad') return `restricción: manifestaste tener ${m.condicion}; no se recomiendan las familias con ${m.motivo}`;
    return m.tipo === 'brecha_severa'
      ? `${ETIQUETAS[m.capacidad] ?? m.capacidad}: ${m.nivel} frente a demanda ${m.demanda}`
      : `${ETIQUETAS[m.capacidad] ?? m.capacidad}: sin dato (demanda ${m.demanda})`;
  });
}

/** Etiqueta corta de por qué una familia no es recomendable: la seguridad prevalece sobre la brecha severa y esta sobre la falta de datos.
 * @param {Object} fam - familia del ranking.
 * @returns {string} "restricción de seguridad", "brecha severa" o "faltan datos". */
export function etiquetaNoFirme(fam) {
  const tipos = motivosNoFirme(fam).map(m => m.tipo);
  if (tipos.includes('valoracion_medica') || tipos.includes('restriccion_seguridad')) return 'restricción de seguridad';
  return tipos.includes('brecha_severa') ? 'brecha severa' : 'faltan datos';
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
 * @param {Object|null} [condiciones] - salida de aplicarRestriccionesPorCondicion (R-SEG-05); null si no hay PAR-Q+.
 * @returns {Object} estado, familias, recomendada, empatadas, bloqueoMedico, sinFamiliaCompatible y advertencias. */
export function construirRanking(resultadoMotor, condiciones = null) {
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
  const bloqueoMedico = condiciones?.bloqueo ?? null;
  const restricciones = condiciones?.familias ?? {};
  let hayRestriccion = false;
  const conNombre = lista.map(f => ({
    ...f,
    nombre: f.nombre ?? FAMILIAS_DEPORTIVAS.find(x => x.id === (f.id ?? f.familia))?.nombre ?? null,
  }));
  // R-SEG-05: la familia restringida (o todas, con bloqueo médico) queda no firme con su motivo.
  const aplicadas = conNombre.map(f => {
    const motivos = bloqueoMedico
      ? [{ tipo: 'valoracion_medica', condicion: 'síntomas de alarma', condiciones: bloqueoMedico.condiciones, sintomas: bloqueoMedico.sintomas }]
      : (restricciones[f.id ?? f.familia] ?? []).map(r => ({ tipo: 'restriccion_seguridad', condicion: r.condicion, motivo: r.motivo, restriccion: r.restriccion }));
    if (motivos.length === 0) return f;
    hayRestriccion = true;
    return { ...f, firme: false, motivosNoFirme: [...motivosNoFirme(f), ...motivos] };
  });
  // Con restricciones se reordena con el mismo comparador del motor (firmes primero); sin ellas se respeta el orden del motor.
  const ordenadas = hayRestriccion ? [...aplicadas].sort(compararFamilias) : aplicadas;
  const familias = ordenadas.map((f, i) => ({ posicion: i + 1, ...f }));
  // Los registros antiguos sin `firme` se consideran firmes para no reescribir el historial.
  const esFirme = (f) => f.firme !== false;
  const recomendada = familias.find(esFirme) ?? null;
  const empatadas = familiasEmpatadas(familias, recomendada);
  const sinFamiliaCompatible = familias.length > 0 && !recomendada;
  const lider = familias[0] ?? null;
  if (bloqueoMedico) {
    advertencias.push(`${bloqueoMedico.mensaje} No se muestra ningún deporte recomendado.`);
  } else if (sinFamiliaCompatible) {
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
    bloqueoMedico,
    sinFamiliaCompatible,
    advertencias,
  };
}
