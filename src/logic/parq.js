/* logic/parq.js — PAR-Q+ (version 2023 segun mejor referencia disponible).
   Arbol de visibilidad condicional + poda + resultado.
   Datos: { respuestas: {id:'si'|'no'}, detalles: {id: texto}, resultado: 'apto'|'consultar' }
   Solo las preguntas visibles aparecen en `respuestas`.
   Verificar redaccion contra el formulario oficial (eparmedx.com) antes de uso clinico. */

export const PREGUNTAS_GENERALES = [
  { id: 'g1', texto: '¿Alguna vez su médico le ha dicho que tiene una afección cardíaca O presión arterial alta?' },
  { id: 'g2', texto: '¿Siente dolor en el pecho en reposo, durante sus actividades de la vida diaria O cuando hace actividad física?' },
  { id: 'g3', texto: '¿Pierde el equilibrio por mareo O ha perdido el conocimiento en los últimos 12 meses? (Responda NO si el mareo estuvo asociado a hiperventilación, incluso durante ejercicio vigoroso)' },
  { id: 'g4', texto: '¿Le han diagnosticado alguna otra condición médica crónica (distinta de enfermedad cardíaca o presión arterial alta)?', detalle: 'Liste la(s) condición(es)' },
  { id: 'g5', texto: '¿Toma actualmente medicamentos prescritos para una condición médica crónica?', detalle: 'Liste condiciones y medicamentos' },
  { id: 'g6', texto: '¿Tiene actualmente (o ha tenido en los últimos 12 meses) un problema óseo, articular o de tejidos blandos (músculo, ligamento o tendón) que podría empeorar al aumentar su actividad física? (Responda NO si tuvo un problema en el pasado que ya no limita su actividad física actual)', detalle: 'Liste la(s) condición(es)' },
  { id: 'g7', texto: '¿Alguna vez su médico le ha dicho que solo debe hacer actividad física supervisada médicamente?' },
];

