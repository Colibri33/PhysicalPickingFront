/* evaluacion/decision/ranking.js
   Etapa 8: ranking de las 13 familias. Toma la salida del motor tal
   cual (no reordena ni recalcula) y verifica que cubra las 13.
   Además deriva la RECOMENDACIÓN FIRME: la primera familia firme del
   ranking (sin carencias en demandas definitorias y sin brechas
   severas, ver compatibilidad.js).
   R-DEC-03 (decision propia, 2026-10): si ninguna familia es firme NO
   se presenta ninguna familia como recomendación (no se "rellena" con
   la primera del ranking). El flujo deriva entonces el Estado 3
   (Adaptación desde cero) o pide los datos faltantes, ver
   reglas/planAdaptacion.js. */
import { FAMILIAS_DEPORTIVAS } from './familias.js';

const ETIQUETAS = {
  fuerza: 'fuerza',
  fuerza_explosiva: 'fuerza explosiva',
  vo2max: 'resistencia aeróbica',
  flexibilidad: 'flexibilidad',
  equilibrio: 'equilibrio',
};

/** Motivos por los que una familia no es firme (compatible con registros antiguos). */
export function motivosNoFirme(fam) {
  if (Array.isArray(fam?.motivosNoFirme)) return fam.motivosNoFirme;
  // Registros anteriores a R-DEC-02: solo existian carencias.
  return (fam?.carencias ?? [])
    .filter(c => c.relevanteMitchell || c.demandaAlta || c.demanda === 'Alta' || c.demanda === 'Muy alta')
    .map(c => ({ tipo: 'sin_dato', capacidad: c.capacidad, demanda: c.demanda }));
}

/** Texto legible de los motivos (p. ej. "fuerza explosiva: Muy bajo frente a demanda Muy alta"). */
export function textoMotivosNoFirme(fam) {
  return motivosNoFirme(fam).map(m => (m.tipo === 'brecha_severa'
    ? `${ETIQUETAS[m.capacidad] ?? m.capacidad}: ${m.nivel} frente a demanda ${m.demanda}`
    : `${ETIQUETAS[m.capacidad] ?? m.capacidad}: sin dato (demanda ${m.demanda})`));
}

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
  // Recomendación firme: primera familia firme (registros antiguos del
  // motor no traen `firme`: se consideran firmes para no reescribir
  // el historial).
  const esFirme = (f) => f.firme !== false;
  const recomendada = familias.find(esFirme) ?? null;
  const sinFamiliaCompatible = familias.length > 0 && !recomendada;
  const lider = familias[0] ?? null;
  if (sinFamiliaCompatible) {
    advertencias.push(
      'Ninguna familia deportiva puede presentarse como recomendación firme con el perfil actual: ' +
      'no se muestra un deporte recomendado (ver plan de adaptación o datos faltantes).',
    );
  } else if (lider && !esFirme(lider)) {
    // Solo ocurre en registros guardados con el orden anterior.
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
    sinFamiliaCompatible,
    advertencias,
  };
}
