/* evaluacion/modulos/cuestionarios/bbaq21.js
   BBAQ-21: barreras percibidas para la actividad fisica.
   Destino: INFORMATIVA (no entra al motor; interpretacion e informe). */
import { crearModuloCuestionario, itemsNumerados } from './base.js';
import { ORIGEN, DESTINO } from '../../trazabilidad.js';

export const MODULO_BBAQ21 = crearModuloCuestionario({
  id: 'bbaq21',
  nombre: 'BBAQ-21',
  destino: DESTINO.INFORMATIVA,
  version: '0.1.0',
  fuente: {
    instrumento: 'Barriers to Being Active Quiz (21 items)',
    referencia: 'Validacion colombiana: Rubio-Henao et al. (2015).',
    origen: ORIGEN.INSTRUMENTO,
  },
  items: itemsNumerados('b', 21, { opciones: null }),
  dimensiones: null,
  mapaItemsDimension: null,
  contratoNormalizado: '{ dimensiones: { [dimension]: number } } → variablesInformativas.bbaq21',
  pendientes: [
    'Transcribir items y escala de respuesta de la validacion colombiana.',
    'Cargar dimensiones, mapa item → dimension y procedimiento de puntuacion segun la validacion.',
  ],
  calificar: null,
  normalizar: null,
});
