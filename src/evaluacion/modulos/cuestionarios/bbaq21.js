/**
 * @module evaluacion/modulos/cuestionarios/bbaq21
 * @description Módulo BBAQ-21 de barreras percibidas para la actividad física, de destino informativo.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la definición e interpretación del BBAQ-21.
 *  - D (Inversión de dependencias): la calificación se delega en logic/barreras.js y el armado en la fábrica de cuestionarios.
 * Notas: no entra al motor; solo interpretación e informe. Validación colombiana: Rubio-Henao et al. (2015). Opciones de respuesta
 * pendientes de verificar contra la fuente oficial; mientras sean null solo se valida presencia.
 */
import { crearModuloCuestionario } from './base.js';
import { ORIGEN, DESTINO } from '../../trazabilidad.js';
import { calcularBarreras, ITEMS_BARRERAS, DIMENSIONES_BARRERAS } from '../../../logic/barreras.js';

/** Módulo BBAQ-21. */
export const MODULO_BBAQ21 = crearModuloCuestionario({
  id: 'bbaq21',
  nombre: 'BBAQ-21 (Barreras percibidas)',
  destino: DESTINO.INFORMATIVA,
  version: '0.1.0',
  fuente: {
    instrumento: 'Barriers to Being Active Quiz (21 items)',
    referencia: 'Validacion colombiana: Rubio-Henao et al. (2015).',
    origen: ORIGEN.INSTRUMENTO,
  },
  // Ids '1'..'21', compartidos con StepBarreras y calcularBarreras.
  items: ITEMS_BARRERAS.map(it => ({ ...it, tipo: 'opcion', opciones: null })),
  dimensiones: null,
  mapaItemsDimension: null,
  contratoNormalizado: '{ dimensiones: { [dimension]: number }, significativas: string[] } → variablesInformativas.bbaq21',
  pendientes: [
    'Verificar items y escala de respuesta de la validacion colombiana contra fuente oficial.',
  ],
  calificar: (respuestas) => calcularBarreras(respuestas),
  /** Resume las barreras significativas en un texto interpretativo.
   * @param {Object|null} resultado - resultado de calcularBarreras.
   * @returns {{datoNormalizado: Object|null, nivel: string|null}} dato normalizado y texto. */
  normalizar(resultado) {
    if (!resultado) return { datoNormalizado: null, nivel: null };
    const count = resultado.significativas.length;
    const nombres = resultado.significativas
      .map(id => DIMENSIONES_BARRERAS[id]?.nombre || id)
      .join(', ');
    let texto = '';
    if (count === 0) texto = 'Sin barreras importantes.';
    else if (count <= 2) texto = `Tienes ${count} barrera(s) leve(s): ${nombres}.`;
    else texto = `Tienes barreras significativas que te impiden hacer ejercicio: ${nombres}.`;
    return {
      datoNormalizado: { dimensiones: resultado.dimensiones, significativas: resultado.significativas },
      nivel: texto,
    };
  },
});
