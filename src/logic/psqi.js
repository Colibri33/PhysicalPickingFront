/**
 * @module logic/psqi
 * @description Ítems, validación y puntuación del Índice de Calidad de Sueño de Pittsburgh, versión colombiana (ICSP-VC).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la definición o el cálculo del PSQI.
 *  - O (Abierto/Cerrado): opciones e ítems son catálogos de datos; las reglas de recodificación están aisladas en funciones pequeñas.
 * Notas: validación colombiana de Escobar-Córdoba y Eslava-Schmalbach (Rev Neurol 2005; 40:150-155), a partir de Buysse et al. (1989)
 * y la versión española de Royuela-Macías. Ítems transcritos del Anexo ICSP-VC; ps-vc.pdf (libro Bobes) solo como referencia de redacción.
 * 19 preguntas puntuables (1-9); 10 y 10a-10e son informativas del compañero de habitación y no puntúan. Puntaje global 0-21.
 * Corte de Buysse >5 = mal dormidor; categorías colombianas: <5 sin problema, 5-7 atención médica, 8-14 atención y tratamiento, >14 grave.
 * Verificar antes de uso clínico.
 */

export const OPCIONES_FRECUENCIA = [
  { valor: 0, etiqueta: 'Ninguna vez en el último mes' },
  { valor: 1, etiqueta: 'Menos de una vez a la semana' },
  { valor: 2, etiqueta: 'Una o dos veces a la semana' },
  { valor: 3, etiqueta: 'Tres o más veces a la semana' },
];

export const OPCIONES_PROBLEMA = [
  { valor: 0, etiqueta: 'Nada problemático' },
  { valor: 1, etiqueta: 'Sólo ligeramente problemático' },
  { valor: 2, etiqueta: 'Moderadamente problemático' },
  { valor: 3, etiqueta: 'Muy problemático' },
];

export const OPCIONES_CALIDAD = [
  { valor: 0, etiqueta: 'Muy buena' },
  { valor: 1, etiqueta: 'Bastante buena' },
  { valor: 2, etiqueta: 'Bastante mala' },
  { valor: 3, etiqueta: 'Muy mala' },
];

export const OPCIONES_CONVIVENCIA = [
  { valor: 0, etiqueta: 'No tengo pareja ni compañero/a de habitación' },
  { valor: 1, etiqueta: 'Sí tengo, pero duerme en otra habitación' },
  { valor: 2, etiqueta: 'Sí tengo, pero duerme en la misma habitación y distinta cama' },
  { valor: 3, etiqueta: 'Sí tengo y duerme en la misma cama' },
];

export const ITEMS_PSQI_HABITOS = [
  { id: 'p1', texto: '¿A qué hora se acostó normalmente por la noche? Escriba la hora habitual en que se acuesta.' },
  { id: 'p2', texto: '¿Cuánto tiempo se demoró en quedarse dormido en promedio? Escriba el tiempo en minutos.' },
  { id: 'p3', texto: '¿A qué hora se levantó habitualmente por la mañana? Escriba la hora habitual de levantarse.' },
  { id: 'p4', texto: '¿Cuántas horas durmió cada noche? (El tiempo puede ser diferente al que usted permanezca en la cama.) Escriba las horas que crea que durmió.' },
];

export const ITEMS_PSQI_PERTURBACIONES = [
  { id: 'p5a', texto: 'No poder quedarse dormido en la primera media hora' },
  { id: 'p5b', texto: 'Despertarse durante la noche o de madrugada' },
  { id: 'p5c', texto: 'Tener que levantarse para ir al baño' },
  { id: 'p5d', texto: 'No poder respirar bien' },
  { id: 'p5e', texto: 'Toser o roncar ruidosamente' },
  { id: 'p5f', texto: 'Sentir frío' },
  { id: 'p5g', texto: 'Sentir calor' },
  { id: 'p5h', texto: 'Tener ‘malos sueños’ o pesadillas' },
  { id: 'p5i', texto: 'Tener dolores' },
  { id: 'p5j', texto: 'Otras razones (por favor, descríbalas)' },
];

