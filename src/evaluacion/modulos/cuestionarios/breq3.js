/* evaluacion/modulos/cuestionarios/breq3.js
   BREQ-3: motivacion. 6 subescalas por separado; NO se calcula el RAI.
   Destino: INFORMATIVA (no entra al motor; interpretacion e informe). */
import { crearModuloCuestionario, itemsNumerados } from './base.js';
import { ORIGEN, DESTINO } from '../../trazabilidad.js';

export const MODULO_BREQ3 = crearModuloCuestionario({
  id: 'breq3',
  nombre: 'BREQ-3',
  destino: DESTINO.INFORMATIVA,
  version: '0.1.0',
  fuente: {
    instrumento: 'Behavioural Regulation in Exercise Questionnaire-3',
    referencia: 'Version espanola: Gonzalez-Cutre, Sicilia y Fernandez (2010).',
    origen: ORIGEN.INSTRUMENTO,
  },
  // 23 items (verificar contra la version aplicada). Opciones de
  // respuesta pendientes: mientras sean null solo se valida presencia.
  items: itemsNumerados('r', 23, { opciones: null }),
  subescalas: [
    'desmotivacion', 'regulacion_externa', 'regulacion_introyectada',
    'regulacion_identificada', 'regulacion_integrada', 'motivacion_intrinseca',
  ],
  mapaItemsSubescala: null,
  calculaRAI: false,
  contratoNormalizado: '{ subescalas: { [subescala]: number } } → variablesInformativas.breq3',
  pendientes: [
    'Transcribir items y escala de respuesta de la version espanola.',
    'Cargar el mapa item → subescala y el procedimiento de puntuacion de cada subescala.',
  ],
  calificar: null,
  normalizar: null,
});
