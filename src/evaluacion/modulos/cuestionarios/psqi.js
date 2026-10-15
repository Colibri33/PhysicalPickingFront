/* evaluacion/modulos/cuestionarios/psqi.js
   PSQI / ICSP-VC: calidad de sueño.
   Destino: PREPARACION (el DecisionEngine solo puede bajar Estado 1 a 2
   cuando su punto de corte esté configurado; ese corte vive en la
   configuración del motor, no aquí).
   Textos transcritos del Anexo ICSP-VC (Escobar-Córdoba y
   Eslava-Schmalbach, Rev Neurol 2005). Las preguntas 10a-10e del
   compañero de habitación no puntúan: se conservan como información
   adicional. Calificación de los 7 componentes (0-3) y global 0-21
   según el Anexo. */
import { crearModuloCuestionario } from './base.js';
import { ORIGEN, DESTINO } from '../../trazabilidad.js';
import { calcularPsqi } from '../../../logic/psqi.js';

const FRECUENCIA = {
  tipo: 'opcion',
  opciones: [
    { valor: 0, etiqueta: 'Ninguna vez en el último mes' },
    { valor: 1, etiqueta: 'Menos de una vez a la semana' },
    { valor: 2, etiqueta: 'Una o dos veces a la semana' },
    { valor: 3, etiqueta: 'Tres o más veces a la semana' },
  ],
};

const PROBLEMA = {
  tipo: 'opcion',
  opciones: [
    { valor: 0, etiqueta: 'Nada problemático' },
    { valor: 1, etiqueta: 'Sólo ligeramente problemático' },
    { valor: 2, etiqueta: 'Moderadamente problemático' },
    { valor: 3, etiqueta: 'Muy problemático' },
  ],
};

