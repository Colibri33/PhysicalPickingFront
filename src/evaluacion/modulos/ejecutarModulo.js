/* ═══════════════════════════════════════════════════════════════
   evaluacion/modulos/ejecutarModulo.js
   Recorrido identico para TODOS los modulos:
     extraer → validar (etapa 2) → evaluar (etapa 3) → normalizar (etapa 4)
   y empaquetado del resultado en el sobre de trazabilidad.

   Contrato de un modulo:
   {
     id, nombre, tipo, destino, version, estadoConfiguracion,
     fuente: { referencia, origen, ... }, pendientes: [..],
     extraer(datosIngresados)                 → respuestas | undefined
     validar(respuestas, contexto)            → { ok, errores, advertencias, faltantes, ... }
     evaluar(respuestas, validacion, contexto)→ { resultadoEvaluacion, estado?, advertencias?, datosFaltantes? }
     normalizar(resultadoEvaluacion, contexto, recursos) → { datoNormalizado, nivel, estado?, advertencias?, datosFaltantes? }
     sinDatos?(contexto)                      → { advertencias, datosFaltantes }
   }
   ═══════════════════════════════════════════════════════════════ */

import { crearResultadoModulo, ESTADO_MODULO } from '../trazabilidad.js';
import { estaVacio } from '../validacion/validarRespuestas.js';

function vacio(respuestas) {
  if (estaVacio(respuestas)) return true;
  if (typeof respuestas === 'object' && !Array.isArray(respuestas)) {
    return Object.values(respuestas).every(v => estaVacio(v) ||
      (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0));
  }
  return false;
}

export function ejecutarModulo(modulo, datosIngresados, contexto, recursos) {
  const respuestas = modulo.extraer(datosIngresados);

  if (vacio(respuestas)) {
    const extra = modulo.sinDatos?.(contexto) ?? {};
    return crearResultadoModulo({
      modulo,
      estado: ESTADO_MODULO.SIN_DATOS,
      respuestaOriginal: respuestas ?? null,
      validacion: null,
      advertencias: extra.advertencias ?? [],
      datosFaltantes: ['respuestas', ...(extra.datosFaltantes ?? [])],
    });
  }

  const validacion = modulo.validar(respuestas, contexto);
  const advertencias = [...validacion.advertencias];
  const datosFaltantes = [...validacion.faltantes];

  if (!validacion.ok) {
    return crearResultadoModulo({
      modulo, estado: ESTADO_MODULO.INVALIDO, respuestaOriginal: respuestas, validacion,
      advertencias, datosFaltantes,
    });
  }

  const ev = modulo.evaluar(respuestas, validacion, contexto) ?? {};
  advertencias.push(...(ev.advertencias ?? []));
  datosFaltantes.push(...(ev.datosFaltantes ?? []));

  const nz = modulo.normalizar(ev.resultadoEvaluacion ?? null, contexto, recursos) ?? {};
  advertencias.push(...(nz.advertencias ?? []));
  datosFaltantes.push(...(nz.datosFaltantes ?? []));

  const estado = validacion.faltantes.length > 0
    ? ESTADO_MODULO.INCOMPLETO
    : (ev.estado ?? nz.estado ?? ESTADO_MODULO.COMPLETO);

  return crearResultadoModulo({
    modulo, estado, respuestaOriginal: respuestas, validacion,
    resultadoEvaluacion: ev.resultadoEvaluacion ?? null,
    datoNormalizado: nz.datoNormalizado ?? null,
    nivel: nz.nivel ?? null,
    advertencias, datosFaltantes,
  });
}
