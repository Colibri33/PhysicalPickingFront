/* logic/parq.js — PAR-Q+ (version 2023 segun mejor referencia disponible).
   Arbol de visibilidad condicional + poda + resultado.
   Datos: { respuestas: {id:'si'|'no'}, detalles: {id: texto}, resultado: 'apto'|'consultar' }
   Solo las preguntas visibles aparecen en `respuestas`.
   Textos y ORDEN de subpreguntas: PAR-Q+ en español (parq+.pdf; traducción de
   M. Rubio con J. y L. Schwartz), igual al Google Form aplicado. Los ids (c3a, c4b...)
   siguen la numeracion oficial: no reordenar, los registros guardados dependen de ella. */

export const PREGUNTAS_GENERALES = [
  { id: 'g1', texto: '¿Alguna vez su médico le ha dicho que tiene una afección cardíaca O presión arterial alta?' },
  { id: 'g2', texto: '¿Siente usted dolor en el pecho en reposo, durante las actividades de la vida diaria O cuando realiza actividad física?' },
  { id: 'g3', texto: '¿Tiene usted problemas de equilibrio debido a mareos O ha sufrido pérdida de consciencia en los últimos 12 meses? Por favor conteste NO si el mareo fue debido a una sobre hiperventilación (incluso durante el ejercicio vigoroso/intenso)' },
  { id: 'g4', texto: '¿Alguna vez le diagnosticaron otra enfermedad crónica (sin ser enfermedad cardíaca o hipertensión arterial)?', detalle: 'PRECISE POR FAVOR:' },
  { id: 'g5', texto: '¿Está usted tomando actualmente medicación para alguna enfermedad crónica?', detalle: 'POR FAVOR DETALLE LAS ENFERMEDAD/ES Y LA MEDICACIÓN ASOCIADA A ELLA/S:' },
  { id: 'g6', texto: '¿Sufre usted actualmente (o ha sufrido en los últimos 12 meses) alguna lesión ósea, articular o de tejidos blandos (muscular, ligamentosa o tendinosa) que empeoraría al hacerse usted físicamente más activo? Por favor, responda NO si tuvo algún problema en el pasado, pero que no limita su capacidad actual de estar físicamente activo.', detalle: 'PRECISE POR FAVOR:' },
  { id: 'g7', texto: '¿Alguna vez su médico le ha dicho que solo debe realizar actividad física bajo supervisión medica?' },
];

