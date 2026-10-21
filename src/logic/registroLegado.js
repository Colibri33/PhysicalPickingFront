/**
 * @module logic/registroLegado
 * @description Adaptador idempotente de registros anteriores a v6 (módulo cognitivo y clave "corporales") y retiro de % grasa y % muscular.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el formato de migración de registros históricos.
 * Notas: corporales pasa a antropometricas y ajCorp a ajAntrop; realesC, cognitivas y ajCog se conservan intactos en `_legado`
 * para no perder datos históricos. El `total` histórico no se recalcula (incluía el ajuste cognitivo).
 * Copia espejo en el backend: src/utils/registroLegado.js.
 */

/** Detecta si un registro conserva estructuras anteriores a v6.
 * @param {Object} r - registro guardado.
 * @returns {boolean} true si requiere migración. */
export function esRegistroLegado(r) {
  return !!r && typeof r === 'object' &&
    ('corporales' in r || 'realesC' in r || 'cognitivas' in r ||
      'grasa' in (r.antropometricas ?? {}) || 'muscular' in (r.antropometricas ?? {}) ||
      Object.values(r.consolidado ?? {}).some(c => c && typeof c === 'object' && ('ajCorp' in c || 'ajCog' in c)));
}

/** Migra un registro previo a v6 al formato vigente, preservando los datos retirados en `_legado`.
 * @param {Object} registro - registro guardado.
 * @returns {Object} registro migrado, o el mismo si no es legado. */
export function migrarRegistroLegado(registro) {
  if (!esRegistroLegado(registro)) return registro;
  const { corporales, realesC, cognitivas, ...resto } = registro;
  const ajCogPorVariable = {};
  const consolidado = Object.fromEntries(Object.entries(resto.consolidado ?? {}).map(([id, c]) => {
    if (!c || typeof c !== 'object') return [id, c];
    const { ajCog, ajCorp, ...otros } = c;
    if (ajCog !== undefined) ajCogPorVariable[id] = ajCog;
    return [id, { ...otros, ajAntrop: otros.ajAntrop ?? ajCorp ?? 0 }];
  }));
  return retirarGrasaMuscular({
    ...resto,
    antropometricas: resto.antropometricas ?? corporales ?? {},
    consolidado,
    _legado: {
      ...(resto._legado ?? {}),
      migradoDesde: 'v5_cognitivo_corporales',
      nota: 'El total consolidado historico incluye el ajuste cognitivo eliminado en v6.',
      ...(realesC !== undefined ? { realesC } : {}),
      ...(cognitivas !== undefined ? { cognitivas } : {}),
      ...(Object.keys(ajCogPorVariable).length ? { ajCog: ajCogPorVariable } : {}),
    },
  });
}

/** Mueve % grasa y % muscular de antropometricas a `_legado.antropometriaRetirada`.
 * @param {Object} registro - registro guardado.
 * @returns {Object} registro sin esos campos en la sección activa. */
export function retirarGrasaMuscular(registro) {
  const a = registro?.antropometricas;
  if (!a || typeof a !== 'object' || (!('grasa' in a) && !('muscular' in a))) return registro;
  const { grasa, muscular, ...resto } = a;
  return {
    ...registro,
    antropometricas: resto,
    _legado: {
      ...(registro._legado ?? {}),
      antropometriaRetirada: {
        ...(registro._legado?.antropometriaRetirada ?? {}),
        ...(grasa !== undefined ? { grasa } : {}),
        ...(muscular !== undefined ? { muscular } : {}),
      },
    },
  };
}
