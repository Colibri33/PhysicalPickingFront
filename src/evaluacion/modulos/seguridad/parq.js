/* ═══════════════════════════════════════════════════════════════
   evaluacion/modulos/seguridad/parq.js
   PAR-Q+ OFICIAL como modulo de SEGURIDAD.
   - Destino: SEGURIDAD. NUNCA entra al porcentaje de compatibilidad.
   - Este modulo solo evalua el instrumento (que hay positivo, si el
     seguimiento es requerido/completo). La decision sobre pruebas
     maximas (Leger) se toma en reglas/preparacionSeguridad.js.
   - Las preguntas complementarias de PhysicalPicking (lesiones,
     limitaciones, experiencia) NO estan aqui: viven en
     modulos/complementarias/physicalpicking.js.

   Forma de la respuesta:
   {
     p1..p7: boolean,                         // 7 preguntas generales
     seguimiento: {                           // solo si hay algun Si en p1..p7
       c1..c10: { aplica: boolean, respuestas: { [subpreguntaId]: boolean } }
     }
   }
   El sistema cuenta automaticamente los positivos (no se usa una
   pregunta de "3 o mas").
   ═══════════════════════════════════════════════════════════════ */

import { ORIGEN, TIPO_MODULO, DESTINO, ESTADO_MODULO } from '../../trazabilidad.js';
import { validarItems } from '../../validacion/validarRespuestas.js';

export const PARQ_GENERALES = [
  { id: 'p1', tema: 'condicion_cardiaca_o_presion_arterial_alta' },
  { id: 'p2', tema: 'dolor_en_el_pecho' },
  { id: 'p3', tema: 'perdida_equilibrio_por_mareo_o_perdida_de_conciencia_12_meses' },
  { id: 'p4', tema: 'otra_condicion_medica_cronica' },
  { id: 'p5', tema: 'medicamentos_para_condicion_cronica' },
  { id: 'p6', tema: 'problema_oseo_articular_o_de_tejido_blando' },
  { id: 'p7', tema: 'actividad_fisica_solo_bajo_supervision_medica' },
].map(i => ({ ...i, tipo: 'si_no', texto: null }));

export const PARQ_CATEGORIAS_SEGUIMIENTO = [
  { id: 'c1', tema: 'artritis_osteoporosis_o_problemas_de_espalda' },
  { id: 'c2', tema: 'cancer' },
  { id: 'c3', tema: 'condicion_cardiaca_o_cardiovascular' },
  { id: 'c4', tema: 'presion_arterial_alta' },
  { id: 'c5', tema: 'condicion_metabolica' },
  { id: 'c6', tema: 'salud_mental_o_dificultades_de_aprendizaje' },
  { id: 'c7', tema: 'enfermedad_respiratoria' },
  { id: 'c8', tema: 'lesion_de_medula_espinal' },
  { id: 'c9', tema: 'accidente_cerebrovascular' },
  { id: 'c10', tema: 'otra_condicion_medica' },
].map(c => ({ ...c, texto: null, subpreguntas: null }));

export const CLASIFICACION_PARQ = Object.freeze({
  SIN_POSITIVOS: 'sin_positivos',
  GENERALES_INCOMPLETAS: 'generales_incompletas',
  SEGUIMIENTO_INCOMPLETO: 'seguimiento_incompleto',
  SEGUIMIENTO_SIN_POSITIVOS: 'seguimiento_sin_positivos',
  SEGUIMIENTO_CON_POSITIVOS: 'seguimiento_con_positivos',
});

function validarSeguimiento(seguimiento) {
  const errores = [];
  const advertencias = [];
  const faltantes = [];
  const s = seguimiento ?? {};
  for (const c of PARQ_CATEGORIAS_SEGUIMIENTO) {
    const entrada = s[c.id];
    const ruta = `seguimiento.${c.id}`;
    if (!entrada || typeof entrada.aplica !== 'boolean') { faltantes.push(`${ruta}.aplica`); continue; }
    if (!entrada.aplica) continue;
    const resp = entrada.respuestas ?? {};
    const valores = Object.entries(resp);
    if (valores.length === 0) { faltantes.push(`${ruta}.respuestas`); continue; }
    valores.filter(([, v]) => typeof v !== 'boolean')
      .forEach(([k]) => errores.push(`${ruta}.respuestas.${k}: debe ser Si/No.`));
    if (!c.subpreguntas) {
      advertencias.push(`${ruta}: lista oficial de subpreguntas pendiente de transcribir; no se puede verificar que esten todas.`);
    } else {
      c.subpreguntas.filter(id => !(id in resp)).forEach(id => faltantes.push(`${ruta}.respuestas.${id}`));
    }
  }
  return { errores, advertencias, faltantes };
}

