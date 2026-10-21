/**
 * @module logic/modelo
 * @description Motor científico puro (v6): variables físicas, normalización, antropometría, perfiles funcionales, ranking de actividades e interpretación.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el cálculo provisional heredado del prototipo, sin React ni DOM.
 *  - O (Abierto/Cerrado): variables, reglas de ajuste, perfiles y actividades son catálogos de datos; se amplían sin modificar las funciones de cálculo.
 * Notas: v5 eliminó la dermatoglifia e incorporó perfiles, ranking e interpretación; v6 eliminó el módulo cognitivo y renombró "corporales" a "antropometricas".
 * Este cálculo (consolidado, perfiles, ranking de actividades e interpretación) es PROVISIONAL y heredado; se conserva para no romper las pantallas actuales.
 * El flujo definitivo (validación, evaluación, normalización por baremos, perfil funcional, reglas de seguridad, DecisionEngine y ranking de 13 familias)
 * reside en src/evaluacion/ y lo reemplazará al integrarse los baremos.
 */

/*
 * Variables físicas y rangos de referencia, calibrados para población general físicamente activa
 * (no son baremos de alto rendimiento).
 * Transparencia metodológica: es una calibración interna del proyecto, no una tabla de normas publicada
 * ni los baremos oficiales de un protocolo (Cooper, 1RM, Course Navette, etc.). Para uso clínico, de
 * investigación o de selección deportiva formal deben sustituirse por normas validadas.
 * `paso` define la precisión del control de captura; es una decisión de interfaz, no un criterio científico.
 * Fuente única de verdad de rango y paso. El backend (src/utils/validacion.js) mantiene una copia espejo
 * (son despliegues separados sin build compartido): todo cambio aquí debe replicarse allá.
 */
export const VARS_FISICAS = [
  /* Fuerza de prensión (AFISAL-INEFC, Tabla 8): suma del mejor intento de cada mano. La UI captura
     `fuerzaDer`/`fuerzaIzq` (0-100 c/u) y aquí se guarda la suma (0-200), sobre la que se aplica el baremo. */
  { id: 'fuerza',       nombre: 'Fuerza prensil',   color: '#6d28d9', unidad: 'kg',           minimo: 20,   maximo: 200,  paso: 1,   direccion: 'mayor_mejor' },
  { id: 'fuerzaExp',    nombre: 'Fuerza explosiva', color: '#9333ea', unidad: 'cm',           minimo: 5,    maximo: 65,   paso: 1,   direccion: 'mayor_mejor' },
  /* Resistencia aeróbica (Léger, course navette 20 m): nivel máximo alcanzado, entero de 1 a 21. Solo se
     aplica si el PAR-Q+ autoriza la prueba máxima; de lo contrario queda sin dato y no penaliza en el flujo
     definitivo. Sustituye a la antigua variable en metros (Cooper). */
  { id: 'resistencia',  nombre: 'Resistencia aeróbica', color: '#0f9d66', unidad: 'nivel',    minimo: 1,    maximo: 21,   paso: 1,   direccion: 'mayor_mejor' },
  { id: 'flexibilidad', nombre: 'Flexibilidad',      color: '#db2777', unidad: 'cm',           minimo: -20,  maximo: 30,   paso: 1,   direccion: 'mayor_mejor' },
  /* Equilibrio monopodal sin visión (AFISAL-INEFC, Tabla 9): un intento por pierna, contando cada vez que
     se apoya el pie; el resultado es la suma de ambas (menos es mejor). La UI captura `equilibrioDer`/
     `equilibrioIzq` (0-30 c/u) y aquí se guarda el total (0-60), sobre el que se aplica el baremo. */
  { id: 'equilibrio',   nombre: 'Equilibrio',        color: '#7c3aed', unidad: 'intentos',     minimo: 0,    maximo: 60,   paso: 1,   direccion: 'menor_mejor' },
];

/*
 * Rangos de coherencia física de las variables antropométricas (antes "corporales"): no son baremos
 * ni puntos de corte, solo rechazan valores absurdos. Fuente única para StepAntropometricas y
 * src/evaluacion; el backend (utils/validacion.js) mantiene una copia espejo.
 */
