/**
 * @module utils/borrador
 * @description Persiste el análisis en curso y el modo invitado en el almacenamiento del navegador para sobrevivir a un refresco.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la política de persistencia local del borrador.
 *  - D (Inversión de dependencias): el estado base proviene de estadoAnalisisInicial (logic/modelo); el almacenamiento se accede solo mediante estas funciones.
 * Notas: contiene datos de salud (PAR-Q+); por ello usa clave por usuario, caduca a los 7 días, se borra al cerrar sesión o iniciar un análisis nuevo y toda operación va en try/catch.
 */

import { estadoAnalisisInicial } from '../logic/modelo.js';

const PREFIJO = 'pp_borrador_v1:';
const SESION_INVITADO = 'pp_modo_invitado';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASO_MAX_VALIDO = 13;

const clave = id => PREFIJO + (id ?? 'invitado');

/** Lee y sanea el borrador del usuario; lo elimina si caducó o es inválido.
 * @param {string|null} usuarioId - id del usuario (null para invitado).
 * @param {number} [ahora] - marca de tiempo actual en ms.
 * @returns {{analisis: Object, paso: number, pasoMax: number, analisisGuardado: boolean}|null} borrador vigente o null. */
export function leerBorrador(usuarioId, ahora = Date.now()) {
  try {
    const raw = localStorage.getItem(clave(usuarioId));
    if (!raw) return null;
    const b = JSON.parse(raw);
    if (!b || typeof b !== 'object' || typeof b.ts !== 'number' || ahora - b.ts > TTL_MS) {
      localStorage.removeItem(clave(usuarioId));
      return null;
    }
    const base = estadoAnalisisInicial();
    const analisis = { ...base, ...(b.analisis && typeof b.analisis === 'object' ? b.analisis : {}) };
    const num = (n, d) => (Number.isInteger(n) && n >= 1 && n <= PASO_MAX_VALIDO ? n : d);
    const pasoMax = num(b.pasoMax, 1);
    const paso = Math.min(num(b.paso, 1), pasoMax);
    return { analisis, paso, pasoMax, analisisGuardado: b.analisisGuardado === true };
  } catch {
    return null;
  }
}

/** Guarda el borrador del análisis en localStorage.
 * @param {string|null} usuarioId - id del usuario (null para invitado).
 * @param {{analisis: Object, paso: number, pasoMax: number, analisisGuardado: boolean}} datos - estado a persistir.
 * @param {number} [ahora] - marca de tiempo actual en ms.
 * @returns {void} */
export function guardarBorrador(usuarioId, { analisis, paso, pasoMax, analisisGuardado }, ahora = Date.now()) {
  try {
    localStorage.setItem(clave(usuarioId), JSON.stringify({ v: 1, ts: ahora, analisis, paso, pasoMax, analisisGuardado: !!analisisGuardado }));
  } catch { /* almacenamiento lleno o bloqueado: se ignora */ }
}

/** Elimina el borrador del usuario.
 * @param {string|null} usuarioId - id del usuario (null para invitado).
 * @returns {void} */
export function borrarBorrador(usuarioId) {
  try { localStorage.removeItem(clave(usuarioId)); } catch { /* noop */ }
}

/** Indica si el modo invitado está activo; usa sessionStorage, por lo que sobrevive al refresco pero no al cierre de la pestaña.
 * @returns {boolean} true si está activo. */
export function leerModoInvitado() {
  try { return sessionStorage.getItem(SESION_INVITADO) === '1'; } catch { return false; }
}
/** Activa o desactiva el modo invitado en sessionStorage.
 * @param {boolean} activo - nuevo estado.
 * @returns {void} */
export function guardarModoInvitado(activo) {
  try {
    if (activo) sessionStorage.setItem(SESION_INVITADO, '1');
    else sessionStorage.removeItem(SESION_INVITADO);
  } catch { /* noop */ }
}
