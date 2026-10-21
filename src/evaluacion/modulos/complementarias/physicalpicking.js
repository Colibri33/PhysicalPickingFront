/**
 * @module evaluacion/modulos/complementarias/physicalpicking
 * @description Preguntas complementarias propias de PhysicalPicking: antecedentes de lesión, limitaciones para las pruebas y experiencia deportiva.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la definición y estructuración de estas preguntas.
 *  - O (Abierto/Cerrado): los bloques se amplían declarando ítems, sin modificar el validador genérico.
 *  - L (Sustitución de Liskov): cumple el contrato de módulo de ejecutarModulo.
 *  - D (Inversión de dependencias): valida mediante el validador declarativo compartido.
 * Notas: elaboración propia; NO forman parte del PAR-Q+ oficial. No calcula: la regla de 2 años y la interpretación por familia
 * residen en el DecisionEngine. Alimenta la capa de experiencia y las alertas de antecedentes.
 */

import { ORIGEN, TIPO_MODULO, DESTINO, ESTADO_MODULO } from '../../trazabilidad.js';
import { validarItems } from '../../validacion/validarRespuestas.js';

/** Construye opciones de respuesta sin etiqueta.
 * @param {...string} valores - valores permitidos.
 * @returns {{valor: string, etiqueta: null}[]} opciones. */
const op = (...valores) => valores.map(valor => ({ valor, etiqueta: null }));

/** Ids de las pruebas de la batería a las que puede afectar una limitación. */
export const PRUEBAS_BATERIA = ['dinamometria_manual', 'salto_vertical', 'sit_and_reach', 'equilibrio_monopodal_sin_vision', 'leger_course_navette_20m'];

/** Niveles de experiencia deportiva admitidos. */
export const NIVELES_EXPERIENCIA_MODULO = ['recreativo', 'formativo_club', 'federado_competitivo'];

const CAMPOS_EXPERIENCIA = [
  { id: 'deporte', tema: 'deporte_practicado', tipo: 'texto', maxLongitud: 80, texto: 'Deporte(s) practicado(s)' },
  {
    id: 'anios', tema: 'anios_de_practica', tipo: 'numero', min: 0, max: 120, texto: 'Años de experiencia',
    maxDesdeContexto: (ctx) => (Number.isFinite(ctx?.edad) ? ctx.edad : undefined),
  },
  { id: 'tipo', tema: 'nivel_alcanzado', tipo: 'opcion', opciones: op(...NIVELES_EXPERIENCIA_MODULO), texto: 'Nivel alcanzado' },
  { id: 'modalidad', tema: 'individual_o_colectivo', tipo: 'opcion', opciones: op('individual', 'colectivo'), texto: 'Individual / colectivo' },
  { id: 'habilidad', tema: 'abierto_o_cerrado', tipo: 'opcion', opciones: op('abierta', 'cerrada'), texto: 'Abierta / cerrada' },
];

const ANTECEDENTES_IDS = ['lesion_2anios', 'cirugia_musculoesqueletica', 'dolor_articular'];

