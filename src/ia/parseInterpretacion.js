/**
 * @module ia/parseInterpretacion
 * @description Convierte la respuesta JSON de la IA en una estructura segura para la interfaz.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el formato de respuesta esperado de la IA.
 * Notas: acepta el formato actual ({resumen, fuertes, mejorar, deportes, precaucion}) y el anterior ({lectura, fortalezas, mejorar, precauciones});
 * si no hay JSON válido devuelve { textoPlano } como respaldo.
 */

const texto = v => String(v ?? '').trim();

/** Normaliza una lista de hasta 4 elementos a { titulo, detalle }.
 * @param {*} v - lista cruda (cadenas u objetos).
 * @returns {Array<{titulo: string, detalle: string}>} elementos no vacíos. */
function items(v) {
  return (Array.isArray(v) ? v : []).slice(0, 4).map(x => (
    typeof x === 'string'
      ? { titulo: '', detalle: texto(x) }
      : { titulo: texto(x?.titulo), detalle: texto(x?.detalle) }
  )).filter(x => x.titulo || x.detalle);
}

/** Interpreta la respuesta cruda de la IA, tolerando cercas de código y texto adicional.
 * @param {string} crudoEntrada - respuesta textual de la IA.
 * @returns {Object} estructura {resumen, fuertes, mejorar, precaucion, deportes} o { textoPlano } si no es interpretable. */
export function parseInterpretacion(crudoEntrada) {
  const crudo = texto(crudoEntrada);
  const sinCerca = crudo.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const ini = sinCerca.indexOf('{');
  const fin = sinCerca.lastIndexOf('}');
  if (ini >= 0 && fin > ini) {
    try {
      const o = JSON.parse(sinCerca.slice(ini, fin + 1));
      const precViejo = Array.isArray(o.precauciones) ? o.precauciones.map(texto).filter(Boolean)[0] : '';
      const r = {
        resumen: texto(o.resumen ?? o.lectura),
        fuertes: items(o.fuertes ?? o.fortalezas),
        mejorar: items(o.mejorar),
        precaucion: texto(o.precaucion) || precViejo || '',
        deportes: (Array.isArray(o.deportes) ? o.deportes : []).slice(0, 3).map(d => ({
          nombre: texto(d?.nombre),
          porcentaje: d?.porcentaje !== null && d?.porcentaje !== undefined && d?.porcentaje !== '' && Number.isFinite(Number(d.porcentaje)) ? Math.round(Number(d.porcentaje)) : null,
          razon: texto(d?.razon),
        })).filter(d => d.nombre),
      };
      if (r.resumen || r.fuertes.length || r.mejorar.length || r.deportes.length) return r;
    } catch { /* cae al texto plano */ }
  }
  return { textoPlano: crudo };
}