export const CONDICIONES = [
  { id: 'c1', texto: '¿Tiene artritis, osteoporosis o problemas de espalda?', abreSi: 'si', hijas: [
    { id: 'c1a', texto: '¿Tiene dificultad para controlar su condición con medicamentos u otras terapias prescritas por un médico? (Responda NO si actualmente no toma medicamentos ni otros tratamientos)', abreSi: 'si' },
    { id: 'c1b', texto: '¿Tiene problemas articulares que causan dolor, una fractura reciente o causada por osteoporosis o cáncer, vértebra desplazada (p. ej. espondilolistesis) y/o espondilólisis/defecto de la pars (grieta en el anillo óseo de la parte posterior de la columna)?', abreSi: 'si' },
    { id: 'c1c', texto: '¿Ha recibido inyecciones de esteroides o ha tomado tabletas de esteroides con regularidad por más de 3 meses?', abreSi: 'si' },
  ]},
  { id: 'c2', texto: '¿Tiene actualmente cáncer de cualquier tipo?', abreSi: 'si', hijas: [
    { id: 'c2a', texto: '¿Su diagnóstico de cáncer incluye alguno de estos tipos: pulmón/broncogénico, mieloma múltiple (cáncer de células plasmáticas), cabeza y/o cuello?', abreSi: 'si' },
    { id: 'c2b', texto: '¿Está recibiendo actualmente tratamiento contra el cáncer (como quimioterapia o radioterapia)?', abreSi: 'si' },
  ]},
  { id: 'c3', texto: '¿Tiene una afección cardíaca o cardiovascular? (incluye enfermedad coronaria, insuficiencia cardíaca, anomalía diagnosticada del ritmo cardíaco)', abreSi: 'si', hijas: [
    { id: 'c3a', texto: '¿Tiene dificultad para controlar su condición con medicamentos u otras terapias prescritas por un médico? (Responda NO si actualmente no toma medicamentos ni otros tratamientos)', abreSi: 'si' },
    { id: 'c3b', texto: '¿Tiene un latido cardíaco irregular que requiere manejo médico? (p. ej. fibrilación auricular, contracción ventricular prematura)', abreSi: 'si' },
    { id: 'c3c', texto: '¿Tiene insuficiencia cardíaca crónica?', abreSi: 'si' },
    { id: 'c3d', texto: '¿Tiene enfermedad arterial coronaria (cardiovascular) diagnosticada y no ha hecho actividad física regular en los últimos 2 meses?', abreSi: 'si' },
  ]},
  { id: 'c4', texto: '¿Tiene actualmente presión arterial alta?', abreSi: 'si', hijas: [
    { id: 'c4a', texto: '¿Tiene dificultad para controlar su condición con medicamentos u otras terapias prescritas por un médico? (Responda NO si actualmente no toma medicamentos ni otros tratamientos)', abreSi: 'si' },
    { id: 'c4b', texto: '¿Tiene una presión arterial en reposo igual o superior a 160/90 mmHg, con o sin medicación? (Responda SÍ si no conoce su presión arterial en reposo)', abreSi: 'si' },
  ]},
  { id: 'c5', texto: '¿Tiene alguna condición metabólica? (incluye diabetes tipo 1, diabetes tipo 2, prediabetes)', abreSi: 'si', hijas: [
    { id: 'c5a', texto: '¿Tiene con frecuencia dificultad para controlar sus niveles de azúcar en sangre con alimentos, medicamentos u otras terapias prescritas por un médico? (Responda NO si actualmente no toma medicamentos ni otros tratamientos)', abreSi: 'si' },
    { id: 'c5b', texto: '¿Sufre con frecuencia signos y síntomas de azúcar baja en sangre (hipoglucemia) después del ejercicio y/o durante sus actividades de la vida diaria? (Los signos pueden incluir temblor, nerviosismo, irritabilidad inusual, sudoración anormal, mareo o aturdimiento, confusión mental, dificultad para hablar, debilidad o somnolencia)', abreSi: 'si' },
    { id: 'c5c', texto: '¿Tiene signos o síntomas de complicaciones de la diabetes, como enfermedad cardíaca o vascular y/o complicaciones que afecten los ojos, los riñones o la sensibilidad de los dedos y pies?', abreSi: 'si' },
    { id: 'c5d', texto: '¿Tiene otras condiciones metabólicas (como diabetes gestacional actual, enfermedad renal crónica o problemas hepáticos)?', abreSi: 'si' },
    { id: 'c5e', texto: '¿Planea realizar en el futuro cercano ejercicio de intensidad inusualmente alta (o vigorosa) para usted?', abreSi: 'si' },
  ]},
  { id: 'c6', texto: '¿Tiene algún problema de salud mental o dificultad de aprendizaje? (incluye Alzheimer, demencia, depresión, trastorno de ansiedad, trastorno alimentario, trastorno psicótico, discapacidad intelectual, síndrome de Down)', abreSi: 'si', hijas: [
    { id: 'c6a', texto: '¿Tiene dificultad para controlar su condición con medicamentos u otras terapias prescritas por un médico? (Responda NO si actualmente no toma medicamentos ni otros tratamientos)', abreSi: 'si' },
    { id: 'c6b', texto: '¿Tiene síndrome de Down Y problemas de espalda que afectan nervios o músculos?', abreSi: 'si' },
  ]},
  { id: 'c7', texto: '¿Tiene una enfermedad respiratoria? (incluye EPOC, asma, hipertensión pulmonar)', abreSi: 'si', hijas: [
    { id: 'c7a', texto: '¿Tiene dificultad para controlar su condición con medicamentos u otras terapias prescritas por un médico? (Responda NO si actualmente no toma medicamentos ni otros tratamientos)', abreSi: 'si' },
    { id: 'c7b', texto: '¿Su médico le ha dicho alguna vez que su nivel de oxígeno en sangre es bajo en reposo o durante el ejercicio y/o que necesita oxigenoterapia suplementaria?', abreSi: 'si' },
    { id: 'c7c', texto: '¿Si es asmático/a, tiene actualmente síntomas de opresión en el pecho, sibilancias, respiración dificultosa, tos persistente (más de 2 días/semana), o ha usado su medicación de rescate más de 2 veces en la última semana?', abreSi: 'si' },
    { id: 'c7d', texto: '¿Su médico le ha dicho alguna vez que tiene presión arterial alta en los vasos sanguíneos de los pulmones?', abreSi: 'si' },
  ]},
  { id: 'c8', texto: '¿Tiene una lesión de la médula espinal? (incluye tetraplejía y paraplejía)', abreSi: 'si', hijas: [
    { id: 'c8a', texto: '¿Tiene dificultad para controlar su condición con medicamentos u otras terapias prescritas por un médico? (Responda NO si actualmente no toma medicamentos ni otros tratamientos)', abreSi: 'si' },
    { id: 'c8b', texto: '¿Presenta comúnmente presión arterial baja en reposo, lo bastante significativa como para causar mareo, aturdimiento y/o desmayos?', abreSi: 'si' },
    { id: 'c8c', texto: '¿Su médico le ha indicado que presenta episodios repentinos de presión arterial alta (conocidos como disreflexia autonómica)?', abreSi: 'si' },
  ]},
  { id: 'c9', texto: '¿Ha tenido un accidente cerebrovascular? (incluye ataque isquémico transitorio o evento cerebrovascular)', abreSi: 'si', hijas: [
    { id: 'c9a', texto: '¿Tiene dificultad para controlar su condición con medicamentos u otras terapias prescritas por un médico? (Responda NO si actualmente no toma medicamentos ni otros tratamientos)', abreSi: 'si' },
    { id: 'c9b', texto: '¿Tiene alguna dificultad para caminar o movilizarse?', abreSi: 'si' },
    { id: 'c9c', texto: '¿Ha tenido un accidente cerebrovascular o una afectación de nervios o músculos en los últimos 6 meses?', abreSi: 'si' },
  ]},
  { id: 'c10', texto: '¿Tiene alguna otra condición médica no listada arriba, o dos o más condiciones médicas?', abreSi: 'si', hijas: [
    { id: 'c10a', texto: '¿Ha tenido un desmayo, pérdida de conocimiento o blackout a causa de un golpe en la cabeza en los últimos 12 meses, O le han diagnosticado una conmoción cerebral en los últimos 12 meses?', abreSi: 'si' },
    { id: 'c10b', texto: '¿Tiene una condición médica no listada (como epilepsia, condiciones neurológicas, problemas renales)?', abreSi: 'si' },
    { id: 'c10c', texto: '¿Convive actualmente con dos o más condiciones médicas?', abreSi: 'si', detalle: 'Liste sus condiciones médicas y medicamentos relacionados' },
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