/** Ítems agrupados por bloque: antecedentes, limitaciones y experiencia. */
export const BLOQUES_COMPLEMENTARIOS = {
  antecedentes: [
    { id: 'lesion_2anios', tema: 'lesion_deportiva_ultimos_2_anios', tipo: 'si_no', texto: '¿Ha sufrido alguna lesión deportiva en los últimos 2 años?' },
    { id: 'cirugia_musculoesqueletica', tema: 'cirugia_por_lesion_musculoesqueletica', tipo: 'si_no', texto: '¿Ha sido intervenido quirúrgicamente por una lesión musculoesquelética?' },
    { id: 'dolor_articular', tema: 'dolor_recurrente_articulacion', tipo: 'si_no', texto: '¿Presenta dolor recurrente en alguna articulación (rodilla, hombro, espalda, tobillo, etc.)?' },
    { id: 'zona_articulacion', tema: 'zona_articulacion_afectada', tipo: 'texto', requerido: false, texto: 'Si respondió SÍ a alguna de las anteriores, indique la zona/articulación afectada' },
    { id: 'fecha_aprox_lesion', tema: 'fecha_aproximada_lesion', tipo: 'texto', requerido: false, texto: 'Fecha aproximada de la lesión' },
    { id: 'tratamiento_medico', tema: 'tratamiento_medico_fisioterapeutico', tipo: 'si_no', requerido: false, texto: '¿Recibió tratamiento médico/fisioterapéutico?' },
  ],
  limitaciones: [
    { id: 'limitacion_pruebas', tema: 'limitacion_relevante_para_las_pruebas', tipo: 'si_no', texto: '¿Tiene alguna limitación física relevante para realizar las pruebas físicas?' },
    {
      id: 'limitacion_pruebas_afectadas', tema: 'pruebas_afectadas', tipo: 'multi_opcion', requerido: false,
      opciones: op(...PRUEBAS_BATERIA), texto: 'Pruebas a las que afecta',
    },
    { id: 'limitacion_descripcion', tema: 'descripcion_limitacion', tipo: 'texto', requerido: false, texto: 'Describa la limitación' },
  ],
  experiencia: [
    { id: 'practica_deporte', tema: 'ha_practicado_deporte_regular', tipo: 'si_no', texto: '¿Ha practicado deporte de forma regular alguna vez?' },
    {
      id: 'experiencias', tema: 'experiencias_deportivas', tipo: 'lista', campos: CAMPOS_EXPERIENCIA,
      texto: 'Si respondió SÍ, indique el/los deporte(s) practicado(s)', requerido: false,
    },
    { id: 'practica_actual', tema: 'practica_actual_deporte_regular', tipo: 'si_no', texto: '¿Practica actualmente algún deporte de forma regular?' },
  ],
};

const ITEMS = Object.values(BLOQUES_COMPLEMENTARIOS).flat();

/** Extrae los antecedentes de lesión declarados, sin validar ni completar.
 * Lo usa la regla R-SEG-04 cuando el bloque es inválido por otra pregunta, para no perder la alerta.
 * @param {Object} r - respuestas del bloque.
 * @returns {Object|null} antecedentes declarados; null si no hay ninguno afirmativo. */
export function antecedentesDeclarados(r) {
  if (!r || typeof r !== 'object') return null;
  const lesion2anios = r.lesion_2anios === true;
  const cirugiaMusculoesqueletica = r.cirugia_musculoesqueletica === true;
  const dolorArticular = r.dolor_articular === true;
  if (!lesion2anios && !cirugiaMusculoesqueletica && !dolorArticular) return null;
  return {
    lesion2anios, cirugiaMusculoesqueletica, dolorArticular,
    zona: typeof r.zona_articulacion === 'string' && r.zona_articulacion.trim() ? r.zona_articulacion.trim() : null,
    origen: 'respuesta_declarada',
  };
}

