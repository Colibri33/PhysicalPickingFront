/* logic/complementarias.js — Preguntas complementarias PROPIAS de
   PhysicalPicking (NO son PAR-Q+ oficial y nunca se presentan como tal).
   Tres bloques:
     A. Antecedentes de lesiones previas (lesión 2 años, cirugía
        musculoesquelética, dolor recurrente + zona, fecha, tratamiento).
     B. Limitaciones relevantes para las pruebas.
     C. Experiencia deportiva (práctica previa, deportes, años, nivel,
        práctica actual).
   Los ids son idénticos a los del módulo de evaluación
   (modulos/complementarias/physicalpicking.js) para copia directa.
   Textos de lesiones/experiencia según especificación del proyecto;
   textos de limitaciones = redacción propia provisional. */

export const NIVELES_EXPERIENCIA = [
  { valor: 'recreativo', etiqueta: 'Recreativo' },
  { valor: 'formativo_club', etiqueta: 'Formativo-Club' },
  { valor: 'federado_competitivo', etiqueta: 'Federado-Competitivo' },
];

export const MODALIDADES = [
  { valor: 'individual', etiqueta: 'Individual' },
  { valor: 'colectivo', etiqueta: 'Colectivo' },
];

export const HABILIDADES = [
  { valor: 'abierta', etiqueta: 'Abierta' },
  { valor: 'cerrada', etiqueta: 'Cerrada' },
];

export const PRUEBAS_BATERIA_UI = [
  { id: 'dinamometria_manual', etiqueta: 'Dinamometría manual' },
  { id: 'salto_vertical', etiqueta: 'Salto vertical' },
  { id: 'sit_and_reach', etiqueta: 'Flexibilidad (sit-and-reach)' },
  { id: 'equilibrio_monopodal_sin_vision', etiqueta: 'Equilibrio monopodal sin visión' },
  { id: 'leger_course_navette_20m', etiqueta: 'Resistencia aeróbica (Léger course navette 20 m)' },
];

export const PREGUNTAS_ANTECEDENTES = [
  { id: 'lesion_2anios', texto: '¿Ha sufrido alguna lesión deportiva en los últimos 2 años?' },
  { id: 'cirugia_musculoesqueletica', texto: '¿Ha sido intervenido quirúrgicamente por una lesión musculoesquelética?' },
  { id: 'dolor_articular', texto: '¿Presenta dolor recurrente en alguna articulación (rodilla, hombro, espalda, tobillo, etc.)?' },
];

export function estadoComplementariasInicial() {
  return { respuestas: {} };
}

export function algunaLesion(respuestas = {}) {
  return respuestas.lesion_2anios === true
    || respuestas.cirugia_musculoesqueletica === true
    || respuestas.dolor_articular === true;
}

function esTexto(v) {
  return typeof v === 'string' && v.trim() !== '';
}

function experienciaCompleta(e, edadMax) {
  if (!e || typeof e !== 'object') return false;
  if (!esTexto(e.deporte)) return false;
  if (!Number.isInteger(e.anios) || e.anios < 0 || e.anios > edadMax) return false;
  if (!NIVELES_EXPERIENCIA.some(n => n.valor === e.tipo)) return false;
  if (!MODALIDADES.some(n => n.valor === e.modalidad)) return false;
  if (!HABILIDADES.some(n => n.valor === e.habilidad)) return false;
  return true;
}

export function faltantesComplementarias(respuestas = {}, edad) {
  const faltan = [];
  for (const p of PREGUNTAS_ANTECEDENTES) {
    if (typeof respuestas[p.id] !== 'boolean') faltan.push(p.id);
  }
  if (algunaLesion(respuestas)) {
    if (!esTexto(respuestas.zona_articulacion)) faltan.push('zona_articulacion');
    if (!esTexto(respuestas.fecha_aprox_lesion)) faltan.push('fecha_aprox_lesion');
    if (typeof respuestas.tratamiento_medico !== 'boolean') faltan.push('tratamiento_medico');
  }
  if (typeof respuestas.limitacion_pruebas !== 'boolean') faltan.push('limitacion_pruebas');
  else if (respuestas.limitacion_pruebas === true && !esTexto(respuestas.limitacion_descripcion)) {
    faltan.push('limitacion_descripcion');
  }
  if (typeof respuestas.practica_deporte !== 'boolean') faltan.push('practica_deporte');
  else if (respuestas.practica_deporte === true) {
    const lista = Array.isArray(respuestas.experiencias) ? respuestas.experiencias : [];
    const edadMax = Number.isInteger(edad) ? edad : 120;
    if (lista.length === 0 || !lista.every(e => experienciaCompleta(e, edadMax))) faltan.push('experiencias');
  }
  if (typeof respuestas.practica_actual !== 'boolean') faltan.push('practica_actual');
  return faltan;
}