export const RANGOS_ANTROPOMETRICOS = {
  peso:      { etiqueta: 'Peso (kg)',              min: 1,  max: 400 },
  talla:     { etiqueta: 'Talla (cm)',             min: 30, max: 250 },
  cintura:   { etiqueta: 'Cintura (cm)',           min: 40, max: 250 },
  cadera:    { etiqueta: 'Cadera (cm)',            min: 40, max: 250 },
  grasaVisc: { etiqueta: 'Grasa visceral (nivel)', min: 0,  max: 60  },
};

/* Reglas de ajuste antropométrico (cálculo provisional heredado). Solo variables vigentes: % grasa, % masa muscular,
   velocidad, agilidad y coordinación se retiraron junto con sus reglas. */
export const REGLAS_AJUSTE_ANTROPOMETRICO = [
  { variable: 'resistencia',  condicion: c => c.grasaVisc >= 10,                   delta:  -8, descripcion: 'Grasa visceral nivel >= 10: penaliza la resistencia aerobica.'       },
  { variable: 'equilibrio',   condicion: c => c.imc > 30,                          delta:  -6, descripcion: 'IMC > 30: puede afectar el equilibrio y control postural.'           },
];

/* Perfiles funcionales generales: describen una tendencia del evaluado, no un baremo deportivo ni una clasificación definitiva. */
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
 * Orientaciones de actividad física: familias de actividades con tendencias de perfil similares.
 * La afinidad indica tendencia, no aptitud ni selección. Los perfiles ideales conservan dimensiones
 * de perfiles retirados (velocidad, coordinativo); el ranking solo usa las calculables.
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

/** Limita un valor al intervalo [min, max].
 * @param {number} val - valor a acotar.
 * @param {number} min - cota inferior.
 * @param {number} max - cota superior.
 * @returns {number} valor acotado. */
export function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

/** Normaliza un valor a 0-100 según su rango y dirección (mayor_mejor o menor_mejor).
 * @param {number} valor - valor medido.
 * @param {number} minimo - mínimo del rango de referencia.
 * @param {number} maximo - máximo del rango de referencia.
 * @param {'mayor_mejor'|'menor_mejor'} direccion - sentido en que el valor mejora.
 * @returns {number} puntaje entero 0-100 (50 si el rango es degenerado). */
export function normalizarValor(valor, minimo, maximo, direccion) {
  if (maximo === minimo) return 50;
  const n = direccion === 'mayor_mejor'
    ? (valor - minimo) / (maximo - minimo) * 100
    : (maximo - valor) / (maximo - minimo) * 100;
  return Math.round(clamp(n, 0, 100));
}

/** Normaliza los valores capturados de un conjunto de variables, omitiendo los vacíos.
 * @param {Array<Object>} vars - definiciones de variables (id, minimo, maximo, direccion).
 * @param {Object} reales - valores capturados por id.
 * @returns {Object<string, number>} puntajes 0-100 por id. */
export function normalizarFormulario(vars, reales) {
  const resultado = {};
  vars.forEach(v => {
    const raw = reales[v.id];
    if (raw === null || raw === undefined || String(raw).trim() === '') return;
    resultado[v.id] = normalizarValor(parseFloat(raw), v.minimo, v.maximo, v.direccion);
  });
  return resultado;
}

/** Calcula el índice de masa corporal y su clasificación OMS.
 * @param {number} peso - peso en kg.
 * @param {number} talla - talla en cm.
 * @returns {{valor: number|null, categoria: string, nivel: string|null}} IMC con una cifra decimal y su categoría. */
export function calcularIMC(peso, talla) {
  if (!peso || !talla || talla <= 0) return { valor: null, categoria: '', nivel: null };
  const tallaM = talla / 100;
  const imc = peso / (tallaM * tallaM);
  let categoria = '';
  let nivel = null;
  // Baremos OMS, sin distinción de sexo.
  if (imc < 18.5) { categoria = 'Bajo peso'; nivel = 'Bajo'; }
  else if (imc < 25) { categoria = 'Rango normal'; nivel = 'Promedio'; }
  else if (imc < 30) { categoria = 'Pre obesidad'; nivel = 'Aumentado'; }
  else if (imc < 35) { categoria = 'Obesidad clase I'; nivel = 'Moderado'; }
  else if (imc < 40) { categoria = 'Obesidad clase II'; nivel = 'Severo'; }
  else { categoria = 'Obesidad clase III'; nivel = 'Muy severo'; }
  return { valor: parseFloat(imc.toFixed(1)), categoria, nivel };
}

