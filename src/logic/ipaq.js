/* logic/ipaq.js — IPAQ versión corta (7 ítems).
   Cuestionario Internacional de Actividad Física, últimos 7 días.
   Fuente aplicada: IPAQ_cuestionario_0.pdf (versión en español del
   formato corto). Referencia original: Craig et al. (2003).
   7 preguntas: días/minutos de actividad vigorosa, moderada,
   caminata (≥10 min seguidos) y tiempo sentado en día hábil.
   Cálculo MET-min/semana según el propio cuestionario:
     vigorosa 8 MET × min × días
     moderada 4 MET × min × días
     caminata 3,3 MET × min × días
   Categorías Bajo/Moderado/Alto según los criterios del cuestionario.
   Verificar redacción y protocolo oficial antes de uso clínico. */

export const MET_VIGOROSA = 8;
export const MET_MODERADA = 4;
export const MET_CAMINATA = 3.3;

export const ITEMS_IPAQ = [
  {
    id: 'i1',
    texto: 'Durante los últimos 7 días, ¿en cuántos realizó actividades físicas vigorosas tales como levantar pesos pesados, cavar, hacer ejercicios aeróbicos o andar rápido en bicicleta?',
    ayuda: 'Piense sólo en aquellas actividades que realizó durante por lo menos 10 minutos seguidos.',
  },
  {
    id: 'i2',
    texto: 'Habitualmente, ¿cuánto tiempo en total dedicó a una actividad física intensa en uno de esos días?',
    ayuda: 'Ejemplo: si practicó 20 minutos marque 0 h y 20 min.',
    visibleSi: 'i1',
  },
  {
    id: 'i3',
    texto: 'Durante los últimos 7 días, ¿en cuántos días hizo actividades físicas moderadas como transportar pesos livianos, andar en bicicleta a velocidad regular o jugar a dobles en tenis? No incluya caminar.',
    ayuda: 'Piense solo en aquellas actividades que realizó durante por lo menos 10 minutos seguidos.',
  },
  {
    id: 'i4',
    texto: 'Habitualmente, ¿cuánto tiempo en total dedicó a una actividad física moderada en uno de esos días?',
    ayuda: 'Ejemplo: si practicó 20 minutos marque 0 h y 20 min.',
    visibleSi: 'i3',
  },
  {
    id: 'i5',
    texto: 'Durante los últimos 7 días, ¿en cuántos días caminó por lo menos 10 minutos seguidos?',
    ayuda: 'Incluye caminar en el trabajo o en la casa, para trasladarse de un lugar a otro, o cualquier caminata por recreación, deporte, ejercicio u ocio.',
  },
  {
    id: 'i6',
    texto: 'Habitualmente, ¿cuánto tiempo en total dedicó a caminar en uno de esos días?',
    visibleSi: 'i5',
  },
  {
    id: 'i7',
    texto: 'Habitualmente, ¿cuánto tiempo pasó sentado durante un día hábil?',
    ayuda: 'Incluye trabajo, casa, clase y tiempo libre (escritorio, leer, viajar en autobús, sentado o recostado mirando tele).',
  },
];

export const CATEGORIAS_IPAQ = ['Bajo', 'Moderado', 'Alto'];

export function estadoIpaqInicial() {
  return { respuestas: {} };
}

function esMinutosValidos(v) {
  return v === 'no_sabe' || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1440);
}

function esDiasValidos(v) {
  return Number.isInteger(v) && v >= 0 && v <= 7;
}

export function faltantesIpaq(respuestas = {}) {
  const faltan = [];
  if (!esDiasValidos(respuestas.i1)) faltan.push('i1');
  else if (respuestas.i1 > 0 && !esMinutosValidos(respuestas.i2)) faltan.push('i2');
  if (!esDiasValidos(respuestas.i3)) faltan.push('i3');
  else if (respuestas.i3 > 0 && !esMinutosValidos(respuestas.i4)) faltan.push('i4');
  if (!esDiasValidos(respuestas.i5)) faltan.push('i5');
  else if (respuestas.i5 > 0 && !esMinutosValidos(respuestas.i6)) faltan.push('i6');
  if (!esMinutosValidos(respuestas.i7)) faltan.push('i7');
  return faltan;
}

function minutosUtiles(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function redondear1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * calcularIpaq — MET-min/semana y categoría según el cuestionario.
 * Supuestos documentados (el PDF no detalla desempates):
 * - "No sabe" aporta 0 MET a su componente y se reporta en advertencias.
 * - Días combinados = suma de días vigorosos + moderados + caminata
 *   (puede superar 7 porque un mismo día puede tener varias intensidades).
 * Retorna null si faltan respuestas.
 */
export function calcularIpaq(respuestas = {}) {
  if (faltantesIpaq(respuestas).length > 0) return null;
  const diasVig = respuestas.i1;
  const diasMod = respuestas.i3;
  const diasCam = respuestas.i5;
  const minVig = respuestas.i1 > 0 ? minutosUtiles(respuestas.i2) : 0;
  const minMod = respuestas.i3 > 0 ? minutosUtiles(respuestas.i4) : 0;
  const minCam = respuestas.i5 > 0 ? minutosUtiles(respuestas.i6) : 0;

  const metVigorosa = redondear1(MET_VIGOROSA * minVig * diasVig);
  const metModerada = redondear1(MET_MODERADA * minMod * diasMod);
  const metCaminata = redondear1(MET_CAMINATA * minCam * diasCam);
  const metTotal = redondear1(metVigorosa + metModerada + metCaminata);

  const diasCombinados = diasVig + diasMod + diasCam;
  const noSabe = ['i2', 'i4', 'i6', 'i7'].filter(k => respuestas[k] === 'no_sabe');

  const esAlto = (diasCombinados >= 7 && metTotal >= 3000) || (diasVig >= 3 && metVigorosa >= 1500);
  let esModerado = false;
  if (!esAlto) {
    esModerado =
      (diasVig >= 3 && minVig >= 20 && respuestas.i2 !== 'no_sabe') ||
      ((diasMod + diasCam) >= 5 && (minMod >= 30 || minCam >= 30)) ||
      (diasCombinados >= 5 && metTotal >= 600);
  }
  const categoria = esAlto ? 'Alto' : esModerado ? 'Moderado' : 'Bajo';

  return {
    met: { vigorosa: metVigorosa, moderada: metModerada, caminata: metCaminata, total: metTotal },
    dias: { vigorosa: diasVig, moderada: diasMod, caminata: diasCam, combinados: diasCombinados },
    minutos: { vigorosa: minVig, moderada: minMod, caminata: minCam },
    categoria,
    noSabe,
    advertencias: noSabe.length > 0
      ? ['Algún tiempo se marcó como "No sabe": su componente aporta 0 MET al total.']
      : [],
  };
}
