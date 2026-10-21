/**
 * @module logic/breq
 * @description Ítems, subescalas y puntuación del BREQ-3 (regulación conductual del ejercicio), con índice RAI.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la definición o el cálculo del BREQ-3.
 *  - O (Abierto/Cerrado): subescalas y pesos RAI son datos; se ajustan sin modificar el cálculo.
 * Notas: Wilson, Rodgers, Loitz y Scime (2006); versión española de González-Cutre, Sicilia y Fernández (2010).
 * 23 ítems, escala 0-4; promedios por subescala. Los pesos del RAI son los estándar de la literatura; verificar en uso formal.
 */

export const ITEMS_BREQ = [
  { id: '1',  texto: 'Porque los demás me dicen que debo hacerlo' },
  { id: '2',  texto: 'Porque me siento culpable cuando no lo practico' },
  { id: '3',  texto: 'Porque valoro los beneficios que tiene el ejercicio físico' },
  { id: '4',  texto: 'Porque creo que el ejercicio es divertido' },
  { id: '5',  texto: 'Porque está de acuerdo con mi forma de vida' },
  { id: '6',  texto: 'No veo por qué tengo que hacerlo' },
  { id: '7',  texto: 'Porque mis amigos/familia/pareja me dicen que debo hacerlo' },
  { id: '8',  texto: 'Porque me siento avergonzado si falto a la sesión' },
  { id: '9',  texto: 'Porque para mí es importante hacer ejercicio regularmente' },
  { id: '10', texto: 'Porque considero que el ejercicio físico forma parte de mí' },
  { id: '11', texto: 'No veo por qué tengo que molestarme en hacer ejercicio' },
  { id: '12', texto: 'Porque disfruto con las sesiones de ejercicio' },
  { id: '13', texto: 'Porque otras personas no estarán contentas conmigo si no hago ejercicio' },
  { id: '14', texto: 'No veo el sentido de hacer ejercicio' },
  { id: '15', texto: 'Porque veo el ejercicio físico como una parte fundamental de lo que soy' },
  { id: '16', texto: 'Porque siento que he fallado cuando no he realizado un rato de ejercicio' },
  { id: '17', texto: 'Porque pienso que es importante hacer el esfuerzo de ejercitarse regularmente' },
  { id: '18', texto: 'Porque encuentro el ejercicio una actividad agradable' },
  { id: '19', texto: 'Porque me siento bajo la presión de mis amigos/familia para realizar ejercicio' },
  { id: '20', texto: 'Porque considero que el ejercicio físico está de acuerdo con mis valores' },
  { id: '21', texto: 'Porque me pongo nervioso si no hago ejercicio regularmente' },
  { id: '22', texto: 'Porque me resulta placentero y satisfactorio el hacer ejercicio' },
  { id: '23', texto: 'Pienso que hacer ejercicio es una pérdida de tiempo' },
];

export const SUBESCALAS_BREQ = {
  desmotivacion: [6, 11, 14, 23],
  externa:       [1, 7, 13, 19],
  introyectada:  [2, 8, 16, 21],
  identificada:  [3, 9, 17],
  integrada:     [5, 10, 15, 20],
  intrinseca:    [4, 12, 18, 22],
};

export const NOMBRES_SUBESCALAS = {
  desmotivacion: 'Desmotivación',
  externa:       'Regulación externa',
  introyectada:  'Regulación introyectada',
  identificada:  'Regulación identificada',
  integrada:     'Regulación integrada',
  intrinseca:    'Regulación intrínseca',
};

export const PESOS_RAI = {
  desmotivacion: -3,
  externa:       -2,
  introyectada:  -1,
  identificada:  1,
  integrada:     2,
  intrinseca:    3,
};

/** Crea el estado inicial vacío del cuestionario.
 * @returns {{respuestas: Object}} estado sin respuestas. */
export function estadoBreqInicial() {
  return { respuestas: {} };
}

/** Redondea a dos decimales.
 * @param {number} n - valor a redondear.
 * @returns {number} valor redondeado. */
function redondear2(n) {
  return Math.round(n * 100) / 100;
}

/** Determina los ítems sin una respuesta válida (entero 0-4).
 * @param {Object<string, number>} [respuestas] - respuestas indexadas por id de ítem.
 * @returns {Array<Object>} ítems pendientes. */
export function faltantesBreq(respuestas = {}) {
  return ITEMS_BREQ.filter(it => {
    const v = respuestas[it.id];
    return !(Number.isInteger(v) && v >= 0 && v <= 4);
  });
}

/** Calcula el promedio por subescala y el índice de autodeterminación relativa (RAI).
 * @param {Object<string, number>} [respuestas] - respuestas indexadas por id de ítem.
 * @returns {{subescalas: Object<string, number>, rai: number}|null} resultado, o null si hay ítems sin responder. */
export function calcularBreq(respuestas = {}) {
  if (faltantesBreq(respuestas).length > 0) return null;
  const subescalas = {};
  for (const [nombre, items] of Object.entries(SUBESCALAS_BREQ)) {
    const suma = items.reduce((a, n) => a + respuestas[String(n)], 0);
    subescalas[nombre] = redondear2(suma / items.length);
  }
  const rai = redondear2(
    Object.entries(subescalas).reduce((a, [nombre, prom]) => a + PESOS_RAI[nombre] * prom, 0)
  );
  return { subescalas, rai };
}
