/* ═══════════════════════════════════════════════════════════════
   PantallaConsentimiento.jsx
   Se muestra una sola vez por usuario, antes de poder guardar
   ningun resultado de test. Registra la autorizacion de tratamiento
   de datos personales del propio participante adulto (18-30 años).
   PhysicalPicking no maneja autorizacion de terceros (acudientes):
   toda la poblacion objetivo es mayor de edad por definicion.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { registrarConsentimiento } from '../auth/authService';

export default function PantallaConsentimiento({ onAceptado, mostrarToast, onVerTerminos, onVerPrivacidad }) {
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleContinuar() {
    if (!acepto) {
      mostrarToast('Debes aceptar los Terminos y la Politica de Tratamiento de Datos para continuar.', 'error');
      return;
    }

    setEnviando(true);
    const res = await registrarConsentimiento();
    setEnviando(false);

    if (!res.ok) {
      mostrarToast(res.error || 'No se pudo registrar tu autorizacion.', 'error');
      return;
    }
    onAceptado();
  }

  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <h2 className="auth-title">Autorización de tratamiento de datos personales</h2>
        <p className="auth-subtitle">
          Antes de continuar, necesitamos tu autorización para tratar tus datos
          personales, incluyendo los relacionados con tu condición física,
          conforme a la Ley 1581 de 2012 (Habeas Data).
        </p>

        <label className="field-label" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16 }}>
          <input
            type="checkbox"
            checked={acepto}
            onChange={e => setAcepto(e.target.checked)}
          />
          <span>
            Declaro que he leído y acepto los{' '}
            <button type="button" className="link-inline" onClick={onVerTerminos}>
              Términos y Condiciones
            </button>{' '}
            y la{' '}
            <button type="button" className="link-inline" onClick={onVerPrivacidad}>
              Política de Tratamiento de Datos Personales
            </button>{' '}
            de PhysicalPicking, incluyendo el tratamiento de mis datos de
            condición física y cognitiva para generar mi informe y guardar mi
            historial.
          </span>
        </label>

        <button
          className="btn btn-primary btn-full mt-lg"
          onClick={handleContinuar}
          disabled={enviando}
          type="button"
        >
          {enviando ? 'Guardando...' : 'Acepto y continuar'}
        </button>

        <p className="auth-note" style={{ marginTop: 12 }}>
          Puedes ejercer tus derechos de acceso, rectificación, supresión u
          oposición en cualquier momento desde tu historial.
        </p>
      </div>
    </div>
  );
}
