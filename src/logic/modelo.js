/* ═══════════════════════════════════════════════════════════════
   PhysicalPicking · logic/modelo.js  v5.0
   Motor científico puro — sin React, sin DOM.
   v5: sin dermatoglifia · perfiles deportivos · ranking · interpretacion
   ═══════════════════════════════════════════════════════════════ */

/*
 * Rangos calibrados para población general físicamente activa.
 * No son baremos de alto rendimiento; representan el espectro
 * real que abarca desde niveles bajos hasta niveles altos
 * en personas activas no necesariamente deportistas.
 *
 * IMPORTANTE — TRANSPARENCIA METODOLÓGICA: estos rangos son una
 * calibración interna del proyecto (definida junto con el diseño de
 * los perfiles funcionales), no provienen de una tabla de normas
 * publicada, validada o citada de un protocolo especifico (p. ej.
 * no son los baremos oficiales de un test de Cooper, 1RM, Course
 * Navette, etc.). Se documentan aqui por transparencia: si este
 * sistema se usa con fines clinicos, de investigacion o de seleccion
 * deportiva formal, estos rangos deben ser revisados y sustituidos
 * por normas validadas para la poblacion objetivo real.
 *
 * `paso` (step) define la precision del slider — no es parte del
 * rango cientifico, es una decision de UX segun que tan fino tiene
 * sentido medir cada unidad (enteros para repeticiones/kg, decimas
 * para tiempos con cronometro, etc.).
 *
 * FUENTE UNICA DE VERDAD: estas son las unicas definiciones de
 * rango/paso de variables fisicas del sistema. El backend
 * (src/utils/validacion.js) MANTIENE UNA COPIA ESPEJO de estos
 * mismos valores para poder validar sin depender de este modulo del
 * frontend (son dos despliegues/repositorios separados sin build
 * compartido) — si cambias un rango aqui, DEBES actualizar tambien
 * el backend. Ver el comentario equivalente alla.
 */
export const VARS_FISICAS = [
  { id: 'fuerza',       nombre: 'Fuerza maxima',   color: '#6d28d9', unidad: 'kg',           minimo: 10,   maximo: 100,  paso: 1,   direccion: 'mayor_mejor' },
  { id: 'fuerzaExp',    nombre: 'Fuerza explosiva', color: '#9333ea', unidad: 'cm',           minimo: 5,    maximo: 65,   paso: 1,   direccion: 'mayor_mejor' },
  { id: 'resistencia',  nombre: 'Resistencia',      color: '#0f9d66', unidad: 'metros',       minimo: 800,  maximo: 3200, paso: 10,  direccion: 'mayor_mejor' },
  { id: 'velocidad',    nombre: 'Velocidad',         color: '#0284c7', unidad: 'segundos',     minimo: 4.0,  maximo: 8.0,  paso: 0.1, direccion: 'menor_mejor' },
  { id: 'agilidad',     nombre: 'Agilidad',          color: '#0891b2', unidad: 'segundos',     minimo: 14,   maximo: 26,   paso: 0.1, direccion: 'menor_mejor' },
  { id: 'flexibilidad', nombre: 'Flexibilidad',      color: '#db2777', unidad: 'cm',           minimo: -20,  maximo: 30,   paso: 1,   direccion: 'mayor_mejor' },
  { id: 'coordinacion', nombre: 'Coordinacion',      color: '#d97706', unidad: 'repeticiones', minimo: 3,    maximo: 45,   paso: 1,   direccion: 'mayor_mejor' },
  { id: 'equilibrio',   nombre: 'Equilibrio',        color: '#7c3aed', unidad: 'segundos',     minimo: 3,    maximo: 45,   paso: 1,   direccion: 'mayor_mejor' },
];

/*
 * Rangos cognitivos calibrados para población general activa.
 * El límite superior de reacción (650 ms) cubre perfiles
 * con tiempos más altos que no son deportistas de elite.
 * Los porcentajes de decisión, atención y anticipación
 * parten desde 20% para no excluir perfiles bajos válidos.
 *
 * Mismas salvedades metodologicas que VARS_FISICAS arriba: son
 * calibracion interna del proyecto, no una norma clinica publicada.
 * Tambien son la fuente unica de verdad (espejadas en el backend).
 */
