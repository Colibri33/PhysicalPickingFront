/**
 * @module evaluacion/informe/detalleCapacidades
 * @description Datos del panel "Tu perfil de rendimiento": valor, nivel, estado frente a la familia elegida, referencia y diferencia por capacidad.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la presentación por capacidad del resultado del flujo.
 *  - D (Inversión de dependencias): reutiliza las reglas del motor (cumpleDemanda, esBrechaSevera) y los baremos; no los duplica.
 * Notas: solo organiza lo producido por el flujo; no inventa porcentajes ni valores. La referencia es el corte del mismo baremo (sexo y edad del
 * participante) para el nivel mínimo que exige la familia o, sin familia, para el siguiente nivel; la diferencia compara el valor medido con ella.
 */
import { NIVELES } from '../niveles.js';
import { CAPACIDADES } from '../modulos/fisicas.js';
import { BAREMOS_AFISAL } from '../normalizacion/afisal.js';
import { BAREMOS_LEGER, LEGER_PARAMS } from '../normalizacion/leger.js';
import { buscarGrupo } from '../normalizacion/baremos.js';
import { MATRIZ_DEMANDA, DEMANDA_ALTA, capacidadesRelevantes } from '../decision/matrizDemanda.js';
import { cumpleDemanda, esBrechaSevera } from '../decision/compatibilidad.js';
import { PAUTAS_POR_COMPONENTE } from '../reglas/planAdaptacion.js';

/** Orden de presentación de las capacidades. */
export const ORDEN_CAPACIDADES = ['fuerza', 'fuerza_explosiva', 'vo2max', 'flexibilidad', 'equilibrio'];

/** Descripción fija de cada prueba, tal como la captura la app, y de su baremo. */
export const INFO_CAPACIDAD = Object.freeze({
  fuerza: {
    nombre: 'Fuerza prensil', zona: 'Manos y antebrazos', unidad: 'kg',
    mide: 'Dinamometría manual: mejor intento de cada mano; el resultado es la suma de ambas.',
    baremo: 'AFISAL-INEFC (Rodríguez et al., 1998), Tabla 8',
  },
  fuerza_explosiva: {
    nombre: 'Fuerza explosiva', zona: 'Piernas (salto)', unidad: 'cm',
    mide: 'Salto vertical: altura alcanzada en el salto, en centímetros.',
    baremo: 'AFISAL-INEFC (Rodríguez et al., 1998), Tabla 12',
  },
  vo2max: {
    nombre: 'Resistencia aeróbica', zona: 'Corazón y pulmones', unidad: 'ml/kg/min',
    mide: 'Test de Léger (course navette 20 m): con el último nivel alcanzado se estima el VO2máx (ecuación de Léger et al., 1988).',
    baremo: 'Baremo propio de PhysicalPicking por sexo (provisional)',
  },
  flexibilidad: {
    nombre: 'Flexibilidad', zona: 'Cadera y espalda baja', unidad: 'cm',
    mide: 'Flexión anterior del tronco (sit-and-reach), en centímetros.',
    baremo: 'AFISAL-INEFC (Rodríguez et al., 1998), Tabla 11',
  },
  equilibrio: {
    nombre: 'Equilibrio', zona: 'Pie de apoyo', unidad: 'intentos',
    mide: 'Equilibrio monopodal sin visión: número de intentos en 1 minuto, suma de ambas piernas (a menos intentos, mejor).',
    baremo: 'AFISAL-INEFC (Rodríguez et al., 1998), Tabla 9',
  },
});

const NIVEL_MINIMO = Object.freeze({ Baja: 'Bajo', Media: 'Medio', Alta: 'Alto', 'Muy alta': 'Muy alto' });
const REGISTRO = new Map([...BAREMOS_AFISAL, ...BAREMOS_LEGER].map(b => [b.id, b]));
const COMPONENTE = { fuerza: 'fuerza', fuerza_explosiva: 'fuerza', vo2max: 'aerobico', flexibilidad: 'flexibilidad', equilibrio: 'equilibrio' };

