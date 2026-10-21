/**
 * @module App
 * @description Raíz de la aplicación: gestiona sesión, modo invitado, consentimiento, pantallas especiales y el flujo de análisis.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la orquestación de pantallas según el estado de sesión.
 *  - D (Inversión de dependencias): delega autenticación, persistencia y vistas en auth/authService, utils/borrador y components/*, comunicándose por props y callbacks.
 */

import { useState, useEffect, useCallback } from 'react';
import { leerModoInvitado, guardarModoInvitado, borrarBorrador } from './utils/borrador';
import PantallaAuth          from './components/PantallaAuth';
import PantallaConsentimiento from './components/PantallaConsentimiento';
import PantallaRecuperarContrasena from './components/PantallaRecuperarContrasena';
import PaginaLegal           from './components/PaginaLegal';
import AnalizadorWizard      from './components/AnalizadorWizard';
import Toast                 from './components/Toast';
import { obtenerSesionActual, logout, tieneConsentimientoVigente } from './auth/authService';
import { supabase } from './supabaseClient';

/** Componente raíz que decide qué pantalla mostrar según sesión, consentimiento y pantalla especial.
 * @returns {JSX.Element|null} árbol de la aplicación, o null mientras se hidrata la sesión. */
export default function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [modoInvitado,  setModoInvitado]  = useState(() => leerModoInvitado());
  const [sesionLista,   setSesionLista]   = useState(false); // evita el parpadeo de la pantalla de autenticación
  const [consentimientoOk, setConsentimientoOk] = useState(false);

  const [pantallaEspecial, setPantallaEspecial] = useState(null);
  /* Valores: null | 'terminos' | 'privacidad' | 'olvide-contrasena' | 'nueva-contrasena' */

  const [toast, setToast] = useState({ msg: '', tipo: 'info', visible: false });

  const mostrarToast = useCallback((msg, tipo = 'info') => {
    setToast({ msg, tipo, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 1800);
  }, []);

  useEffect(() => {
    (async () => {
      const sesion = await obtenerSesionActual();
      if (sesion) {
        setUsuarioActual(sesion);
        setConsentimientoOk(await tieneConsentimientoVigente());
      }
      setSesionLista(true);
    })();

    /* PASSWORD_RECOVERY es el evento oficial de Supabase al llegar desde el enlace del correo; no se interpreta la URL manualmente. */
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPantallaEspecial('nueva-contrasena');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /** Registra al usuario autenticado, sale del modo invitado y verifica su consentimiento vigente.
   * @param {Object} usuario - usuario autenticado.
   * @returns {Promise<void>} */
  async function handleLoginExitoso(usuario) {
    setUsuarioActual(usuario);
    guardarModoInvitado(false);
    setModoInvitado(false);
    setConsentimientoOk(await tieneConsentimientoVigente());
    mostrarToast(`Bienvenido, ${usuario.nombre}.`, 'success');
  }

  /** Activa el modo invitado, cuyos datos permanecen solo en el navegador.
   * @returns {void} */
  function handleInvitado() {
    setModoInvitado(true);
    guardarModoInvitado(true);
    setUsuarioActual(null);
    mostrarToast('Modo invitado — los datos se guardan localmente en este navegador.', 'info');
  }

  /** Cierra la sesión y elimina el borrador local del usuario.
   * @returns {Promise<void>} */
  async function handleLogout() {
    borrarBorrador(usuarioActual?.id ?? null);
    guardarModoInvitado(false);
    await logout();
    setUsuarioActual(null);
    setModoInvitado(false);
    setConsentimientoOk(false);
    mostrarToast('Sesion cerrada.', 'info');
  }

  /** Sustituye el usuario en estado tras guardar su historial.
   * @param {Object} usuarioActualizado - usuario con datos actualizados.
   * @returns {void} */
  function handleUsuarioActualizado(usuarioActualizado) {
    setUsuarioActual(usuarioActualizado);
  }

  if (!sesionLista) return null; // espera la hidratación inicial

  const estaAutenticado = !!usuarioActual || modoInvitado;

  /* Las pantallas especiales tienen prioridad sobre el flujo normal. */
  if (pantallaEspecial === 'terminos' || pantallaEspecial === 'privacidad') {
    return (
      <div className="app-root">
        <Toast mensaje={toast.msg} tipo={toast.tipo} visible={toast.visible} />
        <PaginaLegal tipo={pantallaEspecial} onVolver={() => setPantallaEspecial(null)} />
      </div>
    );
  }

  if (pantallaEspecial === 'olvide-contrasena') {
    return (
      <div className="app-root">
        <Toast mensaje={toast.msg} tipo={toast.tipo} visible={toast.visible} />
        <PantallaRecuperarContrasena
          modo="solicitar"
          mostrarToast={mostrarToast}
          onVolver={() => setPantallaEspecial(null)}
        />
      </div>
    );
  }

  if (pantallaEspecial === 'nueva-contrasena') {
    return (
      <div className="app-root">
        <Toast mensaje={toast.msg} tipo={toast.tipo} visible={toast.visible} />
        <PantallaRecuperarContrasena
          modo="restablecer"
          mostrarToast={mostrarToast}
          onListo={() => setPantallaEspecial(null)}
        />
      </div>
    );
  }

  return (
    <div className="app-root">
      <Toast mensaje={toast.msg} tipo={toast.tipo} visible={toast.visible} />

      {!estaAutenticado ? (
        <PantallaAuth
          onLoginExitoso={handleLoginExitoso}
          onInvitado={handleInvitado}
          mostrarToast={mostrarToast}
          onOlvideContrasena={() => setPantallaEspecial('olvide-contrasena')}
          onVerTerminos={() => setPantallaEspecial('terminos')}
          onVerPrivacidad={() => setPantallaEspecial('privacidad')}
        />
      ) : (usuarioActual && !consentimientoOk) ? (
        <PantallaConsentimiento
          mostrarToast={mostrarToast}
          onAceptado={() => setConsentimientoOk(true)}
          onVerTerminos={() => setPantallaEspecial('terminos')}
          onVerPrivacidad={() => setPantallaEspecial('privacidad')}
        />
      ) : (
        <AnalizadorWizard
          usuarioActual={usuarioActual}
          modoInvitado={modoInvitado}
          mostrarToast={mostrarToast}
          onLogout={handleLogout}
          onUsuarioActualizado={handleUsuarioActualizado}
        />
      )}
    </div>
  );
}