export const CONDICIONES = [
  { id: 'c1', texto: '¿Sufre usted de artritis, osteoporosis o problemas de columna?', abreSi: 'si', hijas: [
    { id: 'c1a', texto: '¿Tiene dificultades para controlar los síntomas con medicación u otro tratamiento indicado por su médico? (Conteste NO si estos problemas no están siendo tratados con fármacos u otros medios)', abreSi: 'si' },
    { id: 'c1b', texto: '¿Tiene problemas articulares dolorosos, fractura reciente o una fractura a causa de osteoporosis o cáncer, desplazamientos vertebrales (ej. espondilolistesis) y/o espondilolisis/defecto en la porción interarticular?', abreSi: 'si' },
    { id: 'c1c', texto: '¿Ha recibido tratamiento con corticoides inyectables o vía oral regularmente durante más de tres meses?', abreSi: 'si' },
  ]},
  { id: 'c2', texto: '¿Padece usted algún tipo de cáncer?', abreSi: 'si', hijas: [
    { id: 'c2a', texto: '¿Su diagnóstico de cáncer incluye algunos de estos cánceres: pulmonar/broncógeno, mieloma múltiple (cáncer de células plasmáticas), cabeza y/o cuello?', abreSi: 'si' },
    { id: 'c2b', texto: '¿Se encuentra actualmente en tratamiento con radioterapia o quimioterapia?', abreSi: 'si' },
  ]},
  { id: 'c3', texto: '¿Padece usted alguna enfermedad cardiovascular o cardíaca? (incluye enfermedad coronaria, insuficiencia cardíaca, anomalía diagnosticada del ritmo cardíaco)', abreSi: 'si', hijas: [
    { id: 'c3a', texto: '¿Tiene dificultades para controlar los síntomas con medicación u otro tratamiento indicado por su médico? (Conteste NO si estos problemas no están siendo tratados con fármacos u otros medios)', abreSi: 'si' },
    { id: 'c3b', texto: '¿Sufre de arritmia que requiere tratamiento médico? (ej. fibrilación auricular, extrasístoles ventriculares)', abreSi: 'si' },
    { id: 'c3c', texto: '¿Sufre de insuficiencia cardíaca crónica?', abreSi: 'si' },
    { id: 'c3d', texto: '¿Le han diagnosticado una enfermedad coronaria (cardiovascular) y hace 2 meses o más que no participa en actividades físicas frecuentes?', abreSi: 'si' },
  ]},
  { id: 'c4', texto: '¿Tiene usted hipertensión arterial?', abreSi: 'si', hijas: [
    { id: 'c4a', texto: '¿Tiene dificultades para controlar los síntomas con medicación u otro tratamiento indicado por su médico? (Conteste NO si no está siendo tratado por este problema con fármacos u otros medios)', abreSi: 'si' },
    { id: 'c4b', texto: '¿Su presión arterial en reposo es igual o superior a 160/90 mmHg, con o sin medicación? (Conteste SI si desconoce su presión arterial de reposo)', abreSi: 'si' },
  ]},
  { id: 'c5', texto: '¿Tiene usted alguna enfermedad metabólica? Esto incluye Diabetes tipo 1, Diabetes tipo 2, prediabetes', abreSi: 'si', hijas: [
    { id: 'c5a', texto: '¿Tiene dificultades para mantener los niveles de glucosa en la sangre con la alimentación, fármacos u otro procedimiento indicado por su médico?', abreSi: 'si' },
    { id: 'c5b', texto: '¿Sufre con frecuencia de bajos niveles de glucosa en la sangre (hipoglucemia) después del ejercicio y/o durante las actividades de la vida diaria? Los signos de hipoglucemia incluyen temblores, nerviosismo, irritabilidad, excesiva sudoración, mareos, confusión, dificultad para hablar, astenia física o somnolencia.', abreSi: 'si' },
    { id: 'c5c', texto: '¿Tiene signos o síntomas de complicaciones de la diabetes tales como enfermedad cardíaca o vascular y/o complicaciones que afecten a los riñones, los ojos o la sensibilidad de los pies y dedos de los pies?', abreSi: 'si' },
    { id: 'c5d', texto: '¿Sufre algún otro tipo de enfermedad metabólica (diabetes gestacional, enfermedad renal crónica o problemas hepáticos)?', abreSi: 'si' },
    { id: 'c5e', texto: '¿Tiene planeado realizar en el futuro inmediato lo que para usted es ejercicio inusualmente vigoroso o intenso?', abreSi: 'si' },
  ]},
  { id: 'c6', texto: '¿Tiene usted algún trastorno de salud mental o problemas de aprendizaje? Esto incluye enfermedad de Alzheimer, demencia, depresión, trastorno de ansiedad, trastorno alimentario, trastorno psicótico, discapacidad intelectual, síndrome de Down', abreSi: 'si', hijas: [
    { id: 'c6a', texto: '¿Tiene dificultades para controlar su enfermedad con medicación u otro tratamiento indicado por su médico? (Conteste NO si no está recibiendo tratamiento farmacológico u otros tratamientos)', abreSi: 'si' },
    { id: 'c6b', texto: '¿Tiene Síndrome de Down Y problemas de espalda que afectan los nervios o los músculos?', abreSi: 'si' },
  ]},
  { id: 'c7', texto: '¿Tiene usted alguna enfermedad respiratoria? (incluye EPOC, asma, hipertensión pulmonar)', abreSi: 'si', hijas: [
    { id: 'c7a', texto: '¿Tiene dificultades para controlar su enfermedad con medicación u otro tratamiento indicado por su médico? (Conteste NO si no está siendo tratado por esto con fármacos u otros medios)', abreSi: 'si' },
    { id: 'c7b', texto: '¿Alguna vez su médico le ha comentado que el oxígeno en su sangre es insuficiente en reposo o durante la actividad física y/o que se recomienda la oxigenoterapia complementaria?', abreSi: 'si' },
    { id: 'c7c', texto: '¿En caso de ser asmático, tiene usted síntomas actuales como opresión en el pecho, silbidos al respirar, esfuerzo respiratorio constante, tos persistente (más de 2 días a la semana) o ha necesitado medicación de rescate más de 2 veces la semana pasada?', abreSi: 'si' },
    { id: 'c7d', texto: '¿Su médico alguna vez le ha dicho que tiene la presión arterial alta en los vasos sanguíneos de sus pulmones?', abreSi: 'si' },
  ]},
  { id: 'c8', texto: '¿Tiene usted una lesión medular (vertebral)? (incluye tetraplejía y paraplejía)', abreSi: 'si', hijas: [
    { id: 'c8a', texto: '¿Tiene dificultades para controlar su enfermedad con medicación u otro tratamiento indicado por su médico? (Conteste NO si no está siendo tratado por esto con fármacos u otros medios)', abreSi: 'si' },
    { id: 'c8b', texto: '¿Habitualmente, muestra usted baja presión sanguínea en reposo lo suficientemente significativa como para causar mareos, aturdimiento y/o desmayos?', abreSi: 'si' },
    { id: 'c8c', texto: '¿Le ha indicado su médico que usted presenta ataques repentinos de presión arterial alta (conocida como disreflexia autonómica)?', abreSi: 'si' },
  ]},
  { id: 'c9', texto: '¿Ha sufrido usted un accidente cerebro vascular (ACV)? Esto incluye el accidente isquémico transitorio', abreSi: 'si', hijas: [
    { id: 'c9a', texto: '¿Tiene dificultades para controlar su enfermedad con medicación u otro tratamiento indicado por su médico? (Conteste NO si no está siendo tratado por esto con fármacos u otros medios)', abreSi: 'si' },
    { id: 'c9b', texto: '¿Tiene dificultades de movilidad o para caminar?', abreSi: 'si' },
    { id: 'c9c', texto: '¿Ha sufrido usted un accidente cerebro vascular o un trastorno neurológico o de los músculos en los últimos 6 meses?', abreSi: 'si' },
  ]},
  { id: 'c10', texto: '¿Tiene algún otro trastorno médico no mencionado anteriormente o tiene dos o más trastornos médicos?', abreSi: 'si', hijas: [
    { id: 'c10a', texto: '¿Ha experimentado pérdida de conocimiento o síncope como resultado de una lesión en la cabeza en los 12 últimos meses o ha sido diagnosticado con una concusión o comoción cerebral en los últimos 12 meses?', abreSi: 'si' },
    { id: 'c10b', texto: '¿Padece usted alguna enfermedad no considerada anteriormente, como epilepsia, problemas renales o enfermedades neurológicas?', abreSi: 'si' },
    { id: 'c10c', texto: '¿Padece usted en este momento dos o más enfermedades crónicas?', abreSi: 'si', detalle: 'POR FAVOR INDIQUE SUS ENFERMEDADES Y LOS FÁRMACOS CORRESPONDIENTES QUE ESTÉ TOMANDO' },
  ]},
];

