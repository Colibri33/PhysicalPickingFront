/**
 * @module evaluacion/normalizacion/baremos
 * @description Contrato, validación y aplicación de baremos para normalizar valores a niveles ordinales (etapa 4).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la mecánica de normalización por baremo.
 *  - O (Abierto/Cerrado): nuevos baremos se incorporan como datos ('cortes_ordenados') o como función ('funcion') sin modificar este módulo.
 *  - D (Inversión de dependencias): opera sobre el contrato del baremo y un registro inyectado, no sobre baremos concretos.
 * Notas: contrato de un baremo: { id, capacidad, version, fuente: {referencia, origen}, tipo: 'cortes_ordenados' | 'funcion' }.
 * 'cortes_ordenados' añade direccion ('mayor_mejor'|'menor_mejor'), limite ('inferior_inclusivo'|'superior_inclusivo') y
 * grupos [{ sexo, edadMin, edadMax, cortes }] con N-1 cortes para N niveles; 'funcion' añade clasificar(valor, contexto) → nivel.
 * `redondeo: 'entero'` (opcional, R-BAR-03): las tablas AFISAL se publican en enteros, así que el valor medido se redondea al entero más
 * cercano (mitades hacia arriba) antes de clasificar; así no quedan huecos entre bandas ni el "Muy alto >111" se pierde con 111,5.
 * El valor usado queda en baremoAplicado.valorClasificado.
 * Sin baremo registrado, la capacidad queda con nivel = null y la advertencia "baremo pendiente".
 */

import { NIVELES, esNivelValido } from '../niveles.js';

/** Crea un registro de baremos validando cada definición.
 * @param {Object[]} baremos - definiciones de baremo.
 * @returns {Map<string, Object>} registro indexado por id.
 * @throws {Error} si alguna definición es inválida. */
export function crearRegistroBaremos(baremos = []) {
  const registro = new Map();
  for (const b of baremos) {
    const errores = validarDefinicionBaremo(b);
    if (errores.length) throw new Error(`Baremo "${b?.id}" invalido: ${errores.join(' ')}`);
    registro.set(b.id, b);
  }
  return registro;
}

/** Valida la estructura de una definición de baremo.
 * @param {Object} b - definición de baremo.
 * @returns {string[]} errores encontrados; vacío si es válida. */
export function validarDefinicionBaremo(b) {
  const e = [];
  if (!b || typeof b !== 'object') return ['No es un objeto.'];
  if (!b.id) e.push('Falta id.');
  if (!b.fuente?.referencia || !b.fuente?.origen) e.push('Falta fuente.referencia u fuente.origen (trazabilidad obligatoria).');
  if (b.tipo === 'cortes_ordenados') {
    if (!['mayor_mejor', 'menor_mejor'].includes(b.direccion)) e.push('direccion invalida.');
    if (!['inferior_inclusivo', 'superior_inclusivo'].includes(b.limite)) e.push('limite invalido.');
    if (b.redondeo !== undefined && b.redondeo !== 'entero') e.push('redondeo invalido (solo "entero").');
    if (!Array.isArray(b.grupos) || b.grupos.length === 0) e.push('Faltan grupos.');
    (b.grupos ?? []).forEach((g, i) => {
      if (!Array.isArray(g.cortes) || g.cortes.length !== NIVELES.length - 1) e.push(`grupos[${i}]: se esperan ${NIVELES.length - 1} cortes.`);
      else if (g.cortes.some((c, j) => j > 0 && c < g.cortes[j - 1])) e.push(`grupos[${i}]: cortes no ordenados de menor a mayor.`);
    });
  } else if (b.tipo === 'funcion') {
    if (typeof b.clasificar !== 'function') e.push('tipo "funcion" requiere clasificar().');
  } else {
    e.push(`tipo desconocido "${b.tipo}".`);
  }
  return e;
}

