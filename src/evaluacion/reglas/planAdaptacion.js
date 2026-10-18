/* ═══════════════════════════════════════════════════════════════
   evaluacion/reglas/planAdaptacion.js
   Etapa 8b: estado de preparacion cuando NINGUNA familia es firme
   (R-DEC-03, decision propia 2026-10). Dos casos:

   1. Estado 3 · Adaptación desde cero: todas las familias tienen al
      menos una brecha severa (nivel Muy bajo/Bajo donde la familia
      exige Alta/Muy alta). La base física actual no alcanza la demanda
      definitoria de ninguna familia → no se recomienda deporte y se
      entrega una orientación general de acondicionamiento.
   2. Datos insuficientes: alguna familia solo queda sin recomendar
      por falta de datos (no por brecha severa) → se piden esos datos
      en vez de asignar el Estado 3.

   La orientación NO inventa cargas ni semanas: parafrasea las
   recomendaciones generales del ACSM para adultos que inician
   (ACSM's Guidelines for Exercise Testing and Prescription, 11.ª ed.,
   2021, cap. 5: Tablas 5.1, 5.5 y 5.6 y apartado "Progression of
   Aerobic Exercise"). Las prioridades salen de las capacidades del
   propio perfil en nivel Muy bajo o Bajo.

   Pendiente (no se inventa): Estados 1 y 2 (base física + IPAQ +
   PSQI) siguen sin regla definida.
   ═══════════════════════════════════════════════════════════════ */

export const FUENTE_ACSM = Object.freeze({
  referencia: 'American College of Sports Medicine (2021). ACSM\'s Guidelines for Exercise Testing and Prescription (11.ª ed.). Wolters Kluwer. Capítulo 5.',
  origen: 'literatura',
});

const REF_PROGRESION = 'ACSM (2021), cap. 5, Progression of Aerobic Exercise';

export const PAUTAS_GENERALES = Object.freeze([
  {
    id: 'inicio', titulo: 'Cómo empezar', referencia: REF_PROGRESION,
    texto: 'Comenzar con intensidad ligera a moderada y aumentar primero la duración de las sesiones, según la tolerancia ("empezar suave e ir despacio").',
  },
  {
    id: 'progresion', titulo: 'Cómo progresar', referencia: REF_PROGRESION,
    texto: 'En las primeras 4 a 6 semanas, sumar de 5 a 10 minutos por sesión cada 1 a 2 semanas. Tras al menos un mes de práctica regular, ajustar la carga de forma gradual durante los siguientes 4 a 8 meses (más tiempo si el desacondicionamiento es marcado).',
  },
  {
    id: 'monitoreo', titulo: 'Qué vigilar', referencia: REF_PROGRESION,
    texto: 'Después de cada ajuste, vigilar la falta de aire excesiva, la fatiga y el dolor muscular; si la carga no se tolera, reducirla.',
  },
]);

export const PAUTAS_POR_COMPONENTE = Object.freeze({
  aerobico: {
    capacidades: ['vo2max'], titulo: 'Resistencia aeróbica', referencia: 'ACSM (2021), Tabla 5.1',
    texto: 'Ejercicio aeróbico continuo o intermitente con grandes grupos musculares, al menos 3 días por semana, avanzando hacia 150 minutos semanales o más de intensidad moderada.',
  },
  fuerza: {
    capacidades: ['fuerza', 'fuerza_explosiva'], titulo: 'Fuerza muscular', referencia: 'ACSM (2021), Tabla 5.5',
    texto: 'Para principiantes: trabajar cada grupo muscular principal al menos 2 días por semana, con 8 a 12 repeticiones al 60–70 % de 1RM, priorizando ejercicios multiarticulares (pesas, máquinas o el propio peso corporal).',
  },
  flexibilidad: {
    capacidades: ['flexibilidad'], titulo: 'Flexibilidad', referencia: 'ACSM (2021), Tabla 5.6',
    texto: 'Estirar los principales grupos músculo-tendinosos al menos 2 a 3 días por semana (a diario es lo más eficaz), sosteniendo cada estiramiento estático de 10 a 30 segundos hasta sentir tensión o una leve molestia.',
  },
  equilibrio: {
    capacidades: ['equilibrio'], titulo: 'Equilibrio', referencia: 'ACSM (2021), cap. 5',
    texto: 'El capítulo 5 del ACSM no trae una pauta específica de equilibrio para adultos sanos: este componente lo define el profesional que acompañe el proceso.',
  },
});

const ORDEN_CAPACIDADES = ['fuerza', 'fuerza_explosiva', 'vo2max', 'flexibilidad', 'equilibrio'];
const NIVELES_PRIORIDAD = ['Muy bajo', 'Bajo'];

function componenteDe(capacidad) {
  return Object.entries(PAUTAS_POR_COMPONENTE).find(([, p]) => p.capacidades.includes(capacidad))?.[0] ?? null;
}

/**
 * @param {{ ranking, capacidades: {[cap]: nivel|null} }} p
 *   ranking: salida de construirRanking(); capacidades: niveles que recibió el motor.
 */
export function construirPlanAdaptacion({ ranking, capacidades }) {
  if (!ranking?.sinFamiliaCompatible) {
    return {
      aplica: false,
      estado: null,
      pendiente: 'Estados 1 y 2 (base física + IPAQ + PSQI) pendientes de definición.',
    };
  }
  const familias = ranking.familias ?? [];
  const tieneSevera = (f) => (f.motivosNoFirme ?? []).some(m => m.tipo === 'brecha_severa');
  const bloqueadasSoloPorDatos = familias.filter(f => !tieneSevera(f));

  if (bloqueadasSoloPorDatos.length > 0) {
    const faltantes = [...new Set(bloqueadasSoloPorDatos.flatMap(f =>
      (f.motivosNoFirme ?? []).filter(m => m.tipo === 'sin_dato').map(m => m.capacidad)))];
    return {
      aplica: true,
      estado: null,
      tipo: 'datos_insuficientes',
      regla: 'R-DEC-03',
      motivo: 'Faltan datos de capacidades que algunas familias exigen: complétalos para poder recomendar.',
      faltantes: ORDEN_CAPACIDADES.filter(c => faltantes.includes(c)),
    };
  }

  const prioridades = ORDEN_CAPACIDADES
    .filter(c => NIVELES_PRIORIDAD.includes(capacidades?.[c]))
    .map(c => ({ capacidad: c, nivel: capacidades[c] }))
    .sort((a, b) => NIVELES_PRIORIDAD.indexOf(a.nivel) - NIVELES_PRIORIDAD.indexOf(b.nivel));
  const componentes = [...new Set(prioridades.map(p => componenteDe(p.capacidad)).filter(Boolean))];

  return {
    aplica: true,
    estado: 3,
    tipo: 'adaptacion_desde_cero',
    nombre: 'Adaptación desde cero',
    regla: 'R-DEC-03',
    motivo: 'Con el perfil actual, todas las familias deportivas tienen al menos una brecha severa en su demanda principal: antes de orientar hacia un deporte se recomienda una fase de acondicionamiento general.',
    prioridades,
    pautasGenerales: PAUTAS_GENERALES,
    pautasComponentes: componentes.map(id => ({ id, ...PAUTAS_POR_COMPONENTE[id] })),
    fuente: FUENTE_ACSM,
  };
}