export const VARS_COGNITIVAS = [
  { id: 'reaccion',     nombre: 'Velocidad de reaccion', color: '#0f766e', unidad: 'ms', minimo: 150, maximo: 650, paso: 1, direccion: 'menor_mejor' },
  { id: 'decision',     nombre: 'Toma de decisiones',    color: '#1d4ed8', unidad: '%',  minimo: 20,  maximo: 100, paso: 1, direccion: 'mayor_mejor' },
  { id: 'atencion',     nombre: 'Atencion',              color: '#b45309', unidad: '%',  minimo: 20,  maximo: 100, paso: 1, direccion: 'mayor_mejor' },
  { id: 'anticipacion', nombre: 'Anticipacion',          color: '#7e22ce', unidad: '%',  minimo: 20,  maximo: 100, paso: 1, direccion: 'mayor_mejor' },
];

/* ── Ajuste cognitivo por variable fisica ── */
export const AJUSTE_COGNITIVO_POR_VARIABLE = {
  fuerza:       { reaccion: 0,    decision: 0,    atencion: 0,    anticipacion: 0    },
  fuerzaExp:    { reaccion: 0.06, decision: 0,    atencion: 0,    anticipacion: 0.04 },
  resistencia:  { reaccion: 0,    decision: 0,    atencion: 0.10, anticipacion: 0    },
  velocidad:    { reaccion: 0.12, decision: 0,    atencion: 0,    anticipacion: 0.08 },
  agilidad:     { reaccion: 0.10, decision: 0.08, atencion: 0,    anticipacion: 0.07 },
  flexibilidad: { reaccion: 0,    decision: 0,    atencion: 0,    anticipacion: 0    },
  coordinacion: { reaccion: 0.08, decision: 0.10, atencion: 0.08, anticipacion: 0.08 },
  equilibrio:   { reaccion: 0,    decision: 0.06, atencion: 0.08, anticipacion: 0    },
};

/* ── Reglas de ajuste corporal ── */
export const REGLAS_AJUSTE_CORPORAL = [
  { variable: 'velocidad',    condicion: c => c.grasa > 25,                         delta: -10, descripcion: 'Grasa corporal > 25%: reduce velocidad de desplazamiento.'         },
  { variable: 'agilidad',     condicion: c => c.grasa > 25,                         delta:  -8, descripcion: 'Grasa corporal > 25%: reduce agilidad y cambio de direccion.'       },
  { variable: 'resistencia',  condicion: c => c.grasa > 30,                         delta:  -7, descripcion: 'Grasa corporal > 30%: penaliza la resistencia aerobica.'            },
  { variable: 'velocidad',    condicion: c => c.grasa >= 18 && c.grasa <= 25,       delta:  -4, descripcion: 'Grasa corporal moderada (18-25%): leve reduccion de velocidad.'     },
  { variable: 'fuerza',       condicion: c => c.muscular > 45,                      delta:  10, descripcion: 'Masa muscular > 45%: incrementa la fuerza maxima.'                  },
  { variable: 'fuerzaExp',    condicion: c => c.muscular > 45,                      delta:  10, descripcion: 'Masa muscular > 45%: incrementa la fuerza explosiva.'               },
  { variable: 'fuerza',       condicion: c => c.muscular >= 38 && c.muscular <= 45, delta:   5, descripcion: 'Masa muscular moderada-alta (38-45%): aumento moderado de fuerza.'  },
  { variable: 'fuerzaExp',    condicion: c => c.muscular >= 38 && c.muscular <= 45, delta:   5, descripcion: 'Masa muscular moderada-alta: aumento moderado de fuerza explosiva.'  },
  { variable: 'flexibilidad', condicion: c => c.muscular > 50,                      delta:  -5, descripcion: 'Masa muscular > 50%: puede reducir la flexibilidad articular.'       },
  { variable: 'resistencia',  condicion: c => c.grasaVisc >= 10,                   delta:  -8, descripcion: 'Grasa visceral nivel >= 10: penaliza la resistencia aerobica.'       },
  { variable: 'velocidad',    condicion: c => c.grasaVisc >= 10,                   delta:  -5, descripcion: 'Grasa visceral nivel >= 10: penaliza la velocidad.'                  },
  { variable: 'equilibrio',   condicion: c => c.imc > 30,                          delta:  -6, descripcion: 'IMC > 30: puede afectar el equilibrio y control postural.'           },
];

