/* evaluacion/modulos/cuestionarios/breq3.js
   BREQ-3: motivacion. 6 subescalas por separado + RAI.
   Destino: INFORMATIVA (no entra al motor; interpretacion e informe). */
import { crearModuloCuestionario } from './base.js';
import { ORIGEN, DESTINO } from '../../trazabilidad.js';
import { calcularBreq, ITEMS_BREQ } from '../../../logic/breq.js';

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
  // Mismos ids que usa StepBreq / calcularBreq ('1'..'23'). Opciones de
  // respuesta pendientes: mientras sean null solo se valida presencia.
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
