/**
 * @module components/Toast
 * @description Notificación emergente breve.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): mostrar un mensaje según su tipo y visibilidad.
 *  - I (Segregación de interfaces): tres props.
 */
/** Notificación emergente.
 * @param {Object} props
 * @param {string} props.mensaje - Texto.
 * @param {string} props.tipo - Variante (success, error, info).
 * @param {boolean} props.visible - Controla la visibilidad.
 * @returns {JSX.Element|null} */
export default function Toast({ mensaje, tipo, visible }) {
  if (!visible) return null;
  return (
    <div className={`toast show ${tipo}`} role="alert">
      <span className="toast-dot" />
      {mensaje}
    </div>
  );
}
