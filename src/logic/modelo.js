/* ═══════════════════════════════════════════════════════════════
   PhysicalPicking · logic/modelo.js  v6.0
   Motor científico puro — sin React, sin DOM.
   v5: sin dermatoglifia · perfiles deportivos · ranking · interpretacion
   v6: sin modulo cognitivo · "corporales" pasa a "antropometricas"

   NOTA DE ARQUITECTURA (v6): el calculo de esta seccion (consolidado,
   perfiles, ranking de DEPORTES e interpretacion) es el calculo
   PROVISIONAL HEREDADO del prototipo. Se conserva para no romper las
   pantallas actuales. El flujo definitivo (validacion → evaluacion →
   normalizacion por baremos → perfil funcional → reglas de
   seguridad → DecisionEngine → ranking de las 13 familias) vive en
   src/evaluacion/ y reemplazara este calculo cuando se integren los
   baremos y el DecisionEngine.
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
  /* Fuerza máxima de prensión (AFISAL-INEFC, Tabla 8): SUMA del mejor
     intento de cada mano (a mayor suma mejor). La UI captura
     `fuerzaDer`/`fuerzaIzq` (0-100 c/u) y guarda aquí la suma 0-200;
     el baremo se aplica sobre esa suma. */
  { id: 'fuerza',       nombre: 'Fuerza prensil',   color: '#6d28d9', unidad: 'kg',           minimo: 20,   maximo: 200,  paso: 1,   direccion: 'mayor_mejor' },
  { id: 'fuerzaExp',    nombre: 'Fuerza explosiva', color: '#9333ea', unidad: 'cm',           minimo: 5,    maximo: 65,   paso: 1,   direccion: 'mayor_mejor' },
  /* Resistencia aeróbica (Léger, course navette 20 m): se registra el
     NIVEL MÁXIMO ALCANZADO según el protocolo de Léger: número entero
     de 1 a 21 (a mayor nivel mejor; sin decimales ni medios niveles). Solo se
     aplica si el PAR-Q+ la autoriza (prueba máxima); si no, queda sin
     dato y no penaliza en el flujo definitivo. Reemplaza a la antigua
     variable de resistencia en metros (Cooper), retirada. */
  { id: 'resistencia',  nombre: 'Resistencia aeróbica', color: '#0f9d66', unidad: 'nivel',    minimo: 1,    maximo: 21,   paso: 1,   direccion: 'mayor_mejor' },
  { id: 'flexibilidad', nombre: 'Flexibilidad',      color: '#db2777', unidad: 'cm',           minimo: -20,  maximo: 30,   paso: 1,   direccion: 'mayor_mejor' },
  /* Equilibrio monopodal sin visión (AFISAL-INEFC, Tabla 9):
     2 intentos, uno por pierna; se cuenta cada vez que se baja el pie
     y el resultado es la SUMA de ambas piernas (a menos intentos mejor).
     La UI captura `equilibrioDer`/`equilibrioIzq` (0-30 c/u) y guarda
     aquí el total 0-60; el baremo se aplica sobre ese total. */
  { id: 'equilibrio',   nombre: 'Equilibrio',        color: '#7c3aed', unidad: 'intentos',     minimo: 0,    maximo: 60,   paso: 1,   direccion: 'menor_mejor' },
];

/*
 * Rangos de COHERENCIA fisica de las variables antropometricas
 * (antes "corporales"). No son baremos ni puntos de corte: solo
 * rechazan valores absurdos. Fuente unica para StepAntropometricas y
 * src/evaluacion; el backend (utils/validacion.js) mantiene copia espejo.
 */
export const RANGOS_ANTROPOMETRICOS = {
  peso:      { etiqueta: 'Peso (kg)',              min: 1,  max: 400 },
  talla:     { etiqueta: 'Talla (cm)',             min: 30, max: 250 },
  cintura:   { etiqueta: 'Cintura (cm)',           min: 40, max: 250 },
  cadera:    { etiqueta: 'Cadera (cm)',            min: 40, max: 250 },
  grasaVisc: { etiqueta: 'Grasa visceral (nivel)', min: 0,  max: 60  },
};

