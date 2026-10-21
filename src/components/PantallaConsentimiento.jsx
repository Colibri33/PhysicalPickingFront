/**
 * @module components/PantallaConsentimiento
 * @description Pantalla de autorización de tratamiento de datos personales, requerida una vez por usuario antes de guardar resultados.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): captura y registra el consentimiento; la navegación y las notificaciones se delegan.
 *  - D (Inversión de dependencias): el registro, el aviso y la navegación se inyectan mediante props (callbacks) y servicio de autenticación.
 * Notas: la población objetivo es adulta (18-30 años); no se gestiona autorización de terceros.
 */

import { useState } from 'react';
import { registrarConsentimiento } from '../auth/authService';
import FondoAnimado from './FondoAnimado';

/** Solicita la aceptación de Términos y Política de Datos y registra el consentimiento.
 * @param {Object} props
 * @param {Function} props.onAceptado - se invoca tras registrar el consentimiento.
 * @param {Function} props.mostrarToast - muestra una notificación (mensaje, tipo).
 * @param {Function} props.onVerTerminos - abre los Términos y Condiciones.
 * @param {Function} props.onVerPrivacidad - abre la Política de Tratamiento de Datos.
 * @returns {JSX.Element} pantalla de consentimiento. */
export default function PantallaConsentimiento({ onAceptado, mostrarToast, onVerTerminos, onVerPrivacidad }) {
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  /** Valida la casilla de aceptación y registra el consentimiento en el servicio. */
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
      <FondoAnimado />
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
            condición física para generar mi informe y guardar mi
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