/*
 * Perfiles funcionales generales.
 * Cada perfil describe una tendencia del evaluado,
 * no un baremo deportivo ni una clasificación definitiva.
 * El resultado orienta el perfil; no determina un deporte exacto.
 */
export const PERFILES_DEPORTIVOS = [
  {
    id: 'resistencia', nombre: 'Resistencia', color: '#0f9d66', descripcion: 'Tendencia hacia actividades aerobicas sostenidas. El perfil muestra capacidad para mantener esfuerzo durante periodos prolongados.',
    pesos: { resistencia: 0.40, atencion: 0.20, grasaInv: 0.20, equilibrio: 0.20 },
  },
  {
    id: 'potencia', nombre: 'Potencia', color: '#6d28d9', descripcion: 'Tendencia hacia acciones de alta intensidad y corta duracion. El perfil refleja capacidad de generar fuerza maxima o explosiva.',
    pesos: { fuerza: 0.40, fuerzaExp: 0.40, muscularNorm: 0.20 },
  },
  {
    id: 'velocidad', nombre: 'Velocidad', color: '#0284c7', descripcion: 'Tendencia hacia la rapidez de respuesta y desplazamiento. El perfil indica agilidad reactiva y capacidad de cambio de ritmo.',
    pesos: { velocidad: 0.40, reaccion: 0.30, agilidad: 0.30 },
  },
  {
    id: 'coordinativo', nombre: 'Coordinacion', color: '#d97706', descripcion: 'Tendencia hacia el control motor y la precision. El perfil muestra capacidad de coordinacion, equilibrio y toma de decisiones motrices.',
    pesos: { coordinacion: 0.40, equilibrio: 0.30, decision: 0.30 },
  },
];

/*
 * Orientaciones de actividad física.
 * No son baremos deportivos rígidos ni clasificaciones definitivas.
 * Describen familias de actividades con tendencias de perfil similares.
 * La afinidad calculada indica tendencia, no aptitud ni selección.
 */
