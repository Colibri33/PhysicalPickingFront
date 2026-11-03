/**
 * @module evaluacion/validacion/validarRespuestas
 * @description Validador genérico y declarativo de respuestas (etapa 2); no califica ni interpreta.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la validación estructural de respuestas.
 *  - O (Abierto/Cerrado): cada módulo declara sus ítems (tipo, opciones, rango, obligatoriedad, visibilidad) sin modificar el validador.
 *  - D (Inversión de dependencias): depende de la descripción declarativa de ítems, no de módulos concretos.
 * Notas: tipos soportados: si_no (boolean), opcion, multi_opcion, numero (min/max son límites de coherencia, no baremos),
 * hora ("HH:MM" 24 h), texto (longitud máxima) y lista (objetos validados con item.campos).
 */

const TEXTO_MAX = 500;

/** Indica si una respuesta está vacía.
 * @param {*} v - valor a revisar.
 * @returns {boolean} true si es undefined, null, texto en blanco o arreglo vacío. */
export function estaVacio(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0);
}

/** Evalúa la condición declarativa de visibilidad de un ítem (serializable y auditable).
 * @param {Object} item - ítem con visibleSi opcional.
 * @param {Object} respuestas - respuestas del módulo.
 * @returns {boolean} true si el ítem debe responderse. */
export function esVisible(item, respuestas) {
  const c = item.visibleSi;
  if (!c) return true;
  const evaluar = (id) => {
    const v = respuestas?.[id];
    if ('igual' in c) return v === c.igual;
    if ('mayorQue' in c) return typeof v === 'number' && v > c.mayorQue;
    return !estaVacio(v);
  };
  if (c.item) return evaluar(c.item);
  if (c.algunoDe) return c.algunoDe.some(evaluar);
  return true;
}

/** Valida el valor de un ítem según su tipo.
 * @param {Object} item - definición del ítem.
 * @param {*} valor - respuesta recibida.
 * @param {string} ruta - ruta del ítem para los mensajes.
 * @param {Object} contexto - contexto para límites dinámicos.
 * @returns {{errores: string[], advertencias: string[]}} hallazgos de la validación. */
function validarValor(item, valor, ruta, contexto) {
  const errores = [];
  const advertencias = [];
  const etiqueta = `${ruta} (${item.tema ?? item.id})`;

  if (item.permiteNoSabe && valor === 'no_sabe') return { errores, advertencias };

  switch (item.tipo) {
    case 'si_no':
      if (typeof valor !== 'boolean') errores.push(`${etiqueta}: debe ser Si/No.`);
      break;
    case 'opcion': {
      if (!item.opciones) {
        advertencias.push(`${etiqueta}: opciones de respuesta pendientes de configurar; solo se valida presencia.`);
        break;
      }
      if (!item.opciones.some(o => o.valor === valor)) errores.push(`${etiqueta}: opcion no valida (${JSON.stringify(valor)}).`);
      break;
    }
    case 'multi_opcion': {
      if (!Array.isArray(valor)) { errores.push(`${etiqueta}: debe ser una lista de opciones.`); break; }
      const validas = new Set((item.opciones ?? []).map(o => o.valor));
      valor.filter(v => !validas.has(v)).forEach(v => errores.push(`${etiqueta}: opcion no valida (${JSON.stringify(v)}).`));
      break;
    }
    case 'numero': {
      if (typeof valor !== 'number' || !Number.isFinite(valor)) { errores.push(`${etiqueta}: debe ser un numero valido.`); break; }
      if (item.entero && !Number.isInteger(valor)) errores.push(`${etiqueta}: debe ser un numero entero.`);
      if (item.min !== undefined && valor < item.min) errores.push(`${etiqueta}: ${valor} es menor que el minimo coherente (${item.min}).`);
      const maxCtx = typeof item.maxDesdeContexto === 'function' ? item.maxDesdeContexto(contexto) : undefined;
      const max = maxCtx ?? item.max;
      if (max !== undefined && valor > max) errores.push(`${etiqueta}: ${valor} supera el maximo coherente (${max}).`);
      break;
    }
    case 'hora':
      if (typeof valor !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) errores.push(`${etiqueta}: debe tener formato HH:MM (24 h).`);
      break;
    case 'texto':
      if (typeof valor !== 'string') errores.push(`${etiqueta}: debe ser texto.`);
      else if (valor.length > (item.maxLongitud ?? TEXTO_MAX)) errores.push(`${etiqueta}: supera ${item.maxLongitud ?? TEXTO_MAX} caracteres.`);
      break;
    case 'lista': {
      if (!Array.isArray(valor)) { errores.push(`${etiqueta}: debe ser una lista.`); break; }
      valor.forEach((entrada, i) => {
        const r = validarItems(item.campos, entrada, contexto, `${ruta}[${i}]`);
        errores.push(...r.errores);
        advertencias.push(...r.advertencias);
        r.faltantes.forEach(f => errores.push(`${f}: campo obligatorio dentro de la lista.`));
      });
      break;
    }
    default:
      errores.push(`${etiqueta}: tipo de item desconocido "${item.tipo}" (error de configuracion).`);
  }
  return { errores, advertencias };
}

/** Valida un objeto de respuestas contra una lista de ítems.
 * @param {Object[]} items - definiciones de ítems.
 * @param {Object} respuestas - respuestas a validar.
 * @param {Object} [contexto] - contexto para límites dinámicos.
 * @param {string} [prefijo] - prefijo de ruta para ítems anidados.
 * @returns {{ok: boolean, errores: string[], advertencias: string[], faltantes: string[], omitidosPorCondicion: string[], respondidos: number}} resultado de la validación. */
export function validarItems(items, respuestas, contexto = {}, prefijo = '') {
  const errores = [];
  const advertencias = [];
  const faltantes = [];
  const omitidosPorCondicion = [];
  let respondidos = 0;
  const r = respuestas ?? {};

  for (const item of items) {
    const ruta = prefijo ? `${prefijo}.${item.id}` : item.id;
    if (!esVisible(item, r)) {
      omitidosPorCondicion.push(ruta);
      if (!estaVacio(r[item.id])) {
        advertencias.push(`${ruta}: tiene respuesta aunque su condicion de visibilidad no se cumple; se conserva pero no se evalua.`);
      }
      continue;
    }
    const valor = r[item.id];
    if (estaVacio(valor)) {
      if (item.requerido !== false) faltantes.push(ruta);
      continue;
    }
    respondidos += 1;
    const res = validarValor(item, valor, ruta, contexto);
    errores.push(...res.errores);
    advertencias.push(...res.advertencias);
  }

  return { ok: errores.length === 0, errores, advertencias, faltantes, omitidosPorCondicion, respondidos };
}