/** Redondea a un decimal.
 * @param {number} x - valor.
 * @returns {number} valor redondeado. */
const redondear = (x) => Math.round(x * 10) / 10;
/** Formatea con coma decimal.
 * @param {number} x - valor.
 * @returns {string} texto. */
const fmt = (x) => (Number.isInteger(x) ? String(x) : String(redondear(x)).replace('.', ','));

/** Obtiene el corte del baremo para alcanzar un nivel o mejor.
 * @param {Object} baremo - baremo de cortes ordenados.
 * @param {Object} grupo - grupo de sexo y edad.
 * @param {string} nivelObjetivo - nivel a alcanzar.
 * @param {string} unidad - unidad de medida.
 * @returns {{op: string, valor: number, unidad: string, texto: string}|null} umbral, o null si no aplica. */
export function umbralParaNivel(baremo, grupo, nivelObjetivo, unidad) {
  const li = NIVELES.indexOf(nivelObjetivo);
  if (!baremo || !grupo || li <= 0) return null;
  const cortes = grupo.cortes;
  if (baremo.direccion === 'mayor_mejor') {
    const valor = cortes[li - 1];
    const op = baremo.limite === 'inferior_inclusivo' ? '≥' : '>';
    return { op, valor, unidad, texto: `${op} ${fmt(valor)} ${unidad}` };
  }
  // menor_mejor (conteos enteros): nivel li o mejor equivale a valor < cortes[4 - li].
  const k = NIVELES.length - 1 - li;
  const valor = baremo.limite === 'inferior_inclusivo' ? cortes[k] - 1 : cortes[k];
  return { op: '≤', valor, unidad, texto: `≤ ${fmt(valor)} ${unidad}` };
}

/** Calcula la diferencia entre el valor medido y el umbral.
 * @param {number|null} valor - valor medido.
 * @param {Object|null} umbral - umbral de referencia.
 * @param {string} direccion - 'mayor_mejor' o 'menor_mejor'.
 * @returns {{cumple: boolean, valor: number, texto: string}|null} diferencia, o null si falta dato. */
function diferencia(valor, umbral, direccion) {
  if (valor == null || !umbral) return null;
  const d = direccion === 'menor_mejor' ? umbral.valor - valor : valor - umbral.valor;
  const cumple = umbral.op === '>' ? d > 0 : d >= 0;
  const abs = Math.abs(redondear(d));
  if (cumple) return { cumple: true, valor: abs, texto: abs === 0 ? 'Justo en la referencia' : `+${fmt(abs)} ${umbral.unidad}` };
  const unidad = abs === 1 && umbral.unidad === 'intentos' ? 'intento' : umbral.unidad;
  return {
    cumple: false, valor: abs,
    texto: direccion === 'menor_mejor' ? `${fmt(abs)} ${unidad} de más` : `Faltan ${fmt(abs)} ${unidad}`,
  };
}

/** Calcula el nivel de Léger necesario para un VO2máx dado (inversa de la ecuación de leger.js).
 * @param {number} vo2 - VO2máx en ml/kg/min.
 * @returns {number} nivel entero mínimo. */
function nivelLegerPara(vo2) {
  const v = (vo2 - LEGER_PARAMS.constanteVO2) / LEGER_PARAMS.coeficienteVO2;
  return Math.max(1, Math.ceil((v - LEGER_PARAMS.velocidadPalier1) / LEGER_PARAMS.incrementoPorPalier + 1 - 1e-9));
}

/** Describe el grupo de baremo en texto.
 * @param {Object|null} grupo - grupo de sexo y edad.
 * @returns {string|null} etiqueta, o null. */
function etiquetaGrupo(grupo) {
  if (!grupo) return null;
  const sexo = grupo.sexo === 'masculino' ? 'hombres' : grupo.sexo === 'femenino' ? 'mujeres' : 'todos';
  return `${sexo} ${grupo.edadMin}-${grupo.edadMax} años`;
}

