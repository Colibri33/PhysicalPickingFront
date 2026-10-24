/**
 * @module components/BarraVariable
 * @description Barra horizontal para una variable (porcentaje o nivel), animada mediante transición CSS.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): solo presenta una barra; no calcula ni obtiene datos.
 *  - I (Segregación de interfaces): props mínimas y exclusivamente de presentación.
 */

/** Renderiza una fila con etiqueta, valor porcentual y barra de progreso.
 * @param {Object} props
 * @param {string} props.nombre - etiqueta de la variable.
 * @param {number} props.pct - porcentaje (0-100) a representar.
 * @param {string} props.color - color CSS de la barra y del valor.
 * @param {string} [props.subtexto] - texto auxiliar opcional junto al valor.
 * @param {string} [props.etiqueta] - texto que reemplaza al porcentaje (por ejemplo, el nivel); la barra sigue usando `pct`.
 * @returns {JSX.Element} fila de barra. */
export default function BarraVariable({ nombre, pct, color, subtexto, etiqueta }) {
  return (
    <div className="bar-row">
      <div className="bar-meta">
        <span className="bar-lbl">{nombre}</span>
        <div className="bar-values">
          {subtexto && <span className="bar-sub">{subtexto}</span>}
          <span className="bar-pct" style={{ color }}>{etiqueta ?? `${pct}%`}</span>
        </div>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
