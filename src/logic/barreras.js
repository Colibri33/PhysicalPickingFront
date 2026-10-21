/**
 * @module logic/barreras
 * @description Banco de ítems y puntuación del cuestionario BBAQ-21 (barreras para la actividad física).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la definición o el cálculo del BBAQ-21.
 *  - O (Abierto/Cerrado): las dimensiones y el umbral son datos; se ajustan sin alterar la lógica de cálculo.
 * Notas: 7 dimensiones x 3 ítems, puntaje 0-9 por dimensión; barrera significativa con puntaje >= 5.
 * La asignación ítem-dimensión y el umbral provienen del cuestionario CDC de 21 ítems; confirmar con fuente académica.
 */

export const ITEMS_BARRERAS = [
  { id: '1',  texto: 'Mi día es tan ocupado ahora que no creo que pueda apartar tiempo para realizar actividad física en mi horario normal.' },
  { id: '2',  texto: 'A ninguno de mis familiares o amigos les gusta realizar actividad física, así que no tengo oportunidad de hacer ejercicio.' },
  { id: '3',  texto: 'Estoy muy cansado después del trabajo como para hacer ejercicio.' },
  { id: '4',  texto: 'He estado pensando en empezar a hacer ejercicio, pero no he sido capaz de dar el primer paso.' },
  { id: '5',  texto: 'Hacer ejercicio puede ser riesgoso a mi edad.' },
  { id: '6',  texto: 'No hago ejercicio lo suficiente porque nunca he aprendido ningún deporte.' },
  { id: '7',  texto: 'No tengo acceso a caminos para trotar, piscinas, senderos para bicicleta, etc.' },
  { id: '8',  texto: 'Hacer actividad física me quita mucho tiempo de las otras obligaciones que tengo como mi trabajo, familia, horario, etc.' },
  { id: '9',  texto: 'Me da pena cómo me voy a ver cuando haga ejercicio en frente de otras personas.' },
  { id: '10', texto: 'Yo ni siquiera duermo lo suficiente. No me podría levantar más temprano o acostarme más tarde para hacer ejercicio.' },
  { id: '11', texto: 'Es más fácil para mí encontrar excusas para no hacer ejercicio que ponerme a hacerlo.' },
  { id: '12', texto: 'Conozco muchas personas que se han lastimado porque han hecho mucho ejercicio.' },
  { id: '13', texto: 'Realmente, no me veo aprendiendo un nuevo deporte a mi edad.' },
  { id: '14', texto: 'Es simplemente muy costoso. Uno tiene que tomar una clase, inscribirse en un club o comprar el equipo adecuado.' },
  { id: '15', texto: 'Tengo muy poco tiempo libre durante el día para hacer ejercicio.' },
  { id: '16', texto: 'Mis actividades sociales habituales con mis familiares y amigos no incluyen actividades físicas.' },
  { id: '17', texto: 'Estoy muy cansada (o) durante la semana y necesito descansar durante el fin de semana para recuperarme.' },
  { id: '18', texto: 'Quiero hacer más ejercicio, pero parece que no puedo obligarme a hacerlo.' },
  { id: '19', texto: 'Me da miedo lesionarme o que me dé un ataque cardiaco.' },
  { id: '20', texto: 'No soy lo suficientemente bueno en ninguna actividad física como para entretenerme.' },
  { id: '21', texto: 'Si hubiese un lugar para hacer ejercicio y duchas en el trabajo, tendría más probabilidad de hacer ejercicios.' },
];

export const DIMENSIONES_BARRERAS = {
  tiempo:    { nombre: 'Falta de tiempo',          items: [1, 8, 15] },
  social:    { nombre: 'Influencia social',        items: [2, 9, 16] },
  energia:   { nombre: 'Falta de energía',         items: [3, 10, 17] },
  voluntad:  { nombre: 'Falta de fuerza de voluntad', items: [4, 11, 18] },
  lesion:    { nombre: 'Miedo a lesionarse',       items: [5, 12, 19] },
  habilidad: { nombre: 'Falta de habilidad',       items: [6, 13, 20] },
  recursos:  { nombre: 'Falta de recursos',        items: [7, 14, 21] },
};

export const UMBRAL_BARRERA = 5;

export const OPCIONES_BARRERAS = [
  { etiqueta: 'Muy probable',    valor: 3 },
  { etiqueta: 'Algo probable',   valor: 2 },
  { etiqueta: 'Algo improbable', valor: 1 },
  { etiqueta: 'Muy poco probable', valor: 0 },
];

/** Crea el estado inicial vacío del cuestionario.
 * @returns {{respuestas: Object}} estado sin respuestas. */
export function estadoBarrerasInicial() {
  return { respuestas: {} };
}

/** Determina los ítems sin una respuesta válida (entero 0-3).
 * @param {Object<string, number>} [respuestas] - respuestas indexadas por id de ítem.
 * @returns {Array<Object>} ítems pendientes de responder. */
export function faltantesBarreras(respuestas = {}) {
  return ITEMS_BARRERAS.filter(it => {
    const v = respuestas[it.id];
    return !(Number.isInteger(v) && v >= 0 && v <= 3);
  });
}

/** Calcula el puntaje por dimensión y las barreras significativas.
 * @param {Object<string, number>} [respuestas] - respuestas indexadas por id de ítem.
 * @returns {{dimensiones: Object<string, number>, significativas: string[]}|null} resultado, o null si el cuestionario está incompleto. */
export function calcularBarreras(respuestas = {}) {
  if (faltantesBarreras(respuestas).length > 0) return null;
  const dimensiones = {};
  for (const [id, dim] of Object.entries(DIMENSIONES_BARRERAS)) {
    dimensiones[id] = dim.items.reduce((a, n) => a + respuestas[String(n)], 0);
  }
  const significativas = Object.entries(dimensiones)
    .filter(([, puntaje]) => puntaje >= UMBRAL_BARRERA)
    .map(([id]) => id);
  return { dimensiones, significativas };
}
