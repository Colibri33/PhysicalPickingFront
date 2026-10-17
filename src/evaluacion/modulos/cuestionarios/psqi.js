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
    { id: 'p1', tema: 'hora_acostarse', tipo: 'hora', texto: 'Durante el último mes, ¿cuál ha sido, normalmente, su hora de acostarse?' },
    { id: 'p2', tema: 'minutos_para_dormirse', tipo: 'numero', min: 0, max: 1440, texto: 'Durante el último mes, ¿cuánto tiempo habrá tardado en dormirse, normalmente, las noches del último mes? (Apunte el tiempo en minutos)' },
    { id: 'p3', tema: 'hora_levantarse', tipo: 'hora', texto: 'Durante el último mes, ¿a qué hora se ha levantado habitualmente por la mañana?' },
    { id: 'p4', tema: 'horas_sueno_efectivo', tipo: 'numero', min: 0, max: 24, texto: 'Durante el último mes, ¿cuántas horas calcula que habrá dormido verdaderamente cada noche durante el último mes? (El tiempo puede ser diferente al que usted permanezca en la cama)' },
    { id: 'p5a', tema: 'perturbacion_sueno_5a', ...FRECUENCIA, texto: 'No poder conciliar el sueño en la primera media hora' },
    { id: 'p5b', tema: 'perturbacion_sueno_5b', ...FRECUENCIA, texto: 'Despertarse durante la noche o de madrugada' },
    { id: 'p5c', tema: 'perturbacion_sueno_5c', ...FRECUENCIA, texto: 'Tener que levantarse para ir al servicio' },
    { id: 'p5d', tema: 'perturbacion_sueno_5d', ...FRECUENCIA, texto: 'No poder respirar bien' },
    { id: 'p5e', tema: 'perturbacion_sueno_5e', ...FRECUENCIA, texto: 'Toser o roncar ruidosamente' },
    { id: 'p5f', tema: 'perturbacion_sueno_5f', ...FRECUENCIA, texto: 'Sentir frío' },
    { id: 'p5g', tema: 'perturbacion_sueno_5g', ...FRECUENCIA, texto: 'Sentir demasiado calor' },
    { id: 'p5h', tema: 'perturbacion_sueno_5h', ...FRECUENCIA, texto: 'Tener pesadillas o «malos sueños»' },
    { id: 'p5i', tema: 'perturbacion_sueno_5i', ...FRECUENCIA, texto: 'Sufrir dolores' },
    { id: 'p5j', tema: 'otras_razones_perturbacion', ...FRECUENCIA, texto: 'Otras razones (por favor, descríbalas a continuación)' },
    { id: 'p5j_descripcion', tema: 'descripcion_otras_razones', tipo: 'texto', texto: 'Describa las otras razones', visibleSi: { item: 'p5j', mayorQue: 0 } },
    { id: 'p6', tema: 'uso_medicacion_para_dormir', ...FRECUENCIA, texto: 'Durante el último mes, ¿cuántas veces habrá tomado medicinas (por su cuenta o recetadas por el médico) para dormir?' },
    { id: 'p7', tema: 'somnolencia_diurna', ...FRECUENCIA, texto: 'Durante el último mes, ¿cuántas veces ha sentido somnolencia mientras conducía, comía o desarrollaba alguna otra actividad?' },
    { id: 'p8', tema: 'animo_para_actividades', ...PROBLEMA, texto: 'Durante el último mes, ¿ha representado para usted mucho problema el «tener ánimos» para realizar alguna de las actividades detalladas en la pregunta anterior?' },
    { id: 'p9', tema: 'calidad_subjetiva', tipo: 'opcion', opciones: [
      { valor: 0, etiqueta: 'Bastante bueno' },
      { valor: 1, etiqueta: 'Bueno' },
      { valor: 2, etiqueta: 'Malo' },
      { valor: 3, etiqueta: 'Bastante malo' },
    ], texto: 'Durante el último mes, ¿cómo valoraría en conjunto, la calidad de su sueño?' },
    { id: 'p10', tema: 'convivencia_habitacion', tipo: 'opcion', opciones: [
      { valor: 0, etiqueta: 'Solo' },
      { valor: 1, etiqueta: 'Con alguien en otra habitación' },
      { valor: 2, etiqueta: 'En la misma habitación, pero en otra cama' },
      { valor: 3, etiqueta: 'En la misma cama' },
    ], texto: '¿Duerme usted solo o acompañado?' },
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
      nivel: resultado.categoria,
    };
  },
});
