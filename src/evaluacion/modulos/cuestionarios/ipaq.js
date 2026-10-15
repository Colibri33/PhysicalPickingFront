/* evaluacion/modulos/cuestionarios/ipaq.js
   IPAQ versión corta (7 ítems): nivel de actividad física actual.
   Destino: PREPARACION (alimenta el estado de preparación del
   DecisionEngine junto con la base física).
   Textos transcritos de IPAQ_cuestionario_0.pdf (versión en español
   del formato corto). Referencia original: Craig et al. (2003).
   Calificación MET-min/semana y categorías según el propio cuestionario. */
import { crearModuloCuestionario } from './base.js';
import { ORIGEN, DESTINO } from '../../trazabilidad.js';
import { calcularIpaq } from '../../../logic/ipaq.js';

// Límites de COHERENCIA (no son reglas de calificación del IPAQ).
const DIAS = { tipo: 'numero', entero: true, min: 0, max: 7 };
const MIN_DIA = { tipo: 'numero', min: 0, max: 1440, permiteNoSabe: true };

export const MODULO_IPAQ = crearModuloCuestionario({
  id: 'ipaq',
  nombre: 'IPAQ (versión corta)',
  destino: DESTINO.PREPARACION,
  version: '0.2.0',
  fuente: {
    instrumento: 'International Physical Activity Questionnaire - versión corta (7 ítems)',
    referencia: 'Craig et al. (2003). Versión en español aplicada: IPAQ_cuestionario_0.pdf (últimos 7 días).',
    origen: ORIGEN.INSTRUMENTO,
  },
  items: [
    { id: 'i1', tema: 'dias_actividad_vigorosa', ...DIAS, texto: 'Durante los últimos 7 días, ¿en cuántos días realizó actividades físicas vigorosas tales como levantar pesos pesados, cavar, hacer ejercicios aeróbicos o andar rápido en bicicleta?' },
    { id: 'i2', tema: 'minutos_dia_actividad_vigorosa', ...MIN_DIA, texto: 'Habitualmente, ¿cuánto tiempo en total dedicó a una actividad física intensa en uno de esos días?', visibleSi: { item: 'i1', mayorQue: 0 } },
    { id: 'i3', tema: 'dias_actividad_moderada', ...DIAS, texto: 'Durante los últimos 7 días, ¿en cuántos días hizo actividades físicas moderadas como transportar pesos livianos, andar en bicicleta a velocidad regular o jugar a dobles en tenis? No incluya caminar.' },
    { id: 'i4', tema: 'minutos_dia_actividad_moderada', ...MIN_DIA, texto: 'Habitualmente, ¿cuánto tiempo en total dedicó a una actividad física moderada en uno de esos días?', visibleSi: { item: 'i3', mayorQue: 0 } },
    { id: 'i5', tema: 'dias_caminata', ...DIAS, texto: 'Durante los últimos 7 días, ¿en cuántos días caminó por lo menos 10 minutos seguidos?' },
    { id: 'i6', tema: 'minutos_dia_caminata', ...MIN_DIA, texto: 'Habitualmente, ¿cuánto tiempo en total dedicó a caminar en uno de esos días?', visibleSi: { item: 'i5', mayorQue: 0 } },
    { id: 'i7', tema: 'minutos_dia_sentado', ...MIN_DIA, texto: 'Habitualmente, ¿cuánto tiempo pasó sentado durante un día hábil?' },
  ],
  contratoNormalizado: "{ categoria: 'Bajo' | 'Moderado' | 'Alto', metMinSemana: number } → entrada.ipaq del DecisionEngine",
  pendientes: [],
  calificar(respuestas) {
    return calcularIpaq(respuestas);
  },
  normalizar(resultado) {
    if (!resultado) return { datoNormalizado: null, nivel: null };
    return {
      datoNormalizado: {
        categoria: resultado.categoria,
        metMinSemana: resultado.met.total,
        metPorIntensidad: { ...resultado.met },
      },
      nivel: resultado.categoria,
    };
  },
});
