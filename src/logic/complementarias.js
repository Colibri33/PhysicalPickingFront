/**
 * @module logic/complementarias
 * @description Preguntas complementarias propias de PhysicalPicking (antecedentes de lesiones, limitaciones y experiencia deportiva) y su validación de completitud.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el contenido o la validación de este bloque complementario.
 *  - O (Abierto/Cerrado): niveles, modalidades, habilidades y preguntas son catálogos de datos extensibles.
 * Notas: NO es el PAR-Q+ oficial y nunca se presenta como tal. Los ids coinciden con los del módulo de evaluación
 * (modulos/complementarias/physicalpicking.js) para copia directa. Textos de lesiones y experiencia según la especificación
 * del proyecto; los de limitaciones son redacción propia provisional.
 */

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

/** Crea el estado inicial vacío del bloque.
 * @returns {{respuestas: Object}} estado sin respuestas. */
export function estadoComplementariasInicial() {
  return { respuestas: {} };
}

/** Indica si el antecedente reporta lesión, cirugía o dolor articular recurrente.
 * @param {Object} [respuestas] - respuestas del bloque.
 * @returns {boolean} true si alguna respuesta es afirmativa. */
export function algunaLesion(respuestas = {}) {
  return respuestas.lesion_2anios === true
    || respuestas.cirugia_musculoesqueletica === true
    || respuestas.dolor_articular === true;
}

/** Verifica que el valor sea una cadena no vacía.
 * @param {*} v - valor a evaluar.
 * @returns {boolean} true si es texto con contenido. */
function esTexto(v) {
  return typeof v === 'string' && v.trim() !== '';
}

/** Valida que una experiencia deportiva tenga todos sus campos y años coherentes.
 * @param {Object} e - experiencia (deporte, anios, tipo, modalidad, habilidad).
 * @param {number} edadMax - límite superior de años de práctica (edad de la persona).
 * @returns {boolean} true si está completa y es válida. */
function experienciaCompleta(e, edadMax) {
  if (!e || typeof e !== 'object') return false;
  if (!esTexto(e.deporte)) return false;
  if (!Number.isInteger(e.anios) || e.anios < 0 || e.anios > edadMax) return false;
  if (!NIVELES_EXPERIENCIA.some(n => n.valor === e.tipo)) return false;
  if (!MODALIDADES.some(n => n.valor === e.modalidad)) return false;
  if (!HABILIDADES.some(n => n.valor === e.habilidad)) return false;
  return true;
}

/** Determina los campos obligatorios sin responder, según las ramas condicionales activas.
 * @param {Object} [respuestas] - respuestas del bloque.
 * @param {number} [edad] - edad en años; si no es entera se admite hasta 120 años de práctica.
 * @returns {string[]} ids de los campos pendientes. */
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
