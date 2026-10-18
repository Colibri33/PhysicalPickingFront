/* ═══════════════════════════════════════════════════════════════
   evaluacion/normalizacion/baremos.js
   Etapa 4 del flujo: normalizacion a niveles.
   INTERFAZ de baremos. En esta etapa NO se incluye ningun baremo:
   el registro por defecto esta vacio y toda capacidad queda con
   nivel = null y la advertencia "baremo pendiente".

   Contrato de un baremo (lo que se debe cargar despues):
   {
     id:        'afisal_dinamometria',            // lo referencia cada capacidad
     capacidad: 'fuerza',
     version:   '1.0',
     fuente:    { referencia: '...', origen: 'baremo' },
     tipo:      'cortes_ordenados' | 'funcion',

     // tipo 'cortes_ordenados': N-1 cortes para N niveles (5 niveles → 4 cortes)
     direccion: 'mayor_mejor' | 'menor_mejor',
     limite:    'inferior_inclusivo' | 'superior_inclusivo',   // semantica del corte
     grupos: [{ sexo: 'masculino'|'femenino'|null, edadMin, edadMax, cortes: [..] }],

     // tipo 'funcion': clasificacion programatica (p. ej. si un baremo
     // necesita una formula previa). Debe devolver un nivel de NIVELES.
     clasificar: (valor, contexto) => nivel
   }
   La direccion, la semantica de los limites y los grupos por sexo y
   edad los define cada baremo; este modulo no asume ninguno.
   ═══════════════════════════════════════════════════════════════ */

import { NIVELES, esNivelValido } from '../niveles.js';

export function crearRegistroBaremos(baremos = []) {
  const registro = new Map();
  for (const b of baremos) {
    const errores = validarDefinicionBaremo(b);
    if (errores.length) throw new Error(`Baremo "${b?.id}" invalido: ${errores.join(' ')}`);
    registro.set(b.id, b);
  }
  return registro;
}

export function validarDefinicionBaremo(b) {
  const e = [];
  if (!b || typeof b !== 'object') return ['No es un objeto.'];
  if (!b.id) e.push('Falta id.');
  if (!b.fuente?.referencia || !b.fuente?.origen) e.push('Falta fuente.referencia u fuente.origen (trazabilidad obligatoria).');
  if (b.tipo === 'cortes_ordenados') {
    if (!['mayor_mejor', 'menor_mejor'].includes(b.direccion)) e.push('direccion invalida.');
    if (!['inferior_inclusivo', 'superior_inclusivo'].includes(b.limite)) e.push('limite invalido.');
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

export function buscarGrupo(baremo, contexto) {
  const { sexo, edad } = contexto ?? {};
  return baremo.grupos.find(g =>
    (g.sexo == null || g.sexo === sexo) &&
    (g.edadMin == null || (edad != null && edad >= g.edadMin)) &&
    (g.edadMax == null || (edad != null && edad <= g.edadMax)));
}

function nivelPorCortes(valor, cortes, direccion, limite) {
  const supera = (c) => (limite === 'inferior_inclusivo' ? valor >= c : valor > c);
  const indice = cortes.filter(supera).length;          // 0..cortes.length
  return direccion === 'mayor_mejor' ? NIVELES[indice] : NIVELES[NIVELES.length - 1 - indice];
}

/**
 * aplicarBaremo — devuelve el nivel ordinal o null con el motivo.
 * Nunca lanza: los problemas se reportan como advertencias/faltantes.
 */
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
  if (baremo.tipo === 'cortes_ordenados') {
    grupo = buscarGrupo(baremo, contexto);
    if (!grupo) {
      salida.advertencias.push(`Baremo "${baremoId}": no hay grupo para sexo="${contexto?.sexo ?? '—'}" y edad=${contexto?.edad ?? '—'}.`);
      salida.datosFaltantes.push('grupo_baremo');
      return salida;
    }
    nivel = nivelPorCortes(valor, grupo.cortes, baremo.direccion, baremo.limite);
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
    grupo: grupo ? { sexo: grupo.sexo ?? null, edadMin: grupo.edadMin ?? null, edadMax: grupo.edadMax ?? null } : null,
  };
  return salida;
}
