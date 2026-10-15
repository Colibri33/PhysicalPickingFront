/* ═══════════════════════════════════════════════════════════════
   PhysicalPicking · auth/authService.js  (v7 — backend real)
   Autenticación con Supabase Auth (contraseñas con hash bcrypt,
   gestionadas por Supabase — nunca en texto plano) + API propia
   para consentimiento Habeas Data, resultados cifrados y derechos
   ARCO.

   Se conserva la misma interfaz pública que usaba la versión de
   prototipo (registrar, login, logout, obtenerSesionActual,
   guardarRegistroHistorial, leerHistorial, limpiarHistorialInvitado)
   para no tener que reescribir todos los componentes — pero ahora
   son funciones ASÍNCRONAS (devuelven promesas), porque hablan con
   una red real. Los componentes que las llaman deben usar
   await / then (ver PantallaAuth.jsx, App.jsx, AnalizadorWizard.jsx).
   ═══════════════════════════════════════════════════════════════ */

import { supabase, API_URL } from '../supabaseClient';
import { migrarRegistroLegado } from '../logic/registroLegado';

const STORAGE_HISTORIAL_INVITADO = 'physicalpicking_historial_invitado';

/* ─── helper: llamadas autenticadas al backend propio ─── */
async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Error de red.');
  return body;
}

/* ─── API pública ─── */

/**
 * registrar — crea una cuenta nueva en Supabase Auth.
 * El consentimiento de Habeas Data se registra por separado con
 * `registrarConsentimiento`, normalmente justo después de esto,
 * antes de dejar entrar al usuario al wizard.
 */
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
  });

  if (error) return { ok: false, error: traducirErrorSupabase(error) };
  return { ok: true, usuario: mapearUsuario(data.user, nombre) };
}

/**
 * login — autentica con email + password contra Supabase Auth.
 */