export const ITEMS_PSQI_COMPANERO = [
  { id: 'p10a', texto: 'Ronquidos ruidosos' },
  { id: 'p10b', texto: 'Grandes pausas entre respiraciones, mientras duerme' },
  { id: 'p10c', texto: 'Sacudidas o espasmos de piernas mientras duerme' },
  { id: 'p10d', texto: 'Episodios de desorientación o confusión mientras duerme' },
  { id: 'p10e', texto: 'Otros inconvenientes mientras usted duerme; por favor, descríbalos' },
];

/** Valida una hora en formato HH:MM de 24 horas.
 * @param {*} v - valor a evaluar.
 * @returns {boolean} true si el formato es válido. */
function esHora(v) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Valida una frecuencia codificada de 0 a 3.
 * @param {*} v - valor a evaluar.
 * @returns {boolean} true si es un entero entre 0 y 3. */
function esFrecuencia(v) {
  return Number.isInteger(v) && v >= 0 && v <= 3;
}

/** Crea el estado inicial vacío del cuestionario.
 * @returns {{respuestas: Object}} estado sin respuestas. */
export function estadoPsqiInicial() {
  return { respuestas: {} };
}

/** Indica si la persona comparte habitación o cama (p10 > 0), lo que habilita los ítems informativos.
 * @param {Object} [respuestas] - respuestas por id.
 * @returns {boolean} true si hay compañero. */
export function tieneCompanero(respuestas = {}) {
  return typeof respuestas.p10 === 'number' && respuestas.p10 > 0;
}

/** Determina los ítems obligatorios sin respuesta válida, incluidas las descripciones condicionales.
 * @param {Object} [respuestas] - respuestas por id.
 * @returns {string[]} ids pendientes. */
export function faltantesPsqi(respuestas = {}) {
  const faltan = [];
  if (!esHora(respuestas.p1)) faltan.push('p1');
  const p2 = respuestas.p2;
  if (!(typeof p2 === 'number' && Number.isFinite(p2) && p2 >= 0 && p2 <= 1440)) faltan.push('p2');
  if (!esHora(respuestas.p3)) faltan.push('p3');
  const p4 = respuestas.p4;
  if (!(typeof p4 === 'number' && Number.isFinite(p4) && p4 >= 0 && p4 <= 24)) faltan.push('p4');
  for (const it of ITEMS_PSQI_PERTURBACIONES) {
    if (!esFrecuencia(respuestas[it.id])) faltan.push(it.id);
  }
  if (respuestas.p5j > 0) {
    const d = respuestas.p5j_descripcion;
    if (typeof d !== 'string' || d.trim() === '') faltan.push('p5j_descripcion');
  }
  if (!esFrecuencia(respuestas.p6)) faltan.push('p6');
  if (!esFrecuencia(respuestas.p7)) faltan.push('p7');
  if (!esFrecuencia(respuestas.p8)) faltan.push('p8');
  if (!esFrecuencia(respuestas.p9)) faltan.push('p9');
  if (!esFrecuencia(respuestas.p10)) faltan.push('p10');
  if (tieneCompanero(respuestas)) {
    for (const it of ITEMS_PSQI_COMPANERO) {
      if (!esFrecuencia(respuestas[it.id])) faltan.push(it.id);
    }
    if (respuestas.p10e > 0) {
      const d = respuestas.p10e_descripcion;
      if (typeof d !== 'string' || d.trim() === '') faltan.push('p10e_descripcion');
    }
  }
  return faltan;
}

/** Convierte una hora HH:MM en minutos desde la medianoche.
 * @param {string} hora - hora en formato HH:MM.
 * @returns {number} minutos transcurridos desde las 00:00. */
export function minutosDesdeHora(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
}

/** Calcula las horas en cama entre acostarse y levantarse, considerando que puede cruzar la medianoche.
 * @param {string} p1 - hora de acostarse (HH:MM).
 * @param {string} p3 - hora de levantarse (HH:MM).
 * @returns {number} horas en cama. */
