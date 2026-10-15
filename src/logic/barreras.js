/* logic/barreras.js — BBAQ-21 (Barriers to Being Active Quiz, 21 items).
   7 dimensiones x 3 items, puntaje 0-9 por dimension.
   Barrera significativa: >= 5 puntos.
   Asignacion item→dimension y umbral segun cuestionario CDC de 21 items; confirmar con fuente academica. */

export const ITEMS_BARRERAS = [
  { id: '1',  texto: 'Mi día es tan ocupado ahora que no creo que pueda apartar tiempo para hacer actividad física en mi horario normal.' },
  { id: '2',  texto: 'A ninguno de mis familiares o amigos les gusta hacer actividad física, así que no tengo oportunidad de hacer ejercicio.' },
  { id: '3',  texto: 'Estoy muy cansado después del trabajo como para hacer ejercicio.' },
  { id: '4',  texto: 'He estado pensando en hacer ejercicio, pero no he sido capaz de dar el primer paso.' },
  { id: '5',  texto: 'Hacer ejercicio puede ser riesgoso a mi edad.' },
  { id: '6',  texto: 'No hago suficiente ejercicio porque nunca he aprendido ningún deporte.' },
  { id: '7',  texto: 'No tengo acceso a caminos para trotar, piscinas, senderos para bicicleta, etc.' },
  { id: '8',  texto: 'Hacer actividad física me quita mucho tiempo de las otras obligaciones que tengo como mi trabajo, familia, horario, etc.' },
  { id: '9',  texto: 'Me da pena cómo me voy a ver cuando haga ejercicio en frente de otras personas.' },
  { id: '10', texto: 'Yo ni siquiera duermo lo suficiente. No me podría levantar más temprano ni acostarme más tarde para hacer ejercicio.' },
  { id: '11', texto: 'Es más fácil para mí encontrar excusas para no hacer ejercicio que ponerme a hacerlo.' },
  { id: '12', texto: 'Conozco muchas personas que se han lastimado porque se han esforzado demasiado al hacer ejercicio.' },
  { id: '13', texto: 'Realmente, no me veo aprendiendo un nuevo deporte a mi edad.' },
  { id: '14', texto: 'Es simplemente muy costoso. Uno tiene que tomar una clase, inscribirse en un club o comprar el equipo adecuado.' },
  { id: '15', texto: 'Tengo muy poco tiempo libre durante el día para hacer ejercicio.' },
  { id: '16', texto: 'Mis actividades sociales habituales con mis familiares y amigos no incluyen la actividad física.' },
  { id: '17', texto: 'Estoy muy cansado durante la semana y necesito descansar durante el fin de semana para recuperarme.' },
  { id: '18', texto: 'Quiero hacer más ejercicio, pero parece que no puedo mantenerme motivado para seguir haciéndolo.' },
  { id: '19', texto: 'Me da miedo lesionarme o que me dé un ataque al corazón.' },
  { id: '20', texto: 'No soy lo suficientemente bueno en ninguna actividad física como para entretenerme.' },
  { id: '21', texto: 'Si hubiese un lugar para hacer ejercicio y duchas en el trabajo, tendría más probabilidad de hacer ejercicio.' },
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

export function estadoBarrerasInicial() {
  return { respuestas: {} };
}

export function faltantesBarreras(respuestas = {}) {
  return ITEMS_BARRERAS.filter(it => {
    const v = respuestas[it.id];
    return !(Number.isInteger(v) && v >= 0 && v <= 3);
  });
}

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
