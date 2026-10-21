/**
 * @module evaluacion/modulos/cuestionarios/breq3
 * @description Módulo BREQ-3 de motivación hacia el ejercicio (seis subescalas y RAI), de destino informativo.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la definición e interpretación del BREQ-3.
 *  - D (Inversión de dependencias): la calificación se delega en logic/breq.js y el armado en la fábrica de cuestionarios.
 * Notas: no entra al motor. Versión española: González-Cutre, Sicilia y Fernández (2010). Opciones de respuesta pendientes de
 * verificar contra la fuente oficial; mientras sean null solo se valida presencia.
 */
import { crearModuloCuestionario } from './base.js';
import { ORIGEN, DESTINO } from '../../trazabilidad.js';
import { calcularBreq, ITEMS_BREQ } from '../../../logic/breq.js';

/** Módulo BREQ-3. */
export const MODULO_BREQ3 = crearModuloCuestionario({
  id: 'breq3',
  nombre: 'BREQ-3 (Motivación)',
  destino: DESTINO.INFORMATIVA,
  version: '0.1.0',
  fuente: {
    instrumento: 'Behavioural Regulation in Exercise Questionnaire-3',
    referencia: 'Version espanola: Gonzalez-Cutre, Sicilia y Fernandez (2010).',
    origen: ORIGEN.INSTRUMENTO,
  },
  // Ids '1'..'23', compartidos con StepBreq y calcularBreq.
  items: ITEMS_BREQ.map(it => ({ ...it, tipo: 'opcion', opciones: null })),
  subescalas: [
    'desmotivacion', 'regulacion_externa', 'regulacion_introyectada',
    'regulacion_identificada', 'regulacion_integrada', 'motivacion_intrinseca',
  ],
  mapaItemsSubescala: null,
  contratoNormalizado: '{ subescalas: { [subescala]: number }, rai: number } → variablesInformativas.breq3',
  pendientes: [
    'Verificar items y escala de respuesta de la version espanola contra fuente oficial.',
  ],
  calificar: (respuestas) => calcularBreq(respuestas),
  /** Interpreta el índice de autonomía relativa (RAI).
   * @param {Object|null} resultado - resultado de calcularBreq.
   * @returns {{datoNormalizado: Object|null, nivel: string|null}} dato normalizado y texto. */
  normalizar(resultado) {
    if (!resultado) return { datoNormalizado: null, nivel: null };
    const rai = Number(resultado.rai ?? 0);
    let texto = '';
    if (rai > 0) texto = 'Motivación autónoma: haces ejercicio porque tú lo quieres y lo disfrutas.';
    else if (rai < 0) texto = 'Motivación controlada: haces ejercicio por presión, obligación o culpa.';
    else texto = 'Motivación neutra: ni especialmente autónoma ni controlada.';
    return {
      datoNormalizado: { subescalas: resultado.subescalas, rai },
      nivel: `${texto} (RAI ${rai.toFixed(2)})`,
    };
  },
});
