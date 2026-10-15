/* ═══════════════════════════════════════════════════════════════
   evaluacion/trazabilidad.js
   Sobre estandar que conserva TODO lo necesario para auditar cada
   modulo (prueba fisica, antropometria, cuestionario, seguridad o
   preguntas complementarias). Ninguna etapa posterior modifica estos
   objetos: el perfil, las reglas y el DecisionEngine solo los leen.
   ═══════════════════════════════════════════════════════════════ */

/** Origen de cada elemento de configuracion (mismo vocabulario que la
 *  configuracion del DecisionEngine). */
export const ORIGEN = Object.freeze({
  INSTRUMENTO: 'instrumento',
  BAREMO: 'baremo',
  LITERATURA: 'literatura',
  JUICIO_EXPERTOS: 'juicio_expertos',
  DECISION_PROPIA: 'decision_propia',
});

/** Estado de un modulo tras recorrer validacion → evaluacion → normalizacion. */
export const ESTADO_MODULO = Object.freeze({
  SIN_DATOS: 'sin_datos',                         // no se ingreso nada
  INVALIDO: 'invalido',                           // hay errores de validacion bloqueantes
  INCOMPLETO: 'incompleto',                       // faltan respuestas requeridas
  PENDIENTE_CALIFICACION: 'pendiente_calificacion', // respuestas validas, reglas de calificacion no integradas
  PENDIENTE_BAREMO: 'pendiente_baremo',           // evaluado, sin baremo para asignar nivel
  COMPLETO: 'completo',
});

/** Tipos de modulo. */
export const TIPO_MODULO = Object.freeze({
  PRUEBA_FISICA: 'prueba_fisica',
  ANTROPOMETRIA: 'antropometria',
  CUESTIONARIO: 'cuestionario',
  SEGURIDAD: 'seguridad',
  COMPLEMENTARIO: 'complementario_physicalpicking',
});

/** Hacia donde fluye el dato normalizado del modulo. */
export const DESTINO = Object.freeze({
  COMPATIBILIDAD: 'compatibilidad',   // capacidades que entran al porcentaje del DecisionEngine
  PREPARACION: 'preparacion',         // estado de preparacion (IPAQ, PSQI)
  SEGURIDAD: 'seguridad',             // alertas/restricciones (PAR-Q+); NUNCA al porcentaje
  EXPERIENCIA: 'experiencia',         // capa de experiencia del DecisionEngine
  INFORMATIVA: 'informativa',         // solo interpretacion e informe
});

export function clonar(valor) {
  return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
}

/**
 * crearResultadoModulo — construye el sobre de trazabilidad.
 * Campos obligatorios por requerimiento (punto 7):
 *   respuestaOriginal, resultadoEvaluacion, datoNormalizado, nivel,
 *   advertencias, datosFaltantes, fuente, configuracion.
 */
export function crearResultadoModulo({
  modulo,
  estado,
  respuestaOriginal,
  validacion,
  resultadoEvaluacion = null,
  datoNormalizado = null,
  nivel = null,
  advertencias = [],
  datosFaltantes = [],
}) {
  return {
    moduloId: modulo.id,
    nombre: modulo.nombre,
    tipo: modulo.tipo,
    destino: modulo.destino,
    entraAlPorcentaje: modulo.destino === DESTINO.COMPATIBILIDAD,
    estado,
    respuestaOriginal: clonar(respuestaOriginal ?? null),
    validacion: validacion ?? null,
    resultadoEvaluacion: clonar(resultadoEvaluacion),
    datoNormalizado: clonar(datoNormalizado),
    nivel,
    advertencias: [...new Set(advertencias)],
    datosFaltantes: [...new Set(datosFaltantes)],
    fuente: clonar(modulo.fuente),
    configuracion: {
      id: modulo.id,
      version: modulo.version,
      estadoConfiguracion: modulo.estadoConfiguracion,
      pendientes: clonar(modulo.pendientes ?? []),
    },
  };
}

/** Comprueba que un sobre tenga todos los campos de trazabilidad. */
export const CAMPOS_TRAZABILIDAD = [
  'respuestaOriginal', 'resultadoEvaluacion', 'datoNormalizado', 'nivel',
  'advertencias', 'datosFaltantes', 'fuente', 'configuracion',
];