export function estadoParqInicial() {
  return { respuestas: {}, detalles: {} };
}

export function seccionCondicionesAbierta(respuestas = {}) {
  return PREGUNTAS_GENERALES.some(p => respuestas[p.id] === 'si');
}

export function preguntasGeneralesVisibles() {
  return PREGUNTAS_GENERALES.map(p => ({ ...p, nivel: 0 }));
}

function aplanarArbol(nodos, respuestas, nivel = 0) {
  const out = [];
  for (const nodo of nodos) {
    out.push({ ...nodo, nivel });
    const abre = respuestas[nodo.id] === (nodo.abreSi || 'si');
    if (abre && Array.isArray(nodo.hijas) && nodo.hijas.length) {
      out.push(...aplanarArbol(nodo.hijas, respuestas, nivel + 1));
    }
  }
  return out;
}

export function condicionesVisibles(respuestas = {}) {
  if (!seccionCondicionesAbierta(respuestas)) return [];
  return aplanarArbol(CONDICIONES, respuestas, 0);
}

export function todasVisibles(respuestas = {}) {
  return [...preguntasGeneralesVisibles(), ...condicionesVisibles(respuestas)];
}

export function podarRespuestas(respuestas = {}, detalles = {}) {
  const visibles = new Set(todasVisibles(respuestas).map(p => p.id));
  const r2 = {};
  const d2 = {};
  for (const id of visibles) {
    if (respuestas[id] === 'si' || respuestas[id] === 'no') r2[id] = respuestas[id];
    if (typeof detalles[id] === 'string' && detalles[id] !== '' && r2[id] === 'si') {
      d2[id] = detalles[id].slice(0, 300);
    }
  }
  return { respuestas: r2, detalles: d2 };
}

export function pendientes(respuestas = {}) {
  return todasVisibles(respuestas).filter(p => respuestas[p.id] !== 'si' && respuestas[p.id] !== 'no');
}

export function evaluarParq(respuestas = {}) {
  const visibles = todasVisibles(respuestas);
  const algunaHijaSi = visibles.some(p => p.nivel > 0 && respuestas[p.id] === 'si');
  return algunaHijaSi ? 'consultar' : 'apto';
}