/* ── Reglas de ajuste antropometrico (calculo provisional heredado) ──
   Solo variables vigentes: % grasa, % masa muscular, velocidad,
   agilidad y coordinacion fueron retirados con sus reglas. */
export const REGLAS_AJUSTE_ANTROPOMETRICO = [
  { variable: 'resistencia',  condicion: c => c.grasaVisc >= 10,                   delta:  -8, descripcion: 'Grasa visceral nivel >= 10: penaliza la resistencia aerobica.'       },
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
    id: 'resistencia', nombre: 'Resistencia aeróbica', color: '#0f9d66', descripcion: 'Tendencia hacia actividades aerobicas sostenidas. El perfil muestra capacidad para mantener esfuerzo durante periodos prolongados.',
    pesos: { resistencia: 0.40, equilibrio: 0.20 },
  },
  {
    id: 'potencia', nombre: 'Potencia', color: '#6d28d9', descripcion: 'Tendencia hacia acciones de alta intensidad y corta duracion. El perfil refleja capacidad de generar fuerza prensil o explosiva.',
    pesos: { fuerza: 0.40, fuerzaExp: 0.40 },
  },
];

/*
 * Orientaciones de actividad física.
 * No son baremos deportivos rígidos ni clasificaciones definitivas.
 * Describen familias de actividades con tendencias de perfil similares.
 * La afinidad calculada indica tendencia, no aptitud ni selección.
 * NOTA: los ideales conservan dimensiones de perfiles retirados
 * (velocidad, coordinativo); el ranking solo usa las dimensiones
 * calculables (ver filtro en calcularRankingDeportes).
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
  if (!peso || !talla || talla <= 0) return { valor: null, categoria: '', nivel: null };
  const tallaM = talla / 100;
  const imc = peso / (tallaM * tallaM);
  let categoria = '';
  let nivel = null;
  // Baremos OMS sin distincion de sexo.
  if (imc < 18.5) { categoria = 'Bajo peso'; nivel = 'Bajo'; }
  else if (imc < 25) { categoria = 'Rango normal'; nivel = 'Promedio'; }
  else if (imc < 30) { categoria = 'Pre obesidad'; nivel = 'Aumentado'; }
  else if (imc < 35) { categoria = 'Obesidad clase I'; nivel = 'Moderado'; }
  else if (imc < 40) { categoria = 'Obesidad clase II'; nivel = 'Severo'; }
  else { categoria = 'Obesidad clase III'; nivel = 'Muy severo'; }
  return { valor: parseFloat(imc.toFixed(1)), categoria, nivel };
}

/*
 * calcularICC — índice cintura-cadera (cintura / cadera).
 * Cortes WHO 2008 (icc.pdf, Tabla A1): ≥0,90 hombres y ≥0,85 mujeres
 * = riesgo sustancialmente aumentado. Sin genero masculino/femenino
 * se informa el valor sin categoria.
 */
export function calcularICC(cintura, cadera) {
  const ci = parseFloat(cintura);
  const ca = parseFloat(cadera);
  if (!Number.isFinite(ci) || !Number.isFinite(ca) || ca <= 0) return { valor: null };
  return { valor: Math.round((ci / ca) * 100) / 100 };
}

export function clasificarICC(icc, genero) {
  if (!Number.isFinite(icc)) return '';
  if (genero === 'masculino') return icc >= 0.90 ? 'Riesgo sustancialmente aumentado' : 'Sin riesgo aumentado';
  if (genero === 'femenino') return icc >= 0.85 ? 'Riesgo sustancialmente aumentado' : 'Sin riesgo aumentado';
  return '';
}

/*
 * Las reglas comparan contra numeros (c.grasaVisc >= 10). Los campos del
 * formulario llegan como texto, por eso se convierten aqui; un campo
 * vacio queda en null y no activa ninguna regla.
 */