export const DEPORTES = [
  { nombre: 'Actividades aerobicas',     color: '#0f9d66', descripcion: 'Actividades de intensidad moderada y larga duracion (caminata rapida, aerobicos, eliptico) que priorizan la resistencia cardiovascular sostenida.', perfilIdeal: { resistencia: 85, potencia: 40, velocidad: 55, coordinativo: 50 } },
  { nombre: 'Deportes de equipo',        color: '#16a34a', descripcion: 'Deportes colectivos con balon (futbol, baloncesto, balonmano) que exigen resistencia, velocidad y coordinacion en un contexto dinamico y cambiante.', perfilIdeal: { resistencia: 70, potencia: 60, velocidad: 70, coordinativo: 75 } },
  { nombre: 'Deportes de raqueta',       color: '#0891b2', descripcion: 'Tenis, badminton, padel y disciplinas similares que demandan coordinacion ojo-mano, velocidad de desplazamiento y toma de decisiones bajo presion.', perfilIdeal: { resistencia: 65, potencia: 60, velocidad: 70, coordinativo: 80 } },
  { nombre: 'Artes marciales',           color: '#b45309', descripcion: 'Disciplinas de combate que requieren explosividad, reflejos rapidos y capacidad de anticipar los movimientos del oponente.', perfilIdeal: { resistencia: 65, potencia: 75, velocidad: 75, coordinativo: 75 } },
  { nombre: 'Natacion y acuaticos',      color: '#0284c7', descripcion: 'Disciplinas acuaticas que requieren resistencia aerobica sostenida, coordinacion de movimientos y flexibilidad articular.', perfilIdeal: { resistencia: 85, potencia: 65, velocidad: 70, coordinativo: 60 } },
  { nombre: 'Atletismo velocidad',       color: '#ea580c', descripcion: 'Pruebas de velocidad y saltos que requieren maxima potencia explosiva y aceleracion en tiempo minimo.', perfilIdeal: { resistencia: 45, potencia: 80, velocidad: 90, coordinativo: 55 } },
  { nombre: 'Atletismo resistencia',     color: '#059669', descripcion: 'Pruebas de medio fondo y fondo que priorizan la resistencia aerobica por encima de cualquier otra capacidad.', perfilIdeal: { resistencia: 92, potencia: 40, velocidad: 55, coordinativo: 50 } },
  { nombre: 'Deportes de fuerza',        color: '#7c3aed', descripcion: 'Halterofilia, powerlifting y disciplinas de fuerza maxima, ideales para perfiles con alta capacidad de fuerza y potencia.', perfilIdeal: { resistencia: 40, potencia: 90, velocidad: 50, coordinativo: 55 } },
  { nombre: 'Gimnasia y acrobacias',     color: '#db2777', descripcion: 'Disciplinas que exigen coordinacion fina, equilibrio y flexibilidad excepcionales.', perfilIdeal: { resistencia: 55, potencia: 65, velocidad: 65, coordinativo: 90 } },
  { nombre: 'Ciclismo y triathlon',      color: '#d97706', descripcion: 'Disciplinas de resistencia combinada con potencia en los esfuerzos, adecuadas para perfiles con buena base aerobica y de fuerza.', perfilIdeal: { resistencia: 88, potencia: 72, velocidad: 65, coordinativo: 50 } },
  { nombre: 'Deportes de contacto',      color: '#991b1b', descripcion: 'Disciplinas de contacto fisico directo que exigen potencia, resistencia y velocidad de reaccion.', perfilIdeal: { resistencia: 72, potencia: 78, velocidad: 80, coordinativo: 70 } },
  { nombre: 'Deportes de precision',     color: '#1d4ed8', descripcion: 'Tiro deportivo, arqueria y disciplinas similares que dependen del control postural, la atencion sostenida y la anticipacion.', perfilIdeal: { resistencia: 40, potencia: 40, velocidad: 50, coordinativo: 88 } },
  { nombre: 'Danza y ritmo',             color: '#c026d3', descripcion: 'Actividades ritmicas que exigen coordinacion, flexibilidad y atencion sostenida para sincronizar el movimiento con el ritmo.', perfilIdeal: { resistencia: 65, potencia: 50, velocidad: 60, coordinativo: 88 } },
  { nombre: 'Deportes de montana',       color: '#65a30d', descripcion: 'Senderismo, escalada y actividades outdoor que combinan resistencia, fuerza funcional y coordinacion en terreno variable.', perfilIdeal: { resistencia: 80, potencia: 70, velocidad: 55, coordinativo: 75 } },
  { nombre: 'Fitness funcional',         color: '#475569', descripcion: 'Entrenamiento integrado de fuerza, movilidad, resistencia y coordinacion; una excelente base o complemento para cualquier perfil.', perfilIdeal: { resistencia: 68, potencia: 68, velocidad: 62, coordinativo: 68 } },
];

/* ════════════════════════════════════
   FUNCIONES PURAS DE CALCULO
════════════════════════════════════ */

export function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

export function normalizarValor(valor, minimo, maximo, direccion) {
  if (maximo === minimo) return 50;
  const n = direccion === 'mayor_mejor'
    ? (valor - minimo) / (maximo - minimo) * 100
    : (maximo - valor) / (maximo - minimo) * 100;
  return Math.round(clamp(n, 0, 100));
}

export function normalizarFormulario(vars, reales) {
  const resultado = {};
  vars.forEach(v => {
    const raw = reales[v.id];
    if (raw === null || raw === undefined || String(raw).trim() === '') return;
    resultado[v.id] = normalizarValor(parseFloat(raw), v.minimo, v.maximo, v.direccion);
  });
  return resultado;
}