/** Localiza el grupo de sexo y edad aplicable a un contexto.
 * @param {Object} baremo - baremo de tipo 'cortes_ordenados'.
 * @param {{sexo?: string, edad?: number}} contexto - datos del evaluado.
 * @returns {Object|undefined} grupo coincidente, si existe. */
export function buscarGrupo(baremo, contexto) {
  const { sexo, edad } = contexto ?? {};
  return baremo.grupos.find(g =>
    (g.sexo == null || g.sexo === sexo) &&
    (g.edadMin == null || (edad != null && edad >= g.edadMin)) &&
    (g.edadMax == null || (edad != null && edad <= g.edadMax)));
}

/** Asigna el nivel según el número de cortes superados.
 * @param {number} valor - valor medido.
 * @param {number[]} cortes - cortes ascendentes.
 * @param {string} direccion - 'mayor_mejor' o 'menor_mejor'.
 * @param {string} limite - semántica del corte.
 * @returns {string} nivel de NIVELES. */
function nivelPorCortes(valor, cortes, direccion, limite) {
  const supera = (c) => (limite === 'inferior_inclusivo' ? valor >= c : valor > c);
  const indice = cortes.filter(supera).length;
  return direccion === 'mayor_mejor' ? NIVELES[indice] : NIVELES[NIVELES.length - 1 - indice];
}

/** Aplica un baremo y devuelve el nivel ordinal o null con el motivo.
 * Nunca lanza: los problemas se reportan como advertencias o datos faltantes.
 * @param {Map<string, Object>} registro - registro de baremos.
 * @param {string} baremoId - id del baremo a aplicar.
 * @param {number|null} valor - valor evaluado.
 * @param {{sexo?: string, edad?: number}} contexto - datos del evaluado.
 * @returns {{nivel: string|null, baremoAplicado: Object|null, advertencias: string[], datosFaltantes: string[]}} resultado de la normalización. */
export function aplicarBaremo(registro, baremoId, valor, contexto) {
  const salida = { nivel: null, baremoAplicado: null, advertencias: [], datosFaltantes: [] };
  if (valor === null || valor === undefined) { salida.datosFaltantes.push('valor_evaluado'); return salida; }
  if (!baremoId) { salida.datosFaltantes.push('baremo_no_asignado'); return salida; }

  const baremo = registro?.get?.(baremoId);
  if (!baremo) {
    salida.datosFaltantes.push(`baremo:${baremoId}`);
    salida.advertencias.push(`Baremo "${baremoId}" pendiente de integrar: no se asigna nivel.`);
    return salida;
  }

  let nivel = null;
  let grupo = null;
  const valorClasificado = baremo.redondeo === 'entero' ? (Math.round(valor) || 0) : valor; // `|| 0` evita -0
  if (baremo.tipo === 'cortes_ordenados') {
    grupo = buscarGrupo(baremo, contexto);
    if (!grupo) {
      salida.advertencias.push(`Baremo "${baremoId}": no hay grupo para sexo="${contexto?.sexo ?? '—'}" y edad=${contexto?.edad ?? '—'}.`);
      salida.datosFaltantes.push('grupo_baremo');
      return salida;
    }
    nivel = nivelPorCortes(valorClasificado, grupo.cortes, baremo.direccion, baremo.limite);
  } else {
    nivel = baremo.clasificar(valor, contexto);
  }

  if (!esNivelValido(nivel)) {
    salida.advertencias.push(`Baremo "${baremoId}" devolvio un nivel fuera de la escala (${JSON.stringify(nivel)}).`);
    return salida;
  }
  salida.nivel = nivel;
  salida.baremoAplicado = {
    id: baremo.id, version: baremo.version ?? null, fuente: baremo.fuente,
    valorClasificado,
    grupo: grupo ? { sexo: grupo.sexo ?? null, edadMin: grupo.edadMin ?? null, edadMax: grupo.edadMax ?? null } : null,
  };
  return salida;
}
