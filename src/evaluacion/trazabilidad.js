/**
 * @module evaluacion/trazabilidad
 * @description Vocabularios y sobre estándar de trazabilidad que conserva lo necesario para auditar cada módulo evaluado.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el formato del resultado auditable de un módulo.
 *  - O (Abierto/Cerrado): nuevos tipos, estados o destinos se añaden como constantes sin alterar la construcción del sobre.
 *  - I (Segregación de interfaces): el sobre solo requiere los campos mínimos del módulo (id, nombre, tipo, destino, fuente, versión).
 * Notas: ninguna etapa posterior modifica estos objetos; perfil, reglas y DecisionEngine solo los leen.
 */

/** Origen de cada elemento de configuración (mismo vocabulario que el DecisionEngine). */
export const ORIGEN = Object.freeze({
  INSTRUMENTO: 'instrumento',
  BAREMO: 'baremo',
  LITERATURA: 'literatura',
  JUICIO_EXPERTOS: 'juicio_expertos',
  DECISION_PROPIA: 'decision_propia',
});

/** Estado de un módulo tras validación, evaluación y normalización. */
export const ESTADO_MODULO = Object.freeze({
  SIN_DATOS: 'sin_datos',
  INVALIDO: 'invalido', // errores de validación bloqueantes
  INCOMPLETO: 'incompleto', // faltan respuestas requeridas
  PENDIENTE_CALIFICACION: 'pendiente_calificacion', // reglas de calificación no integradas
  PENDIENTE_BAREMO: 'pendiente_baremo', // evaluado, sin baremo para asignar nivel
  COMPLETO: 'completo',
});

/** Tipos de módulo. */
export const TIPO_MODULO = Object.freeze({
  PRUEBA_FISICA: 'prueba_fisica',
  ANTROPOMETRIA: 'antropometria',
  CUESTIONARIO: 'cuestionario',
  SEGURIDAD: 'seguridad',
  COMPLEMENTARIO: 'complementario_physicalpicking',
});

/** Destino del dato normalizado del módulo. */
export const DESTINO = Object.freeze({
  COMPATIBILIDAD: 'compatibilidad', // entra al porcentaje del DecisionEngine
  PREPARACION: 'preparacion', // IPAQ, PSQI
  SEGURIDAD: 'seguridad', // alertas y restricciones (PAR-Q+); nunca entra al porcentaje
  EXPERIENCIA: 'experiencia',
  INFORMATIVA: 'informativa', // solo interpretación e informe
});

/** Clona profundamente un valor serializable.
 * @param {*} valor - valor a clonar.
 * @returns {*} copia independiente; undefined si el valor es undefined. */
export function clonar(valor) {
  return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
}

/** Construye el sobre de trazabilidad de un módulo (requerimiento 7).
 * @param {Object} params - datos del resultado.
 * @param {Object} params.modulo - definición del módulo evaluado.
 * @param {string} params.estado - valor de ESTADO_MODULO.
 * @param {*} params.respuestaOriginal - respuesta tal como se ingresó.
 * @param {Object} params.validacion - resultado de la validación.
 * @param {Object} [params.resultadoEvaluacion] - resultado de la evaluación.
 * @param {Object} [params.datoNormalizado] - dato normalizado.
 * @param {string|null} [params.nivel] - nivel ordinal asignado.
 * @param {string[]} [params.advertencias] - advertencias acumuladas.
 * @param {string[]} [params.datosFaltantes] - datos faltantes.
 * @returns {Object} sobre con los campos obligatorios de CAMPOS_TRAZABILIDAD. */
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

/** Campos que todo sobre de trazabilidad debe contener. */
export const CAMPOS_TRAZABILIDAD = [
  'respuestaOriginal', 'resultadoEvaluacion', 'datoNormalizado', 'nivel',
  'advertencias', 'datosFaltantes', 'fuente', 'configuracion',
];
