/**
 * @module auth/authService
 * @description Servicio de autenticación (Supabase Auth), consentimiento Habeas Data, historial de resultados y derechos ARCO.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el acceso a identidad, consentimiento e historial del usuario.
 *  - D (Inversión de dependencias): depende del cliente `supabase` y de `API_URL` (supabaseClient), de migrarRegistroLegado y de errorRedAmigable, no de implementaciones de red propias.
 * Notas: las contraseñas las gestiona Supabase con hash bcrypt, nunca en texto plano. Las funciones son asíncronas y los componentes
 * que las invocan deben usar await o then. Usuario invitado (usuarioId === null): el historial vive solo en localStorage y nunca toca el backend.
 */

import { supabase, API_URL } from '../supabaseClient';
import { migrarRegistroLegado } from '../logic/registroLegado';
import { errorRedAmigable } from '../utils/red';

const STORAGE_HISTORIAL_INVITADO = 'physicalpicking_historial_invitado';

/* Tiempo máximo de espera del backend. En un celular el backend requiere URL pública: con localhost el fetch falla de inmediato y errorRedAmigable lo explica. */
const API_TIMEOUT_MS = 12000;

/** Realiza una llamada autenticada al backend propio con tiempo máximo de espera.
 * @param {string} path - ruta del backend.
 * @param {RequestInit} [options] - opciones de fetch; se combinan con las cabeceras de autenticación.
 * @returns {Promise<Object>} cuerpo JSON de la respuesta.
 * @throws {Error} con mensaje legible si falla la red o el servidor responde con error. */
async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const controlador = new AbortController();
  const id = setTimeout(() => controlador.abort(), API_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controlador.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (e) {
    throw new Error(errorRedAmigable(e));
  } finally {
    clearTimeout(id);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Error de red.');
  return body;
}

/** Crea una cuenta en Supabase Auth. El consentimiento Habeas Data se registra por separado con registrarConsentimiento, antes de entrar al wizard.
 * @param {string} nombre - nombre de la persona.
 * @param {string} email - correo electrónico.
 * @param {string} password - contraseña (mínimo 6 caracteres).
 * @returns {Promise<{ok: boolean, usuario?: Object, error?: string}>} resultado del registro. */
export async function registrar(nombre, email, password) {
  if (!nombre.trim() || !email.trim() || !password.trim()) {
    return { ok: false, error: 'Todos los campos son obligatorios.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'La contrasena debe tener al menos 6 caracteres.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { nombre: nombre.trim() } },
  }).catch(e => ({ data: null, error: e }));

  if (error) {
    if (error instanceof TypeError || error.name === 'AbortError') {
      return { ok: false, error: errorRedAmigable(error) };
    }
    return { ok: false, error: traducirErrorSupabase(error) };
  }
  return { ok: true, usuario: mapearUsuario(data.user, nombre) };
}

/** Autentica con correo y contraseña contra Supabase Auth.
 * @param {string} email - correo electrónico.
 * @param {string} password - contraseña.
 * @returns {Promise<{ok: boolean, usuario?: Object, error?: string}>} resultado del inicio de sesión. */
