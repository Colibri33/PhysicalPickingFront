/* ═══════════════════════════════════════════════════════════════
   PhysicalPicking · App.jsx
   Raíz de la aplicación.
   Gestiona: sesión, modo invitado, pantalla activa (auth / análisis).
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import PantallaAuth          from './components/PantallaAuth';
import PantallaConsentimiento from './components/PantallaConsentimiento';
import PantallaRecuperarContrasena from './components/PantallaRecuperarContrasena';
import PaginaLegal           from './components/PaginaLegal';
import AnalizadorWizard      from './components/AnalizadorWizard';
import Toast                 from './components/Toast';
import { obtenerSesionActual, logout, tieneConsentimientoVigente } from './auth/authService';
import { supabase } from './supabaseClient';

export default function App() {
  /* ── Sesión ── */
  const [usuarioActual, setUsuarioActual] = useState(null); // Object | null
  const [modoInvitado,  setModoInvitado]  = useState(false);
  const [sesionLista,   setSesionLista]   = useState(false); // evita flash de auth
  const [consentimientoOk, setConsentimientoOk] = useState(false);

  /* ── Pantallas especiales (fuera del flujo principal) ── */
  const [pantallaEspecial, setPantallaEspecial] = useState(null);
  // null | 'terminos' | 'privacidad' | 'olvide-contrasena' | 'nueva-contrasena'

  /* ── Toast global ── */
  const [toast, setToast] = useState({ msg: '', tipo: 'info', visible: false });

  const mostrarToast = useCallback((msg, tipo = 'info') => {
    setToast({ msg, tipo, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  /* ── Recuperar sesión al montar + detectar enlace de recuperacion ── */
  useEffect(() => {
    (async () => {
      const sesion = await obtenerSesionActual();
      if (sesion) {
        setUsuarioActual(sesion);
        setConsentimientoOk(await tieneConsentimientoVigente());
      }
      setSesionLista(true);
    })();

    // Supabase emite el evento PASSWORD_RECOVERY cuando el usuario
    // llega desde el enlace del correo de recuperacion. Es la forma
    // oficial de detectarlo (no se interpreta el enlace a mano).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPantallaEspecial('nueva-contrasena');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ── Handlers de auth ── */
  async function handleLoginExitoso(usuario) {
    setUsuarioActual(usuario);
    setModoInvitado(false);
    setConsentimientoOk(await tieneConsentimientoVigente());
    mostrarToast(`Bienvenido, ${usuario.nombre}.`, 'success');
  }

  function handleInvitado() {
    setModoInvitado(true);
    setUsuarioActual(null);
    mostrarToast('Modo invitado — los datos se guardan localmente en este navegador.', 'info');
  }

  async function handleLogout() {
    await logout();
    setUsuarioActual(null);
    setModoInvitado(false);
    setConsentimientoOk(false);
    mostrarToast('Sesion cerrada.', 'info');
  }

  /* ── Actualizar usuario tras guardar historial ── */
  function handleUsuarioActualizado(usuarioActualizado) {
    setUsuarioActual(usuarioActualizado);
  }

  if (!sesionLista) return null; // esperar hidratación inicial

  const estaAutenticado = !!usuarioActual || modoInvitado;

  /* ── Pantallas especiales tienen prioridad sobre el flujo normal ── */
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
      {/* Toast global */}
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