export function prepararAntropometricas(antropometricas) {
  const a = antropometricas ?? {};
  const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
  return { grasaVisc: num(a.grasaVisc), imc: num(a.imc) };
}

export function calcularAjustesAntropometricos(antropometricas) {
  const deltas = Object.fromEntries(VARS_FISICAS.map(v => [v.id, 0]));
  REGLAS_AJUSTE_ANTROPOMETRICO.forEach(regla => {
    try {
      if (regla.condicion(antropometricas)) deltas[regla.variable] = (deltas[regla.variable] || 0) + regla.delta;
    } catch (_) {}
  });
  return deltas;
}

export function calcularConsolidado(fisicas, antropometricas) {
  const ajAntrop = calcularAjustesAntropometricos(prepararAntropometricas(antropometricas));
  const resultado = {};
  VARS_FISICAS.forEach(v => {
    const base        = fisicas[v.id] || 0;
    const deltaAntrop = ajAntrop[v.id] || 0;
    resultado[v.id] = {
      base,
      ajAntrop: deltaAntrop,
      total:    Math.round(clamp(base + deltaAntrop, 0, 100)),
    };
  });
  return resultado;
}

export function calcularPerfilesDeportivos(consolidado, antropometricas) {
  const tot = id => consolidado[id]?.total ?? 0;
  const fuentes = {
    fuerza: tot('fuerza'), fuerzaExp: tot('fuerzaExp'), resistencia: tot('resistencia'),
    flexibilidad: tot('flexibilidad'), equilibrio: tot('equilibrio'),
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
      // Solo dimensiones calculables (velocidad/coordinativo retirados).
      const dims = Object.keys(deporte.perfilIdeal).filter(d => d in perfilesUsuario);
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
export function generarInterpretacion(consolidado, perfilesDeportivos, rankingDeportes) {
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

  // ── Orientación de actividades (no ranking rígido) ──
  const top3 = rankingDeportes.slice(0, 3);
  const recomendacion = top3.length > 0
    ? `Segun la tendencia del perfil, las familias de actividad con mayor afinidad son: ${
        top3.map(d => `${d.nombre} (${d.afinidad}%)`).join(', ')
      }. Esta orientacion es una tendencia de perfil, no una determinacion absoluta.`
    : '';

  // ── Listas de fortalezas / áreas de mejora ──
  const fortalezas  = fortalezasFis.map(f => `${f.nombre} — ${f.total}%`);
  const debilidades = debilidadesFis.map(d => `${d.nombre} — ${d.total}%`);

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

export const EQUILIBRIO_POR_PIERNA_MAX = 30;
export const FUERZA_POR_MANO_MAX = 100;

/*
 * esNivelLegerValido — se registra el nivel máximo alcanzado del
 * Course Navette: número entero entre 1 y 21.
 */
export function esNivelLegerValido(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= 21 &&
    Number.isInteger(n);
}

export function estadoAnalisisInicial() {
  return {
    participante: { nombre: '', edad: '', genero: '', perfil: '', deporte: '' },
    parq:     { respuestas: {}, detalles: {} },
    complementarias: { respuestas: {} },
    breq:     { respuestas: {} },
    barreras: { respuestas: {} },
    ipaq:     { respuestas: {} },
    psqi:     { respuestas: {} },
    leger:    { palier: '' },
    realesF:  Object.fromEntries(VARS_FISICAS.map(v => [v.id, ''])),
    fisicas:  Object.fromEntries(VARS_FISICAS.map(v => [v.id, 0])),
    antropometricas: { peso: '', talla: '', cintura: '', cadera: '', grasaVisc: '', imc: null, icc: null },
    // Respuestas de cuestionarios por modulo (ver src/evaluacion).
    // Vacio hasta que exista su captura en la UI o la importacion.
    cuestionarios: { parq: {}, complementarias: {}, ipaq: {}, psqi: {}, breq3: {}, bbaq21: {} },
  };
}