export const MODULO_PSQI = crearModuloCuestionario({
  id: 'psqi',
  nombre: 'PSQI / ICSP-VC (Índice de Calidad de Sueño de Pittsburgh, versión colombiana)',
  destino: DESTINO.PREPARACION,
  version: '0.2.0',
  fuente: {
    instrumento: 'Pittsburgh Sleep Quality Index (Buysse et al., 1989)',
    referencia: 'Versión colombiana ICSP-VC: Escobar-Córdoba y Eslava-Schmalbach (Rev Neurol 2005; 40:150-155), Anexo. Referencia española: ps-vc.pdf (Bobes 5.ª ed.).',
    origen: ORIGEN.INSTRUMENTO,
  },
  items: [
    { id: 'p1', tema: 'hora_acostarse', tipo: 'hora', texto: '¿A qué hora se acostó normalmente por la noche?' },
    { id: 'p2', tema: 'minutos_para_dormirse', tipo: 'numero', min: 0, max: 1440, texto: '¿Cuánto tiempo se demoró en quedarse dormido en promedio? (minutos)' },
    { id: 'p3', tema: 'hora_levantarse', tipo: 'hora', texto: '¿A qué hora se levantó habitualmente por la mañana?' },
    { id: 'p4', tema: 'horas_sueno_efectivo', tipo: 'numero', min: 0, max: 24, texto: '¿Cuántas horas durmió cada noche?' },
    { id: 'p5a', tema: 'perturbacion_sueno_5a', ...FRECUENCIA, texto: 'No poder quedarse dormido en la primera media hora' },
    { id: 'p5b', tema: 'perturbacion_sueno_5b', ...FRECUENCIA, texto: 'Despertarse durante la noche o de madrugada' },
    { id: 'p5c', tema: 'perturbacion_sueno_5c', ...FRECUENCIA, texto: 'Tener que levantarse para ir al baño' },
    { id: 'p5d', tema: 'perturbacion_sueno_5d', ...FRECUENCIA, texto: 'No poder respirar bien' },
    { id: 'p5e', tema: 'perturbacion_sueno_5e', ...FRECUENCIA, texto: 'Toser o roncar ruidosamente' },
    { id: 'p5f', tema: 'perturbacion_sueno_5f', ...FRECUENCIA, texto: 'Sentir frío' },
    { id: 'p5g', tema: 'perturbacion_sueno_5g', ...FRECUENCIA, texto: 'Sentir calor' },
    { id: 'p5h', tema: 'perturbacion_sueno_5h', ...FRECUENCIA, texto: 'Tener ‘malos sueños’ o pesadillas' },
    { id: 'p5i', tema: 'perturbacion_sueno_5i', ...FRECUENCIA, texto: 'Tener dolores' },
    { id: 'p5j', tema: 'otras_razones_perturbacion', ...FRECUENCIA, texto: 'Otras razones (por favor, descríbalas)' },
    { id: 'p5j_descripcion', tema: 'descripcion_otras_razones', tipo: 'texto', texto: 'Describa las otras razones', visibleSi: { item: 'p5j', mayorQue: 0 } },
    { id: 'p6', tema: 'uso_medicacion_para_dormir', ...FRECUENCIA, texto: '¿Cuántas veces ha tomado medicinas (recetadas o por su cuenta) para dormir?' },
    { id: 'p7', tema: 'somnolencia_diurna', ...PROBLEMA, texto: '¿Cuántas veces ha tenido problemas para permanecer despierto mientras conducía, comía, trabajaba, estudiaba o desarrollaba alguna otra actividad social?' },
    { id: 'p8', tema: 'animo_para_actividades', ...PROBLEMA, texto: '¿El ‘tener ánimos’, qué tanto problema le ha traído para realizar actividades como conducir, comer, trabajar, estudiar o alguna actividad social?' },
    { id: 'p9', tema: 'calidad_subjetiva', tipo: 'opcion', opciones: [
      { valor: 0, etiqueta: 'Muy buena' },
      { valor: 1, etiqueta: 'Bastante buena' },
      { valor: 2, etiqueta: 'Bastante mala' },
      { valor: 3, etiqueta: 'Muy mala' },
    ], texto: '¿Cómo calificaría en conjunto la calidad de su sueño?' },
    { id: 'p10', tema: 'convivencia_habitacion', tipo: 'opcion', opciones: [
      { valor: 0, etiqueta: 'No tengo pareja ni compañero/a de habitación' },
      { valor: 1, etiqueta: 'Sí tengo, pero duerme en otra habitación' },
      { valor: 2, etiqueta: 'Sí tengo, pero duerme en la misma habitación y distinta cama' },
      { valor: 3, etiqueta: 'Sí tengo y duerme en la misma cama' },
    ], texto: '¿Tiene usted pareja o compañero/a de habitación?' },
    { id: 'p10a', tema: 'companero_ronquidos', ...FRECUENCIA, requerido: false, texto: 'Ronquidos ruidosos' },
    { id: 'p10b', tema: 'companero_pausas_respiracion', ...FRECUENCIA, requerido: false, texto: 'Grandes pausas entre respiraciones, mientras duerme' },
    { id: 'p10c', tema: 'companero_sacudidas_piernas', ...FRECUENCIA, requerido: false, texto: 'Sacudidas o espasmos de piernas mientras duerme' },
    { id: 'p10d', tema: 'companero_desorientacion', ...FRECUENCIA, requerido: false, texto: 'Episodios de desorientación o confusión mientras duerme' },
    { id: 'p10e', tema: 'companero_otros', ...FRECUENCIA, requerido: false, texto: 'Otros inconvenientes mientras usted duerme' },
    { id: 'p10e_descripcion', tema: 'companero_otros_descripcion', tipo: 'texto', requerido: false, texto: 'Describa los otros inconvenientes', visibleSi: { item: 'p10e', mayorQue: 0 } },
  ],
  componentes: [
    'calidad_subjetiva', 'latencia', 'duracion', 'eficiencia_habitual',
    'perturbaciones', 'uso_medicacion', 'disfuncion_diurna',
  ],
  contratoNormalizado: '{ puntajeGlobal: number, componentes: { [componente]: number } } → entrada.psqi del DecisionEngine',
  pendientes: [
    'Verificar el punto de corte de la validación colombiana (se configura en el DecisionEngine, no aquí).',
  ],
  calificar(respuestas) {
    return calcularPsqi(respuestas);
  },
  normalizar(resultado) {
    if (!resultado) return { datoNormalizado: null, nivel: null };
    return {
      datoNormalizado: {
        puntajeGlobal: resultado.puntajeGlobal,
        componentes: { ...resultado.componentes },
        categoria: resultado.categoria,
      },
      nivel: null,
    };
  },
});