/** Calcula el índice cintura-cadera (cintura / cadera) con dos decimales.
 * @param {number|string} cintura - perímetro de cintura.
 * @param {number|string} cadera - perímetro de cadera.
 * @returns {{valor: number|null}} índice, o null si los datos no son válidos. */
export function calcularICC(cintura, cadera) {
  const ci = parseFloat(cintura);
  const ca = parseFloat(cadera);
  if (!Number.isFinite(ci) || !Number.isFinite(ca) || ca <= 0) return { valor: null };
  return { valor: Math.round((ci / ca) * 100) / 100 };
}

/** Clasifica el riesgo según el ICC y el género (cortes WHO 2008: 0,90 hombres y 0,85 mujeres).
 * @param {number} icc - índice cintura-cadera.
 * @param {'masculino'|'femenino'|string} genero - género del evaluado.
 * @returns {string} categoría de riesgo, o cadena vacía si no es posible clasificar. */
export function clasificarICC(icc, genero) {
  if (!Number.isFinite(icc)) return '';
  if (genero === 'masculino') return icc >= 0.90 ? 'Riesgo sustancialmente aumentado' : 'Sin riesgo aumentado';
  if (genero === 'femenino') return icc >= 0.85 ? 'Riesgo sustancialmente aumentado' : 'Sin riesgo aumentado';
  return '';
}

/* Las reglas comparan contra números y los campos del formulario llegan como texto; un campo vacío queda en null y no activa ninguna regla. */
/** Convierte a número los campos de texto que usan las reglas de ajuste.
 * @param {Object} antropometricas - datos antropométricos del formulario.
 * @returns {{grasaVisc: number|null, imc: number|null}} valores numéricos. */
export function prepararAntropometricas(antropometricas) {
  const a = antropometricas ?? {};
  const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
  return { grasaVisc: num(a.grasaVisc), imc: num(a.imc) };
}

/** Evalúa las reglas de ajuste antropométrico y acumula los deltas por variable física.
 * @param {{grasaVisc: number|null, imc: number|null}} antropometricas - valores numéricos.
 * @returns {Object<string, number>} delta por id de variable. */
export function calcularAjustesAntropometricos(antropometricas) {
  const deltas = Object.fromEntries(VARS_FISICAS.map(v => [v.id, 0]));
  REGLAS_AJUSTE_ANTROPOMETRICO.forEach(regla => {
    try {
      if (regla.condicion(antropometricas)) deltas[regla.variable] = (deltas[regla.variable] || 0) + regla.delta;
    } catch (_) {}
  });
  return deltas;
}

/** Consolida el puntaje base, el ajuste antropométrico y el total acotado a 0-100 por variable.
 * @param {Object<string, number>} fisicas - puntajes base por variable.
 * @param {Object} antropometricas - datos antropométricos del formulario.
 * @returns {Object<string, {base: number, ajAntrop: number, total: number}>} consolidado por variable. */
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

/** Calcula el puntaje de cada perfil funcional como promedio ponderado de los totales consolidados.
 * @param {Object} consolidado - consolidado por variable.
 * @param {Object} [antropometricas] - sin uso actual; se conserva por compatibilidad de firma.
 * @returns {Object<string, number>} puntaje 0-100 por perfil. */
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

/** Ordena las familias de actividad por afinidad frente al perfil del usuario.
 * @param {Object<string, number>} perfilesUsuario - puntaje por perfil.
 * @returns {Array<Object>} actividades con afinidad (0-100) y brechas, de mayor a menor afinidad. */
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

/* Usa la misma fuente de datos que el ranking: no aplica reglas ni umbrales independientes por deporte. */
/** Deriva las etiquetas de puntos fuertes a partir de las brechas del ranking.
 * @param {Object} brechas - brechas por dimensión, calculadas por calcularRankingDeportes.
 * @param {number} [umbral] - puntaje mínimo del perfil para considerarlo fortaleza.
 * @returns {string[]} etiquetas "Perfil (n%)" ordenadas de mayor a menor. */