/** Módulo de preguntas complementarias conforme al contrato de ejecutarModulo. */
export const MODULO_COMPLEMENTARIAS = {
  id: 'complementarias_physicalpicking',
  nombre: 'Preguntas complementarias de PhysicalPicking (elaboracion propia, no es PAR-Q+)',
  tipo: TIPO_MODULO.COMPLEMENTARIO,
  destino: DESTINO.EXPERIENCIA,
  version: '0.2.0',
  estadoConfiguracion: 'estructura_integrada',
  fuente: {
    referencia: 'Elaboracion propia de PhysicalPicking (no es PAR-Q+). Textos de limitaciones: redaccion propia provisional.',
    origen: ORIGEN.DECISION_PROPIA,
    noEsPARQ: true,
  },
  pendientes: [
    'Convertir "deporte practicado" en lista cerrada para usar el catalogo deporte → familia del DecisionEngine.',
    'Confirmar el campo "pruebas afectadas" (propuesta de captura para registrar a que prueba afecta la limitacion).',
  ],
  bloques: BLOQUES_COMPLEMENTARIOS,

  /** Obtiene las respuestas del cuestionario complementario.
   * @param {Object} datos - datos ingresados.
   * @returns {Object|undefined} respuestas. */
  extraer(datos) {
    return datos?.cuestionarios?.complementarias;
  },

  /** Valida los ítems y exige zona, fecha y tratamiento si hay algún antecedente, y experiencias si practicó deporte.
   * @param {Object} respuestas - respuestas extraídas.
   * @param {Object} contexto - datos del evaluado (edad acota los años de práctica).
   * @returns {Object} resultado de validación. */
  validar(respuestas, contexto) {
    const v = validarItems(ITEMS, respuestas, contexto);
    const alguna = ANTECEDENTES_IDS.some(id => respuestas?.[id] === true);
    if (alguna) {
      for (const id of ['zona_articulacion', 'fecha_aprox_lesion', 'tratamiento_medico']) {
        const val = respuestas?.[id];
        const vacio = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
        if (vacio) v.faltantes.push(id);
      }
    } else {
      for (const id of ['zona_articulacion', 'fecha_aprox_lesion', 'tratamiento_medico']) {
        const val = respuestas?.[id];
        if (val !== undefined && val !== null && !(typeof val === 'string' && val.trim() === '')) {
          v.advertencias.push(`${id}: tiene respuesta sin ninguna lesión declarada; se conserva pero no se evalúa.`);
        }
      }
    }
    if (respuestas?.practica_deporte === true) {
      if (!Array.isArray(respuestas.experiencias) || respuestas.experiencias.length === 0) {
        if (!v.faltantes.includes('experiencias')) v.faltantes.push('experiencias');
      }
    }
    v.ok = v.errores.length === 0;
    return v;
  },

  /** Estructura antecedentes, limitaciones y experiencia; los datos dependientes solo se conservan si aplican.
   * @param {Object} r - respuestas validadas.
   * @returns {{resultadoEvaluacion: Object, advertencias: string[], estado: string}} resultado de la evaluación. */
  evaluar(r) {
    const advertencias = [];
    if (r.practica_deporte === true && (r.experiencias ?? []).some(e => e?.deporte)) {
      advertencias.push('Experiencia: el deporte se registra como texto libre; el catalogo cerrado deporte → familia esta pendiente.');
    }
    return {
      resultadoEvaluacion: {
        antecedentes: {
          lesion2anios: r.lesion_2anios ?? null,
          cirugiaMusculoesqueletica: r.cirugia_musculoesqueletica ?? null,
          dolorArticular: r.dolor_articular ?? null,
          zona: [r.lesion_2anios, r.cirugia_musculoesqueletica, r.dolor_articular].some(v => v === true) ? (r.zona_articulacion ?? null) : null,
          fechaAprox: [r.lesion_2anios, r.cirugia_musculoesqueletica, r.dolor_articular].some(v => v === true) ? (r.fecha_aprox_lesion ?? null) : null,
          tratamiento: [r.lesion_2anios, r.cirugia_musculoesqueletica, r.dolor_articular].some(v => v === true) ? (r.tratamiento_medico ?? null) : null,
        },
        limitaciones: {
          presente: r.limitacion_pruebas ?? null,
          pruebasAfectadas: r.limitacion_pruebas ? (r.limitacion_pruebas_afectadas ?? []) : [],
          detalle: r.limitacion_pruebas ? (r.limitacion_descripcion ?? null) : null,
        },
        experiencia: {
          practicaDeporte: r.practica_deporte ?? null,
          experiencias: r.practica_deporte ? (r.experiencias ?? []).map(e => ({
            deporte: e.deporte, anios: e.anios ?? null, tipo: e.tipo ?? null,
            modalidad: e.modalidad ?? null, habilidad: e.habilidad ?? null,
          })) : [],
          practicaActual: r.practica_actual ?? null,
        },
      },
      advertencias,
      estado: ESTADO_MODULO.COMPLETO,
    };
  },

  /** Conserva el resultado sin nivel; no entra al porcentaje.
   * @param {Object} resultado - resultado de evaluar.
   * @returns {{datoNormalizado: Object, nivel: null}} dato normalizado. */
  normalizar(resultado) {
    return { datoNormalizado: resultado, nivel: null };
  },
};