export function calcularIMC(peso, talla) {
  if (!peso || !talla || talla <= 0) return { valor: null, categoria: '' };
  const tallaM = talla / 100;
  const imc = peso / (tallaM * tallaM);
  let categoria = '';
  if (imc < 18.5) categoria = 'Bajo peso';
  else if (imc < 25) categoria = 'Peso normal';
  else if (imc < 30) categoria = 'Sobrepeso';
  else if (imc < 35) categoria = 'Obesidad grado I';
  else if (imc < 40) categoria = 'Obesidad grado II';
  else categoria = 'Obesidad grado III';
  return { valor: parseFloat(imc.toFixed(1)), categoria };
}

export function calcularAjustesCorporales(corporales) {
  const deltas = Object.fromEntries(VARS_FISICAS.map(v => [v.id, 0]));
  REGLAS_AJUSTE_CORPORAL.forEach(regla => {
    try {
      if (regla.condicion(corporales)) deltas[regla.variable] = (deltas[regla.variable] || 0) + regla.delta;
    } catch (_) {}
  });
  return deltas;
}

export function calcularAjustesCognitivos(cognitivas) {
  const ajustes = {};
  VARS_FISICAS.forEach(vF => {
    const coef = AJUSTE_COGNITIVO_POR_VARIABLE[vF.id];
    ajustes[vF.id] =
      coef.reaccion     * (cognitivas.reaccion     - 50) +
      coef.decision     * (cognitivas.decision     - 50) +
      coef.atencion     * (cognitivas.atencion     - 50) +
      coef.anticipacion * (cognitivas.anticipacion - 50);
  });
  return ajustes;
}

export function calcularConsolidado(fisicas, cognitivas, corporales) {
  const ajCorp = calcularAjustesCorporales(corporales);
  const ajCog  = calcularAjustesCognitivos(cognitivas);
  const resultado = {};
  VARS_FISICAS.forEach(v => {
    const base     = fisicas[v.id] || 0;
    const deltaCog = ajCog[v.id]   || 0;
    const deltaCorp= ajCorp[v.id]  || 0;
    resultado[v.id] = {
      base,
      ajCog:  Math.round(deltaCog  * 10) / 10,
      ajCorp: deltaCorp,
      total:  Math.round(clamp(base + deltaCog + deltaCorp, 0, 100)),
    };
  });
  return resultado;
}

export function calcularPerfilesDeportivos(consolidado, cognitivas, corporales) {
  const tot = id => consolidado[id]?.total ?? 0;
  const cog = id => cognitivas[id] ?? 0;
  const grasa    = parseFloat(corporales.grasa)    || 0;
  const muscular = parseFloat(corporales.muscular) || 0;
  const grasaInv     = Math.round(clamp((1 - grasa / 40) * 100, 0, 100));
  const muscularNorm = Math.round(clamp((muscular - 20) / 40 * 100, 0, 100));
  const fuentes = {
    fuerza: tot('fuerza'), fuerzaExp: tot('fuerzaExp'), resistencia: tot('resistencia'),
    velocidad: tot('velocidad'), agilidad: tot('agilidad'), flexibilidad: tot('flexibilidad'),
    coordinacion: tot('coordinacion'), equilibrio: tot('equilibrio'),
    reaccion: cog('reaccion'), decision: cog('decision'),
    atencion: cog('atencion'), anticipacion: cog('anticipacion'),
    grasaInv, muscularNorm,
  };
  const resultado = {};
  PERFILES_DEPORTIVOS.forEach(perfil => {
    let suma = 0, totalPeso = 0;
    Object.entries(perfil.pesos).forEach(([f, peso]) => {
      if (fuentes[f] !== undefined) { suma += fuentes[f] * peso; totalPeso += peso; }
    });
    resultado[perfil.id] = totalPeso > 0 ? Math.round(clamp(suma / totalPeso, 0, 100)) : 0;
  });
  return resultado;
}

