/* borrador.js — guarda el análisis en curso en localStorage para que un
   refresco (F5) no pierda el trabajo. Contiene datos de salud (PAR-Q+),
   por eso: clave por usuario, caducidad de 7 días, se borra al cerrar
   sesión o al iniciar un análisis nuevo, y todo va en try/catch. */
import { estadoAnalisisInicial } from '../logic/modelo.js';

const PREFIJO = 'pp_borrador_v1:';
const SESION_INVITADO = 'pp_modo_invitado';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASO_MAX_VALIDO = 13;

const clave = id => PREFIJO + (id ?? 'invitado');

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

export function guardarBorrador(usuarioId, { analisis, paso, pasoMax, analisisGuardado }, ahora = Date.now()) {
  try {
    localStorage.setItem(clave(usuarioId), JSON.stringify({ v: 1, ts: ahora, analisis, paso, pasoMax, analisisGuardado: !!analisisGuardado }));
  } catch { /* almacenamiento lleno o bloqueado: se ignora */ }
}

export function borrarBorrador(usuarioId) {
  try { localStorage.removeItem(clave(usuarioId)); } catch { /* noop */ }
}

/* El modo invitado vive en sessionStorage: sobrevive al refresco pero no
   a cerrar la pestaña. */
export function leerModoInvitado() {
  try { return sessionStorage.getItem(SESION_INVITADO) === '1'; } catch { return false; }
}
export function guardarModoInvitado(activo) {
  try {
    if (activo) sessionStorage.setItem(SESION_INVITADO, '1');
    else sessionStorage.removeItem(SESION_INVITADO);
  } catch { /* noop */ }
}