export function horasEnCama(p1, p3) {
  const acostarse = minutosDesdeHora(p1);
  const levantarse = minutosDesdeHora(p3);
  let diff = levantarse - acostarse;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

/** Recodifica los minutos de latencia del sueño a 0-3.
 * @param {number} minutos - latencia en minutos.
 * @returns {number} puntaje 0-3. */
function recodificarLatencia(minutos) {
  if (minutos <= 15) return 0;
  if (minutos <= 30) return 1;
  if (minutos <= 60) return 2;
  return 3;
}

/** Recodifica la suma (latencia recodificada + p5a) a 0-3.
 * @param {number} suma - suma de ambos puntajes.
 * @returns {number} puntaje 0-3. */
function recodificarSumaLatencia(suma) {
  if (suma === 0) return 0;
  if (suma <= 2) return 1;
  if (suma <= 4) return 2;
  return 3;
}

/** Recodifica las horas de sueño a 0-3.
 * @param {number} horas - horas dormidas por noche.
 * @returns {number} puntaje 0-3. */
function recodificarDuracion(horas) {
  if (horas > 7) return 0;
  if (horas >= 6) return 1;
  if (horas >= 5) return 2;
  return 3;
}

/** Recodifica la eficiencia habitual de sueño (%) a 0-3.
 * @param {number} pct - eficiencia en porcentaje.
 * @returns {number} puntaje 0-3. */
function recodificarEficiencia(pct) {
  if (pct > 85) return 0;
  if (pct >= 75) return 1;
  if (pct >= 65) return 2;
  return 3;
}

/** Recodifica la suma de perturbaciones (p5b-p5j) a 0-3.
 * @param {number} suma - suma de frecuencias.
 * @returns {number} puntaje 0-3. */
function recodificarPerturbaciones(suma) {
  if (suma === 0) return 0;
  if (suma <= 9) return 1;
  if (suma <= 18) return 2;
  return 3;
}

/** Recodifica la suma de disfunción diurna (p7 + p8) a 0-3.
 * @param {number} suma - suma de frecuencias.
 * @returns {number} puntaje 0-3. */
function recodificarDisfuncion(suma) {
  if (suma === 0) return 0;
  if (suma <= 2) return 1;
  if (suma <= 4) return 2;
  return 3;
}

/** Asigna la categoría del artículo de validación colombiano según el puntaje global.
 * @param {number} global - puntaje global 0-21.
 * @returns {string} categoría descriptiva. */
export function categoriaColombiana(global) {
  if (global < 5) return 'Sin problema de sueño';
  if (global <= 7) return 'Merece atención médica';
  if (global <= 14) return 'Merece atención y tratamiento médico';
  return 'Problema de sueño grave';
}

/** Calcula los 7 componentes (C1-C7, 0-3) y el puntaje global 0-21 según el Anexo ICSP-VC.
 * @param {Object} [respuestas] - respuestas por id.
 * @returns {Object|null} componentes, puntajeGlobal, horasEnCama, eficiencia, categoria y malDormidorBuysse; null si faltan respuestas. */
export function calcularPsqi(respuestas = {}) {
  if (faltantesPsqi(respuestas).length > 0) return null;

  const c1 = respuestas.p9;
  const c2 = recodificarSumaLatencia(recodificarLatencia(respuestas.p2) + respuestas.p5a);
  const c3 = recodificarDuracion(respuestas.p4);

  const cama = horasEnCama(respuestas.p1, respuestas.p3);
  const eficiencia = cama > 0 ? (respuestas.p4 / cama) * 100 : 0;
  const c4 = recodificarEficiencia(Math.min(eficiencia, 100));

  const sumaPerturb = ['p5b', 'p5c', 'p5d', 'p5e', 'p5f', 'p5g', 'p5h', 'p5i', 'p5j']
    .reduce((a, k) => a + respuestas[k], 0);
  const c5 = recodificarPerturbaciones(sumaPerturb);
  const c6 = respuestas.p6;
  const c7 = recodificarDisfuncion(respuestas.p7 + respuestas.p8);

  const componentes = {
    calidad_subjetiva: c1,
    latencia: c2,
    duracion: c3,
    eficiencia_habitual: c4,
    perturbaciones: c5,
    uso_medicacion: c6,
    disfuncion_diurna: c7,
  };
  const global = c1 + c2 + c3 + c4 + c5 + c6 + c7;

  return {
    componentes,
    puntajeGlobal: global,
    horasEnCama: Math.round(cama * 100) / 100,
    eficiencia: Math.round(Math.min(eficiencia, 100) * 10) / 10,
    categoria: categoriaColombiana(global),
    malDormidorBuysse: global > 5,
  };
}