export function calcularRankingDeportes(perfilesUsuario) {
  return DEPORTES
    .map(deporte => {
      const dims = Object.keys(deporte.perfilIdeal);
      const diffs = dims.map(d => Math.abs((perfilesUsuario[d] ?? 0) - deporte.perfilIdeal[d]));
      const afinidad = Math.round(clamp(100 - diffs.reduce((a,b) => a+b,0)/dims.length, 0, 100));
      const brechas = {};
      dims.forEach((d, i) => { brechas[d] = { usuario: perfilesUsuario[d]??0, ideal: deporte.perfilIdeal[d], diff: diffs[i] }; });
      return { ...deporte, afinidad, brechas };
    })
    .sort((a, b) => b.afinidad - a.afinidad);
}

/*
 * calcularFortalezasDeporte — a partir de las brechas ya calculadas
 * por calcularRankingDeportes, deriva las etiquetas de "puntos fuertes"
 * de un deporte para el perfil del usuario evaluado (perfil funcional
 * con puntaje >= umbral). Es la MISMA fuente de datos que alimenta el
 * ranking — no aplica reglas ni umbrales independientes por deporte.
 */
export function calcularFortalezasDeporte(brechas, umbral = 60) {
  return Object.entries(brechas)
    .filter(([, v]) => v.usuario >= umbral)
    .sort((a, b) => b[1].usuario - a[1].usuario)
    .map(([dim, v]) => {
      const nombre = PERFILES_DEPORTIVOS.find(p => p.id === dim)?.nombre ?? dim;
      return `${nombre} (${v.usuario}%)`;
    });
}

/*
 * generarInterpretacion — orientación de perfil general.
 *
 * Genera texto descriptivo del perfil funcional del evaluado.
 * NO determina un deporte ni clasifica por baremos rígidos.
 * Describe tendencias y áreas de oportunidad en lenguaje
 * accesible para cualquier evaluador o persona activa.
 */
export function generarInterpretacion(consolidado, perfilesDeportivos, cognitivas, rankingDeportes) {
  // ── Ordenar variables físicas por puntaje final ──
  const totalesFisicas = VARS_FISICAS
    .map(v => ({ id: v.id, nombre: v.nombre, total: consolidado[v.id]?.total ?? 0 }))
    .sort((a, b) => b.total - a.total);

  const fortalezasFis  = totalesFisicas.slice(0, 3).filter(v => v.total >= 60);
  const debilidadesFis = [...totalesFisicas].reverse().slice(0, 3).filter(v => v.total < 50);

  // ── Perfil dominante ──
  const entradasPerfiles = Object.entries(perfilesDeportivos)
    .map(([id, val]) => ({ id, val, nombre: PERFILES_DEPORTIVOS.find(p => p.id === id)?.nombre ?? id }))
    .sort((a, b) => b.val - a.val);

  const perfilDominante  = entradasPerfiles[0];
  const perfilSecundario = entradasPerfiles[1];
  // Diferencia entre el primero y el segundo para detectar perfil mixto
  const diferenciaPerfiles = (perfilDominante?.val ?? 0) - (perfilSecundario?.val ?? 0);
  const esMixto = diferenciaPerfiles < 10;

  // ── Cognitivas destacadas ──
  const cogOrdenadas = VARS_COGNITIVAS
    .map(v => ({ nombre: v.nombre, val: cognitivas[v.id] ?? 0 }))
    .sort((a, b) => b.val - a.val);
  const cogAlta = cogOrdenadas[0];
  const cogBaja = cogOrdenadas[cogOrdenadas.length - 1];

  // ── Párrafo de interpretación ──
  let parrafo = '';

  if (esMixto || !perfilDominante || perfilDominante.val < 45) {
    parrafo += 'El evaluado muestra un perfil funcional mixto y equilibrado, sin una tendencia marcada hacia una sola dimension. ';
  } else if (perfilDominante.val >= 70) {
    parrafo += `El evaluado presenta una tendencia marcada hacia el perfil de ${perfilDominante.nombre.toLowerCase()}`;
    if (perfilSecundario && perfilSecundario.val >= 55)
      parrafo += `, con capacidades complementarias en ${perfilSecundario.nombre.toLowerCase()}`;
    parrafo += '. ';
  } else {
    parrafo += `El evaluado muestra una tendencia moderada hacia el perfil de ${perfilDominante.nombre.toLowerCase()}`;
    if (perfilSecundario && perfilSecundario.val >= 50)
      parrafo += ` con influencia de ${perfilSecundario.nombre.toLowerCase()}`;
    parrafo += '. ';
  }

  if (fortalezasFis.length > 0) {
    parrafo += `Las capacidades funcionales con mejor desempeño son ${fortalezasFis.map(f => f.nombre.toLowerCase()).join(', ')}. `;
  }

  if (debilidadesFis.length > 0) {
    parrafo += `Las areas con mayor margen de desarrollo son ${debilidadesFis.map(d => d.nombre.toLowerCase()).join(' y ')}. `;
  }

  if (cogAlta && cogAlta.val >= 60) {
    parrafo += `En el plano cognitivo-motor destaca en ${cogAlta.nombre.toLowerCase()} (${cogAlta.val}%). `;
  }

  // ── Orientación de actividades (no ranking rígido) ──
  const top3 = rankingDeportes.slice(0, 3);
  const recomendacion = top3.length > 0
    ? `Segun la tendencia del perfil, las familias de actividad con mayor afinidad son: ${
        top3.map(d => `${d.nombre} (${d.afinidad}%)`).join(', ')
      }. Esta orientacion es una tendencia de perfil, no una determinacion absoluta.`
    : '';

  // ── Listas de fortalezas / áreas de mejora ──
  const fortalezas = [
    ...fortalezasFis.map(f => `${f.nombre} — ${f.total}%`),
    ...(cogAlta && cogAlta.val >= 65 ? [`${cogAlta.nombre} — ${cogAlta.val}% (cognitivo-motor)`] : []),
  ];

  const debilidades = [
    ...debilidadesFis.map(d => `${d.nombre} — ${d.total}%`),
    ...(cogBaja && cogBaja.val < 45 ? [`${cogBaja.nombre} — ${cogBaja.val}% (cognitivo-motor)`] : []),
  ];

  return { parrafo: parrafo.trim(), fortalezas, debilidades, recomendacion };
}

