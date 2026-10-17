/* evaluacion/modulos/cuestionarios/bbaq21.js
   BBAQ-21: barreras percibidas para la actividad fisica.
   Destino: INFORMATIVA (no entra al motor; interpretacion e informe). */
import { crearModuloCuestionario } from './base.js';
import { ORIGEN, DESTINO } from '../../trazabilidad.js';
import { calcularBarreras, ITEMS_BARRERAS, DIMENSIONES_BARRERAS } from '../../../logic/barreras.js';

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
  // Mismos ids que usa StepBarreras / calcularBarreras ('1'..'21'). Opciones de
  // respuesta pendientes: mientras sean null solo se valida presencia.
  items: ITEMS_BARRERAS.map(it => ({ ...it, tipo: 'opcion', opciones: null })),
  dimensiones: null,
  mapaItemsDimension: null,
  contratoNormalizado: '{ dimensiones: { [dimension]: number }, significativas: string[] } → variablesInformativas.bbaq21',
  pendientes: [
    'Verificar items y escala de respuesta de la validacion colombiana contra fuente oficial.',
  ],
  calificar: (respuestas) => calcularBarreras(respuestas),
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
