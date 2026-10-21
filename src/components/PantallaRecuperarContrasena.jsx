/**
 * @module components/PantallaRecuperarContrasena
 * @description Flujo de recuperación de contraseña: solicitud por correo y restablecimiento.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): formularios de recuperación de contraseña.
 *  - D (Inversión de dependencias): delega en authService (Supabase Auth); sin criptografía propia.
 * Notas: modo 'solicitar' envía el correo; modo 'restablecer' (desde el enlace del correo) pide la nueva contraseña y su confirmación.
 */
import { useState } from 'react';
import Icono from './Icono';
import { solicitarRecuperacionContrasena, actualizarContrasena } from '../auth/authService';
import FondoAnimado from './FondoAnimado';
import CampoContrasena from './CampoContrasena';

/** Pantalla de recuperación de contraseña.
 * @param {Object} props
 * @param {string} props.modo - 'solicitar' o 'restablecer'.
 * @param {Function} props.onVolver - Regresa al acceso.
 * @param {Function} props.onListo - Notifica el restablecimiento completado.
 * @param {Function} props.mostrarToast - Muestra notificaciones.
 * @returns {JSX.Element} */
export default function PantallaRecuperarContrasena({ modo, onVolver, onListo, mostrarToast }) {
  const [email, setEmail] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  /** Solicita el correo de recuperación.
   * @param {Event} e - Evento de envío. */
  async function handleSolicitar(e) {
    e.preventDefault();
    setEnviando(true);
    const res = await solicitarRecuperacionContrasena(email);
    setEnviando(false);
    if (!res.ok) {
      mostrarToast(res.error, 'error');
      return;
    }
    setEnviado(true);
    mostrarToast(res.mensaje, 'success');
  }

  /** Establece la nueva contraseña.
   * @param {Event} e - Evento de envío. */
  async function handleRestablecer(e) {
    e.preventDefault();
    setEnviando(true);
    const res = await actualizarContrasena(nueva, confirmar);
    setEnviando(false);
    if (!res.ok) {
      mostrarToast(res.error, 'error');
      return;
    }
    mostrarToast('Contraseña actualizada. Ya puedes usar tu nueva contraseña.', 'success');
    onListo();
  }

  if (modo === 'restablecer') {
    return (
      <div className="auth-screen">
        <FondoAnimado />
        <div className="auth-card">
          <h2 className="auth-title">Establecer nueva contraseña</h2>
          <p className="auth-subtitle">Ingresa y confirma tu nueva contraseña.</p>
          <form onSubmit={handleRestablecer}>
            <label className="field-label">
              Nueva contraseña <span className="field-hint">(min. 6 caracteres)</span>
              <CampoContrasena classNameInput="field-input" value={nueva}
                onChange={e => setNueva(e.target.value)} required autoComplete="new-password" />
            </label>
            <label className="field-label">
              Confirmar nueva contraseña
              <CampoContrasena classNameInput="field-input" value={confirmar}
                onChange={e => setConfirmar(e.target.value)} required autoComplete="new-password" />
            </label>
            <button className="btn btn-primary" type="submit" disabled={enviando}>
              {enviando ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <FondoAnimado />
      <div className="auth-card">
        <button className="auth-back" onClick={onVolver} type="button"><Icono n="izquierda" /> Volver</button>
        <h2 className="auth-title">Recuperar contraseña</h2>
        {enviado ? (
          <p className="auth-subtitle">
            Si el correo esta registrado, te enviamos un enlace para restablecer
            tu contraseña. Revisa tu bandeja de entrada (y spam).
          </p>
        ) : (
          <>
            <p className="auth-subtitle">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
            <form onSubmit={handleSolicitar}>
              <label className="field-label">
                Correo electrónico
                <input className="field-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </label>
              <button className="btn btn-primary" type="submit" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