/** Construye el detalle por capacidad a partir del flujo.
 * @param {Object} flujo - salida de ejecutarFlujoEvaluacion().
 * @param {string|null} [familiaId] - familia de comparación; null para solo el perfil.
 * @returns {Object[]} detalle por capacidad en ORDEN_CAPACIDADES. */
export function detalleCapacidades(flujo, familiaId = null) {
  const modulos = flujo?.etapas?.modulos ?? {};
  const niveles = flujo?.etapas?.decisionEngine?.entrada?.capacidades ?? {};
  const contexto = flujo?.contexto ?? {};
  const familia = MATRIZ_DEMANDA.find(f => f.id === familiaId) ?? null;
  const relevantes = familia ? new Set(capacidadesRelevantes(familia)) : new Set();

  return ORDEN_CAPACIDADES.map((id, i) => {
    const info = INFO_CAPACIDAD[id];
    const cap = CAPACIDADES.find(c => c.id === id);
    const m = modulos[`fisica_${id}`];
    const nivel = niveles[id] ?? null;
    const bruto = m?.resultadoEvaluacion?.valor;
    const valor = nivel != null && bruto != null && Number.isFinite(Number(bruto)) ? Number(bruto) : null;
    const baremo = REGISTRO.get(cap?.baremoId) ?? null;
    const grupo = baremo ? buscarGrupo(baremo, contexto) ?? null : null;

    const demanda = familia?.demandas?.[id] ?? null;
    let estado = null;
    if (familia) {
      estado = nivel == null ? 'sin_dato'
        : cumpleDemanda(nivel, demanda) ? 'cumple'
          : esBrechaSevera(nivel, demanda) ? 'severa' : 'brecha';
    } else if (nivel == null) {
      estado = 'sin_dato';
    }

    // Referencia: nivel mínimo de la familia o, sin familia, el siguiente nivel.
    const ni = NIVELES.indexOf(nivel);
    const nivelObjetivo = familia ? NIVEL_MINIMO[demanda] : (ni >= 0 && ni < NIVELES.length - 1 ? NIVELES[ni + 1] : null);
    const umbral = umbralParaNivel(baremo, grupo, nivelObjetivo, info.unidad);
    const dif = diferencia(valor, umbral, baremo?.direccion);
    const legerNecesario = id === 'vo2max' && umbral ? nivelLegerPara(umbral.valor) : null;

    return {
      id, num: i + 1, ...info,
      nivel, nivelIndex: ni,
      valor, valorTexto: valor == null ? 'Sin dato' : `${fmt(valor)} ${info.unidad}`,
      palier: id === 'vo2max' ? (m?.resultadoEvaluacion?.detalle?.nivel ?? m?.resultadoEvaluacion?.palier ?? null) : null,
      demanda, nivelObjetivo, objetivoIndex: NIVELES.indexOf(nivelObjetivo),
      exigenciaAlta: DEMANDA_ALTA.includes(demanda),
      relevanteMitchell: relevantes.has(id),
      estado,
      umbral, diferencia: dif, legerNecesario,
      grupoBaremo: etiquetaGrupo(grupo),
      pauta: PAUTAS_POR_COMPONENTE[COMPONENTE[id]] ?? null,
      noAutorizado: id === 'vo2max' && flujo?.etapas?.reglas?.pruebaMaxima?.autorizada === false,
    };
  });
}

/** Selecciona la capacidad con mayor margen de mejora: brecha severa, luego brecha (más niveles de distancia), luego nivel más bajo.
 * @param {Object[]} detalles - salida de detalleCapacidades.
 * @returns {Object|null} capacidad priorizada, o null si no hay datos. */
export function mayorOportunidad(detalles) {
  const peso = { severa: 3, brecha: 2 };
  const candidatos = detalles.filter(d => d.nivelIndex >= 0);
  if (candidatos.length === 0) return null;
  return [...candidatos].sort((a, b) =>
    (peso[b.estado] ?? 0) - (peso[a.estado] ?? 0)
    || ((b.objetivoIndex - b.nivelIndex) - (a.objetivoIndex - a.nivelIndex))
    || (a.nivelIndex - b.nivelIndex))[0];
}
