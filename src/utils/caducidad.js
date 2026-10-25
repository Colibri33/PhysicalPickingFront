/**
 * @module utils/caducidad
 * @description Caducidad del historial del modo invitado: cuánto dura un registro en el navegador y cuántos días le quedan.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la regla de caducidad; no lee ni escribe almacenamiento.
 *  - D (Inversión de dependencias): authService aplica estas funciones al almacenamiento; la pantalla solo consulta los días restantes.
 * Notas: el historial de invitado guarda datos de salud en el navegador, por eso no se conserva indefinidamente. El instante de guardado es
 * `guardadoEn`; los registros guardados antes de esta regla usan su `id`, que es la marca de tiempo de creación (Date.now()). Un registro sin
 * un instante válido se considera caducado, para no retener datos que no se pueden fechar.
 */

/** Días que dura un registro del historial de invitado. */
export const DIAS_CADUCIDAD_INVITADO = 5;

const DIA_MS = 24 * 60 * 60 * 1000;

/** Obtiene el instante en que se guardó un registro.
 * @param {Object} registro - registro del historial.
 * @returns {number|null} milisegundos desde 1970, o null si no hay un instante válido. */
export function instanteGuardado(registro) {
  const t = Number(registro?.guardadoEn ?? registro?.id);
  return Number.isFinite(t) && t > 1e12 ? t : null;
}

/** Indica si un registro ya superó su plazo.
 * @param {Object} registro - registro del historial.
 * @param {number} [ahora] - instante actual en ms.
 * @returns {boolean} true si caducó o no se puede fechar. */
export function haCaducado(registro, ahora = Date.now()) {
  const t = instanteGuardado(registro);
  return t === null || ahora - t >= DIAS_CADUCIDAD_INVITADO * DIA_MS;
}

/** Conserva solo los registros vigentes.
 * @param {Object[]} registros - historial leído del almacenamiento.
 * @param {number} [ahora] - instante actual en ms.
 * @returns {Object[]} registros que no han caducado, en el mismo orden. */
export function purgarCaducados(registros, ahora = Date.now()) {
  return (Array.isArray(registros) ? registros : []).filter(r => !haCaducado(r, ahora));
}

/** Días que le quedan a un registro, redondeados hacia arriba.
 * @param {Object} registro - registro del historial.
 * @param {number} [ahora] - instante actual en ms.
 * @returns {number|null} días restantes (1 a 5); null si no se puede fechar. */
export function diasRestantes(registro, ahora = Date.now()) {
  const t = instanteGuardado(registro);
  if (t === null) return null;
  return Math.max(1, Math.ceil(DIAS_CADUCIDAD_INVITADO - (ahora - t) / DIA_MS));
}

/** Texto corto del plazo restante.
 * @param {Object} registro - registro del historial.
 * @param {number} [ahora] - instante actual en ms.
 * @returns {string} por ejemplo "Se borra en 3 días" o "Se borra hoy". */
export function textoCaducidad(registro, ahora = Date.now()) {
  const d = diasRestantes(registro, ahora);
  if (d === null) return '';
  return d <= 1 ? 'Se borra hoy' : `Se borra en ${d} días`;
}