export async function login(email, password) {
  if (!email.trim() || !password.trim()) {
    return { ok: false, error: 'Ingresa email y contrasena.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) return { ok: false, error: traducirErrorSupabase(error) };
  const nombre = data.user.user_metadata?.nombre || data.user.email;
  return { ok: true, usuario: mapearUsuario(data.user, nombre) };
}

/**
 * logout — cierra la sesión activa.
 */
export async function logout() {
  await supabase.auth.signOut();
}

/**
 * solicitarRecuperacionContrasena — inicia el flujo oficial de
 * Supabase Auth para restablecer contraseña (no se implementa
 * criptografia propia). Supabase envia un correo con un enlace que
 * redirige de vuelta a PhysicalPicking (ver VITE_SITE_URL) a la
 * pantalla de "nueva contraseña".
 *
 * Por diseño, siempre devuelve el mismo mensaje de exito exista o no
 * el correo en el sistema, para no revelar si un email esta
 * registrado (evita enumeracion de usuarios) — Supabase ya se
 * comporta asi por defecto: no distingue el error en la respuesta.
 */
export async function solicitarRecuperacionContrasena(email) {
  const correo = (email || '').trim().toLowerCase();
  if (!correo) return { ok: false, error: 'Ingresa tu correo electronico.' };

  const redirectTo = `${window.location.origin}/?vista=nueva-contrasena`;
  const { error } = await supabase.auth.resetPasswordForEmail(correo, { redirectTo });

  // No exponemos el error real de Supabase (podria filtrar si el
  // correo existe); solo distinguimos errores de red/servicio.
  if (error && error.status && error.status >= 500) {
    return { ok: false, error: 'No se pudo enviar el correo de recuperacion. Intenta de nuevo en unos minutos.' };
  }
  return { ok: true, mensaje: 'Si el correo esta registrado, recibiras un enlace para restablecer tu contraseña.' };
}

/**
 * actualizarContrasena — establece una nueva contraseña, usada tras
 * abrir el enlace de recuperacion (Supabase ya deja al usuario en
 * una sesion de recuperacion valida en ese momento).
 */
export async function actualizarContrasena(nuevaContrasena, confirmarContrasena) {
  if (!nuevaContrasena || nuevaContrasena.length < 6) {
    return { ok: false, error: 'La contrasena debe tener al menos 6 caracteres.' };
  }
  if (nuevaContrasena !== confirmarContrasena) {
    return { ok: false, error: 'Las contrasenas no coinciden.' };
  }
  const { error } = await supabase.auth.updateUser({ password: nuevaContrasena });
  if (error) return { ok: false, error: traducirErrorSupabase(error) };
  return { ok: true };
}

/**
 * obtenerSesionActual — recupera el usuario de la sesión guardada
 * (Supabase persiste el refresh token de forma segura en el propio
 * navegador y lo renueva automáticamente).
 */
export async function obtenerSesionActual() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const nombre = session.user.user_metadata?.nombre || session.user.email;
  return mapearUsuario(session.user, nombre);
}

/**
 * registrarConsentimiento — guarda la autorización de tratamiento
 * de datos personales del propio participante adulto (obligatorio
 * antes de poder guardar resultados). PhysicalPicking es exclusivo
 * para adultos de 18 a 30 años: no existe autorización de terceros
 * (padre/madre/acudiente).
 */
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

export async function tieneConsentimientoVigente() {
  try {
    const { consentimiento } = await apiFetch('/consentimiento/vigente');
    return !!consentimiento;
  } catch {
    return false;
  }
}

/**
 * actualizarRegistroHistorial — corrige los datos de identificacion
 * de un registro ya guardado (nombre, edad, genero, perfil,
 * deporte). El `payload` completo se reenvia porque el backend
 * vuelve a cifrar todo el registro; los resultados de las pruebas
 * (fisicas/antropometricas/consolidado/ranking) NO se recalculan aqui
 * porque esos campos de identificacion no participan en el motor de
 * calculo (confirmado en logic/modelo.js) — no hay riesgo de que el
 * historial quede con datos que no correspondan al calculo.
 */
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

/**
 * descargarInformePdf — pide al backend el PDF profesional del
 * informe (autenticado: por id de registro ya guardado; invitado:
 * enviando el payload directo, ya que nunca se guarda cifrado en
 * Supabase). Devuelve el Blob para que el componente dispare la
 * descarga en el navegador.
 */
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

/**
 * guardarRegistroHistorial — agrega un registro al historial del
 * usuario. Si usuarioId es null (invitado), lo guarda solo en este
 * navegador, tal como en el prototipo original — el modo invitado
 * nunca toca el backend ni la base de datos.
 */
export async function guardarRegistroHistorial(usuarioId, registro) {
  if (usuarioId === null) {
    try {
      const prev = JSON.parse(localStorage.getItem(STORAGE_HISTORIAL_INVITADO) || '[]');
      prev.unshift(registro);
      localStorage.setItem(STORAGE_HISTORIAL_INVITADO, JSON.stringify(prev));
    } catch { /* sin acceso a storage — ignorar */ }
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

/**
 * leerHistorial — devuelve el historial según modo.
 */
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

/**
 * limpiarHistorialInvitado — borra el historial temporal del modo invitado.
 */
export function limpiarHistorialInvitado() {
  localStorage.removeItem(STORAGE_HISTORIAL_INVITADO);
}

/**
 * exportarMisDatos — derecho de ACCESO (ARCO): obtiene todo lo
 * que tenemos del usuario. El front lo presenta como PDF legible.
 */
export async function exportarMisDatos() {
  return apiFetch('/arco/exportar');
}

/**
 * eliminarCuenta — derecho de SUPRESIÓN (ARCO): borra la cuenta y
 * todos los datos asociados, sin posibilidad de recuperación.
 */
export async function eliminarCuenta() {
  await apiFetch('/arco/cuenta', { method: 'DELETE' });
  await logout();
}

/* ─── helpers internos ─── */

function mapearUsuario(usuarioSupabase, nombre) {
  return { id: usuarioSupabase.id, nombre, email: usuarioSupabase.email };
}

function traducirErrorSupabase(error) {
  const msg = error.message || '';
  if (msg.includes('already registered')) return 'Ya existe una cuenta con ese email.';
  if (msg.includes('Invalid login credentials')) return 'Email o contrasena incorrectos.';
  if (msg.includes('Password should be')) return 'La contrasena no cumple los requisitos minimos.';
  return msg || 'Ocurrio un error inesperado.';
}