export const MODULO_PARQ = {
  id: 'parq',
  nombre: 'PAR-Q+ (cuestionario oficial)',
  tipo: TIPO_MODULO.SEGURIDAD,
  destino: DESTINO.SEGURIDAD,
  version: '0.1.0',
  estadoConfiguracion: 'logica_condicional_integrada_textos_pendientes',
  fuente: {
    instrumento: 'PAR-Q+',
    referencia: 'Warburton et al. (2011); version espanola: Schwartz et al. (2019).',
    origen: ORIGEN.INSTRUMENTO,
  },
  pendientes: [
    'Transcribir textualmente las 7 preguntas generales y las preguntas de seguimiento de la version espanola.',
    'Cargar la lista oficial de subpreguntas de cada categoria de seguimiento (c1..c10).',
  ],
  items: PARQ_GENERALES,
  categoriasSeguimiento: PARQ_CATEGORIAS_SEGUIMIENTO,

  extraer(datos) {
    return datos?.cuestionarios?.parq;
  },

  validar(respuestas) {
    const base = validarItems(PARQ_GENERALES, respuestas);
    const hayPositivo = PARQ_GENERALES.some(i => respuestas?.[i.id] === true);
    if (hayPositivo) {
      const s = validarSeguimiento(respuestas?.seguimiento);
      base.errores.push(...s.errores);
      base.advertencias.push(...s.advertencias);
      base.faltantes.push(...s.faltantes);
      base.ok = base.errores.length === 0;
    } else if (respuestas?.seguimiento && Object.keys(respuestas.seguimiento).length) {
      base.advertencias.push('Hay respuestas de seguimiento sin ningun Si en las preguntas generales; se conservan pero no se evaluan.');
    }
    return base;
  },

  evaluar(respuestas, validacion) {
    const generalesPositivas = PARQ_GENERALES.filter(i => respuestas[i.id] === true).map(i => i.id);
    const generalesFaltantes = PARQ_GENERALES.filter(i => typeof respuestas[i.id] !== 'boolean').map(i => i.id);
    const seguimientoRequerido = generalesPositivas.length > 0;
    const faltantesSeguimiento = validacion.faltantes.filter(f => f.startsWith('seguimiento.'));
    const seguimientoCompleto = seguimientoRequerido ? faltantesSeguimiento.length === 0 : null;

    const categoriasPositivas = seguimientoRequerido
      ? PARQ_CATEGORIAS_SEGUIMIENTO
          .filter(c => {
            const e = respuestas.seguimiento?.[c.id];
            return e?.aplica === true && Object.values(e.respuestas ?? {}).some(v => v === true);
          })
          .map(c => c.id)
      : [];

    let clasificacion;
    if (generalesFaltantes.length > 0) clasificacion = CLASIFICACION_PARQ.GENERALES_INCOMPLETAS;
    else if (!seguimientoRequerido) clasificacion = CLASIFICACION_PARQ.SIN_POSITIVOS;
    else if (categoriasPositivas.length > 0) clasificacion = CLASIFICACION_PARQ.SEGUIMIENTO_CON_POSITIVOS;
    else if (!seguimientoCompleto) clasificacion = CLASIFICACION_PARQ.SEGUIMIENTO_INCOMPLETO;
    else clasificacion = CLASIFICACION_PARQ.SEGUIMIENTO_SIN_POSITIVOS;

    return {
      resultadoEvaluacion: {
        generalesPositivas, generalesFaltantes, totalPositivosGenerales: generalesPositivas.length,
        seguimientoRequerido, seguimientoCompleto, categoriasPositivas, clasificacion,
      },
      estado: ESTADO_MODULO.COMPLETO,
    };
  },

  normalizar(resultado, _contexto) {
    return {
      nivel: resultado.clasificacion,
      // Forma que consume la capa de seguridad del DecisionEngine.
      datoNormalizado: {
        clasificacion: resultado.clasificacion,
        respuestasGenerales: Object.fromEntries(PARQ_GENERALES.map(i => [i.id, resultado.generalesPositivas.includes(i.id)
          ? true : (resultado.generalesFaltantes.includes(i.id) ? null : false)])),
        generalesPositivas: resultado.generalesPositivas,
        categoriasPositivas: resultado.categoriasPositivas,
        seguimientoRequerido: resultado.seguimientoRequerido,
        seguimientoCompleto: resultado.seguimientoCompleto,
      },
    };
  },
};
