/**
 * @module evaluacion/antropometria
 * @description Cálculo de IMC e ICC y rangos de coherencia de las medidas antropométricas.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la fórmula o el criterio de clasificación de una medida antropométrica.
 *  - D (Inversión de dependencias): funciones puras sin React ni DOM; el módulo de evaluación y las pantallas las consumen desde aquí.
 * Notas: IMC según la clasificación de la OMS, sin distinción de sexo; ICC con los cortes de la OMS (2008), 0,90 en hombres y 0,85 en mujeres.
 * Los rangos solo rechazan valores absurdos, no son puntos de corte. El backend conserva una copia en src/utils/validacion.js.
 * La antropometría se informa, pero no modifica los niveles ni la recomendación.
 */

/** Rangos de coherencia física de las medidas antropométricas. */
export const RANGOS_ANTROPOMETRICOS = {
  peso:      { etiqueta: 'Peso (kg)',              min: 1,  max: 400 },
  talla:     { etiqueta: 'Talla (cm)',             min: 30, max: 250 },
  cintura:   { etiqueta: 'Cintura (cm)',           min: 40, max: 250 },
  cadera:    { etiqueta: 'Cadera (cm)',            min: 40, max: 250 },
  grasaVisc: { etiqueta: 'Grasa visceral (nivel)', min: 0,  max: 60  },
};

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

/** Clasifica el riesgo según el ICC y el sexo (cortes OMS 2008: 0,90 hombres y 0,85 mujeres).
 * @param {number} icc - índice cintura-cadera.
 * @param {'masculino'|'femenino'|string} sexo - sexo del evaluado.
 * @returns {string} categoría de riesgo, o cadena vacía si no es posible clasificar. */
export function clasificarICC(icc, sexo) {
  if (!Number.isFinite(icc)) return '';
  if (sexo === 'masculino') return icc >= 0.90 ? 'Riesgo sustancialmente aumentado' : 'Sin riesgo aumentado';
  if (sexo === 'femenino') return icc >= 0.85 ? 'Riesgo sustancialmente aumentado' : 'Sin riesgo aumentado';
  return '';
}
