/* parseInterpretacion.js — convierte la respuesta de la IA (JSON pedido en
   el prompt) en una estructura segura para mostrar. Si el modelo no
   devolvió JSON válido, se devuelve { textoPlano } como respaldo. */
const lista = v => (Array.isArray(v) ? v.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 6) : []);

export function parseInterpretacion(texto) {
  const crudo = String(texto ?? '').trim();
  const sinCerca = crudo.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const ini = sinCerca.indexOf('{');
  const fin = sinCerca.lastIndexOf('}');
  if (ini >= 0 && fin > ini) {
    try {
      const o = JSON.parse(sinCerca.slice(ini, fin + 1));
      const r = {
        lectura: typeof o.lectura === 'string' ? o.lectura.trim() : '',
        fortalezas: lista(o.fortalezas),
        mejorar: lista(o.mejorar),
        precauciones: lista(o.precauciones),
        deportes: (Array.isArray(o.deportes) ? o.deportes : []).slice(0, 3).map(d => ({
          nombre: String(d?.nombre ?? '').trim(),
          porcentaje: Number.isFinite(Number(d?.porcentaje)) && d?.porcentaje !== null ? Math.round(Number(d.porcentaje)) : null,
          razon: String(d?.razon ?? '').trim(),
        })).filter(d => d.nombre),
      };
      if (r.lectura || r.fortalezas.length || r.mejorar.length || r.deportes.length) return r;
    } catch { /* cae al texto plano */ }
  }
  return { textoPlano: crudo };
}
