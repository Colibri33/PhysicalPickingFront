/* ═══════════════════════════════════════════════════════════════
   evaluacion/modulos/complementarias/physicalpicking.js
   PREGUNTAS COMPLEMENTARIAS PROPIAS DE PHYSICALPICKING
   (elaboracion propia). NO forman parte del PAR-Q+ oficial y no se
   presentan como preguntas del instrumento. Tres bloques:

     A. Antecedentes de lesiones (lesion 2 anos, cirugia
        musculoesqueletica, dolor recurrente + zona, fecha, tratamiento)
     B. Limitaciones relevantes para las pruebas
     C. Experiencia deportiva (practica previa, deportes, anos, nivel,
        practica actual)

   Estas variables quedan disponibles para el perfil funcional y para
   el DecisionEngine (capa de experiencia y alertas de antecedentes).
   No calculan nada: la regla de 2 anos y la interpretacion por
   familia viven en el DecisionEngine (no se duplican aqui).
   ═══════════════════════════════════════════════════════════════ */

import { ORIGEN, TIPO_MODULO, DESTINO, ESTADO_MODULO } from '../../trazabilidad.js';
import { validarItems } from '../../validacion/validarRespuestas.js';

const op = (...valores) => valores.map(valor => ({ valor, etiqueta: null }));

export const PRUEBAS_BATERIA = ['dinamometria_manual', 'salto_vertical', 'sit_and_reach', 'equilibrio_monopodal_sin_vision', 'leger_course_navette_20m'];

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

  extraer(datos) {
    return datos?.cuestionarios?.complementarias;
  },

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

  normalizar(resultado) {
    return { datoNormalizado: resultado, nivel: null };
  },
};