export function calcularFortalezasDeporte(brechas, umbral = 60) {
  return Object.entries(brechas)
    .filter(([, v]) => v.usuario >= umbral)
    .sort((a, b) => b[1].usuario - a[1].usuario)
    .map(([dim, v]) => {
      const nombre = PERFILES_DEPORTIVOS.find(p => p.id === dim)?.nombre ?? dim;
      return `${nombre} (${v.usuario}%)`;
    });
}

/** Genera el texto descriptivo del perfil funcional, sus fortalezas, áreas de mejora y orientación de actividades.
 * Describe tendencias; no determina un deporte ni clasifica por baremos rígidos.
 * @param {Object} consolidado - consolidado por variable.
 * @param {Object<string, number>} perfilesDeportivos - puntaje por perfil.
 * @param {Array<Object>} rankingDeportes - ranking ordenado de actividades.
 * @returns {{parrafo: string, fortalezas: string[], debilidades: string[], recomendacion: string}} interpretación. */
export function generarInterpretacion(consolidado, perfilesDeportivos, rankingDeportes) {
  const totalesFisicas = VARS_FISICAS
    .map(v => ({ id: v.id, nombre: v.nombre, total: consolidado[v.id]?.total ?? 0 }))
    .sort((a, b) => b.total - a.total);

  const fortalezasFis  = totalesFisicas.slice(0, 3).filter(v => v.total >= 60);
  const debilidadesFis = [...totalesFisicas].reverse().slice(0, 3).filter(v => v.total < 50);

  const entradasPerfiles = Object.entries(perfilesDeportivos)
    .map(([id, val]) => ({ id, val, nombre: PERFILES_DEPORTIVOS.find(p => p.id === id)?.nombre ?? id }))
    .sort((a, b) => b.val - a.val);

  const perfilDominante  = entradasPerfiles[0];
  const perfilSecundario = entradasPerfiles[1];
  // Una diferencia menor a 10 puntos entre los dos primeros perfiles indica perfil mixto.
  const diferenciaPerfiles = (perfilDominante?.val ?? 0) - (perfilSecundario?.val ?? 0);
  const esMixto = diferenciaPerfiles < 10;

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

  const top3 = rankingDeportes.slice(0, 3);
  const recomendacion = top3.length > 0
    ? `Segun la tendencia del perfil, las familias de actividad con mayor afinidad son: ${
        top3.map(d => `${d.nombre} (${d.afinidad}%)`).join(', ')
      }. Esta orientacion es una tendencia de perfil, no una determinacion absoluta.`
    : '';

  const fortalezas  = fortalezasFis.map(f => `${f.nombre} — ${f.total}%`);
  const debilidades = debilidadesFis.map(d => `${d.nombre} — ${d.total}%`);

  return { parrafo: parrafo.trim(), fortalezas, debilidades, recomendacion };
}

/** Valida las variables físicas: vacío o no numérico bloquea; fuera de rango solo advierte (se normaliza con clamp).
 * @param {Array<Object>} vars - definiciones de variables.
 * @param {Object} reales - valores capturados por id.
 * @returns {{ok: boolean, errores: string[], advertencias: string[]}} resultado de la validación. */
export function validarFormularioVariables(vars, reales) {
  const errores      = [];
  const advertencias = [];

  vars.forEach(v => {
    const raw = reales[v.id];

    if (raw === null || raw === undefined || String(raw).trim() === '') {
      errores.push(`${v.nombre}: campo obligatorio.`);
      return;
    }

    const n = parseFloat(raw);

    // No se confía solo en el control de la interfaz: un valor no numérico, NaN o infinito bloquea.
    if (!Number.isFinite(n)) {
      errores.push(`${v.nombre}: debe ser un numero valido.`);
      return;
    }

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

/** Verifica que el nivel de Léger sea un entero entre 1 y 21.
 * @param {*} n - valor a evaluar.
 * @returns {boolean} true si es válido. */
export function esNivelLegerValido(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= 21 &&
    Number.isInteger(n);
}

/** Crea el estado vacío de un análisis completo.
 * @returns {Object} estado inicial con todas las secciones del análisis. */
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
    // Respuestas por módulo de src/evaluacion; vacío hasta que exista su captura en la interfaz o su importación.
    cuestionarios: { parq: {}, complementarias: {}, ipaq: {}, psqi: {}, breq3: {}, bbaq21: {} },
  };
}