export async function login(email, password) {
  if (!email.trim() || !password.trim()) {
    return { ok: false, error: 'Ingresa email y contrasena.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  }).catch(e => ({ data: null, error: e }));

  if (error) {
    if (error instanceof TypeError || error.name === 'AbortError') {
      return { ok: false, error: errorRedAmigable(error) };
    }
    return { ok: false, error: traducirErrorSupabase(error) };
  }
  const nombre = data.user.user_metadata?.nombre || data.user.email;
  return { ok: true, usuario: mapearUsuario(data.user, nombre) };
}

/** Cierra la sesión activa.
 * @returns {Promise<void>} */
export async function logout() {
  await supabase.auth.signOut();
}

/** Inicia el flujo oficial de Supabase para restablecer la contraseña.
 * Devuelve siempre el mismo mensaje de éxito exista o no el correo, para evitar la enumeración de usuarios.
 * @param {string} email - correo de la cuenta.
 * @returns {Promise<{ok: boolean, mensaje?: string, error?: string}>} resultado de la solicitud. */
export async function solicitarRecuperacionContrasena(email) {
  const correo = (email || '').trim().toLowerCase();
  if (!correo) return { ok: false, error: 'Ingresa tu correo electronico.' };

  const redirectTo = `${window.location.origin}/?vista=nueva-contrasena`;
  const { error } = await supabase.auth.resetPasswordForEmail(correo, { redirectTo })
    .catch(e => ({ error: e }));

  if (error && (error instanceof TypeError || error.name === 'AbortError')) {
    return { ok: false, error: errorRedAmigable(error) };
  }
  // Seguridad: no se expone el error real de Supabase, pues podría revelar si el correo existe; solo se distinguen fallos de servicio.
  if (error && error.status && error.status >= 500) {
    return { ok: false, error: 'No se pudo enviar el correo de recuperacion. Intenta de nuevo en unos minutos.' };
  }
  return { ok: true, mensaje: 'Si el correo esta registrado, recibiras un enlace para restablecer tu contraseña.' };
}

/** Establece una nueva contraseña desde la sesión de recuperación que Supabase abre con el enlace del correo.
 * @param {string} nuevaContrasena - contraseña nueva (mínimo 6 caracteres).
 * @param {string} confirmarContrasena - confirmación; debe coincidir.
 * @returns {Promise<{ok: boolean, error?: string}>} resultado de la actualización. */
export async function actualizarContrasena(nuevaContrasena, confirmarContrasena) {
  if (!nuevaContrasena || nuevaContrasena.length < 6) {
    return { ok: false, error: 'La contrasena debe tener al menos 6 caracteres.' };
  }
  if (nuevaContrasena !== confirmarContrasena) {
    return { ok: false, error: 'Las contrasenas no coinciden.' };
  }
  const { error } = await supabase.auth.updateUser({ password: nuevaContrasena })
    .catch(e => ({ error: e }));
  if (error) {
    if (error instanceof TypeError || error.name === 'AbortError') {
      return { ok: false, error: errorRedAmigable(error) };
    }
    return { ok: false, error: traducirErrorSupabase(error) };
  }
  return { ok: true };
}

/** Recupera el usuario de la sesión persistida (Supabase renueva el token automáticamente).
 * @returns {Promise<{id: string, nombre: string, email: string}|null>} usuario o null si no hay sesión. */
export async function obtenerSesionActual() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const nombre = session.user.user_metadata?.nombre || session.user.email;
  return mapearUsuario(session.user, nombre);
}

/** Registra la autorización de tratamiento de datos del propio participante adulto, requisito para guardar resultados.
 * La aplicación es exclusiva para adultos de 18 a 30 años; no existe autorización de terceros.
 * @returns {Promise<{ok: boolean, error?: string}>} resultado del registro. */
export async function registrarConsentimiento() {
  try {
    await apiFetch('/consentimiento', {
      method: 'POST',
      body: JSON.stringify({
        aceptoTratamiento: true,
        aceptoDatosSensibles: true,
      }),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Consulta si el usuario tiene un consentimiento vigente.
 * @returns {Promise<boolean>} true si existe; false también ante cualquier error. */
export async function tieneConsentimientoVigente() {
  try {
    const { consentimiento } = await apiFetch('/consentimiento/vigente');
    return !!consentimiento;
  } catch {
    return false;
  }
}

/** Corrige los datos de identificación de un registro guardado (nombre, edad, género, perfil, deporte).
 * Se reenvía el payload completo porque el backend vuelve a cifrar todo el registro. No se recalculan resultados,
 * pues esos campos no participan en el motor de cálculo (ver src/evaluacion).
 * @param {string|null} usuarioId - id del usuario; null para invitado.
 * @param {string} id - id del registro.
 * @param {Object} registroActualizado - registro con los datos corregidos.
 * @returns {Promise<{ok: boolean, resultado?: Object, error?: string}>} resultado de la actualización. */
export async function actualizarRegistroHistorial(usuarioId, id, registroActualizado) {
  if (usuarioId === null) {
    try {
      const prev = JSON.parse(localStorage.getItem(STORAGE_HISTORIAL_INVITADO) || '[]');
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return { ok: false, error: 'Registro no encontrado.' };
      prev[idx] = registroActualizado;
      localStorage.setItem(STORAGE_HISTORIAL_INVITADO, JSON.stringify(prev));
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo actualizar el registro local.' };
    }
  }

  try {
    const { resultado } = await apiFetch(`/resultados/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        participante: registroActualizado.participante,
        payload: registroActualizado,
      }),
    });
    return { ok: true, resultado };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Obtiene el PDF del informe: por id si el registro está guardado, o enviando el payload directo en modo invitado (que nunca se guarda cifrado).
 * @param {string|null} usuarioId - id del usuario; null para invitado.
 * @param {Object} registro - registro del historial.
 * @returns {Promise<Blob>} PDF para que el componente dispare la descarga.
 * @throws {Error} si el backend no puede generar el PDF. */
export async function descargarInformePdf(usuarioId, registro) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const esRegistroGuardado = usuarioId !== null && typeof registro.id === 'string';
  const url = esRegistroGuardado
    ? `${API_URL}/resultados/${registro.id}/pdf`
    : `${API_URL}/resultados/pdf`;

  const opciones = esRegistroGuardado
    ? { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {} }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participante: registro.participante, payload: registro }),
      };

  const res = await fetch(url, opciones);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'No se pudo generar el PDF.');
  }
  return res.blob();
}

/** Agrega un registro al historial; en modo invitado lo guarda solo en este navegador.
 * @param {string|null} usuarioId - id del usuario; null para invitado.
 * @param {Object} registro - registro a guardar.
 * @returns {Promise<{ok: boolean, resultado?: Object, error?: string}>} resultado del guardado. */
export async function guardarRegistroHistorial(usuarioId, registro) {
  if (usuarioId === null) {
    try {
      const prev = JSON.parse(localStorage.getItem(STORAGE_HISTORIAL_INVITADO) || '[]');
      prev.unshift(registro);
      localStorage.setItem(STORAGE_HISTORIAL_INVITADO, JSON.stringify(prev));
    } catch { /* almacenamiento no disponible: se ignora */ }
    return { ok: true };
  }

  try {
    const { resultado } = await apiFetch('/resultados', {
      method: 'POST',
      body: JSON.stringify({
        participante: registro.participante,
        payload: registro,
      }),
    });
    return { ok: true, resultado };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Lee el historial del usuario y migra los registros legados al formato vigente.
 * @param {string|null} usuarioId - id del usuario; null para invitado.
 * @returns {Promise<Array<Object>>} historial; vacío ante cualquier error. */
export async function leerHistorial(usuarioId) {
  if (usuarioId === null) {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_HISTORIAL_INVITADO) || '[]').map(migrarRegistroLegado);
    } catch {
      return [];
    }
  }

  try {
    const { historial } = await apiFetch('/resultados');
    return historial.map(migrarRegistroLegado);
  } catch {
    return [];
  }
}

/** Borra el historial temporal del modo invitado.
 * @returns {void} */
export function limpiarHistorialInvitado() {
  localStorage.removeItem(STORAGE_HISTORIAL_INVITADO);
}

/** Ejerce el derecho de acceso (ARCO): obtiene todos los datos del usuario, que el frontend presenta como PDF.
 * @returns {Promise<Object>} datos exportados por el backend. */
export async function exportarMisDatos() {
  return apiFetch('/arco/exportar');
}

/** Ejerce el derecho de supresión (ARCO): borra la cuenta y sus datos asociados de forma irreversible y cierra la sesión.
 * @returns {Promise<void>} */
export async function eliminarCuenta() {
  await apiFetch('/arco/cuenta', { method: 'DELETE' });
  await logout();
}

/** Proyecta el usuario de Supabase al modelo interno.
 * @param {Object} usuarioSupabase - usuario devuelto por Supabase.
 * @param {string} nombre - nombre a mostrar.
 * @returns {{id: string, nombre: string, email: string}} usuario interno. */
function mapearUsuario(usuarioSupabase, nombre) {
  return { id: usuarioSupabase.id, nombre, email: usuarioSupabase.email };
}

/** Traduce errores de Supabase a mensajes en español.
 * @param {Error} error - error devuelto por Supabase.
 * @returns {string} mensaje para la persona usuaria. */
function traducirErrorSupabase(error) {
  const msg = error.message || '';
  // Supabase a veces devuelve el fallo de red como un error ordinario.
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) {
    return errorRedAmigable(error);
  }
  if (msg.includes('already registered')) return 'Ya existe una cuenta con ese email.';
  if (msg.includes('Invalid login credentials')) return 'Email o contrasena incorrectos.';
  if (msg.includes('Password should be')) return 'La contrasena no cumple los requisitos minimos.';
  return msg || 'Ocurrio un error inesperado.';
}
