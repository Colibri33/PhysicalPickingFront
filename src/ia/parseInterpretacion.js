/* parseInterpretacion.js — convierte la respuesta de la IA (JSON pedido en
   el prompt) en una estructura segura para mostrar.
   Formato actual: { resumen, fuertes[], mejorar[], deportes[], precaucion }.
   Se acepta también el formato anterior { lectura, fortalezas, mejorar[],
   deportes[], precauciones[] } para no romper respuestas ya generadas.
   Si el modelo no devolvió JSON válido, se devuelve { textoPlano } como respaldo. */

const lista = v => (Array.isArray(v) ? v.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 6) : []);

/* Normaliza a [{ titulo, detalle }]: acepta objetos { titulo, detalle } o textos sueltos. */
const items = v => (Array.isArray(v) ? v.map(x => {
  if (x && typeof x === 'object') {
    const titulo = String(x.titulo ?? '').trim();
    const detalle = String(x.detalle ?? x.texto ?? '').trim();
    return (titulo || detalle) ? { titulo, detalle } : null;
  }
  const s = String(x ?? '').trim();
  return s ? { titulo: '', detalle: s } : null;
}).filter(Boolean).slice(0, 6) : []);

export function parseInterpretacion(texto) {
  const crudo = String(texto ?? '').trim();
  const sinCerca = crudo.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const ini = sinCerca.indexOf('{');
  const fin = sinCerca.lastIndexOf('}');
  if (ini >= 0 && fin > ini) {
    try {
      const o = JSON.parse(sinCerca.slice(ini, fin + 1));
      const r = {
        resumen: String(o.resumen ?? o.lectura ?? '').trim(),
        fuertes: o.fuertes !== undefined ? items(o.fuertes) : items(o.fortalezas),
        mejorar: items(o.mejorar),
        deportes: (Array.isArray(o.deportes) ? o.deportes : []).slice(0, 3).map(d => ({
          nombre: String(d?.nombre ?? '').trim(),
          porcentaje: Number.isFinite(Number(d?.porcentaje)) && d?.porcentaje !== null ? Math.round(Number(d?.porcentaje)) : null,
          razon: String(d?.razon ?? '').trim(),
        })).filter(d => d.nombre),
        precaucion: String(o.precaucion ?? lista(o.precauciones).join('\n')).trim(),
      };
      if (r.resumen || r.fuertes.length || r.mejorar.length || r.deportes.length) return r;
    } catch { /* cae al texto plano */ }
  }
  return { textoPlano: crudo };
}