/*
 * validarFormularioVariables
 *
 * Todos los campos son obligatorios (campo vacío = error que bloquea).
 * Valores fuera del rango de referencia generan una ADVERTENCIA, no un bloqueo:
 * el sistema los acepta, normaliza con clamp y marca la fila visualmente.
 *
 * @returns {{ ok: boolean, errores: string[], advertencias: string[] }}
 */
export function validarFormularioVariables(vars, reales) {
  const errores      = [];
  const advertencias = [];

  vars.forEach(v => {
    const raw = reales[v.id];

    // Campo vacío → bloqueo
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      errores.push(`${v.nombre}: campo obligatorio.`);
      return;
    }

    const n = parseFloat(raw);

    // No numérico, NaN o Infinito → bloqueo (nunca confiar solo en
    // que el control de UI —slider o input— haya prevenido esto).
    if (!Number.isFinite(n)) {
      errores.push(`${v.nombre}: debe ser un numero valido.`);
      return;
    }

    // Fuera de rango → advertencia, no bloqueo (el clamp lo maneja)
    if (n < v.minimo || n > v.maximo) {
      advertencias.push(
        `${v.nombre}: ${n} ${v.unidad} esta fuera del rango de referencia (${v.minimo}–${v.maximo} ${v.unidad}). Se normalizara como 0% o 100%.`
      );
    }
  });

  return { ok: errores.length === 0, errores, advertencias };
}

export function estadoAnalisisInicial() {
  return {
    participante: { nombre: '', edad: '', genero: '', perfil: '', deporte: '' },
    realesF:    Object.fromEntries(VARS_FISICAS.map(v    => [v.id, ''])),
    realesC:    Object.fromEntries(VARS_COGNITIVAS.map(v => [v.id, ''])),
    fisicas:    Object.fromEntries(VARS_FISICAS.map(v    => [v.id, 0])),
    cognitivas: Object.fromEntries(VARS_COGNITIVAS.map(v => [v.id, 0])),
    corporales: { peso: '', talla: '', grasa: '', muscular: '', grasaVisc: '', imc: null },
  };
}
