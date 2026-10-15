/* evaluacion/decision/ranking.js
   Etapa 8: ranking de las 13 familias. Toma la salida del motor tal
   cual (no reordena ni recalcula) y verifica que cubra las 13.
   Además deriva la RECOMENDACIÓN FIRME: la primera familia firme del
   ranking (sin carencias en demandas definitorias). Si la que lidera
   por compatibilidad no es firme, el informe lo advierte: liderar con
   la demanda definitoria sin evaluar (p. ej. fondo con VO2max Muy alta
   sin dato) es provisional, no una recomendación firme. */
import { FAMILIAS_DEPORTIVAS } from './familias.js';

export function construirRanking(resultadoMotor) {
  const lista = resultadoMotor?.salida?.compatibilidad?.ranking;
  if (!Array.isArray(lista)) {
    return { estado: 'pendiente', familias: null, advertencias: ['Ranking pendiente: requiere el DecisionEngine definitivo.'] };
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
  const lider = familias[0] ?? null;
  if (lider && !esFirme(lider)) {
    const queFalta = (lider.carencias ?? [])
      .map(c => `${c.capacidad} (demanda ${c.demanda})`).join(', ');
    advertencias.push(
      `${lider.nombre ?? lider.id} lidera por compatibilidad (${lider.porcentaje ?? '—'}%) ` +
      `pero tiene sin evaluar su demanda definitoria (${queFalta}): ` +
      'recomendación provisional, no firme.' +
      (recomendada
        ? ` Mejor opción con datos completos: ${recomendada.nombre ?? recomendada.id} (${recomendada.porcentaje ?? '—'}%).`
        : ' Ninguna familia tiene completas sus demandas definitorias.'),
    );
  }
  return {
    estado: faltan.length || desconocidas.length ? 'incompleto' : 'completo',
    familias,
    recomendada,
    advertencias,
  };
}
