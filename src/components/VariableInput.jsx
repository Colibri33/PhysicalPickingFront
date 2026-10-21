/**
 * @module components/VariableInput
 * @description Fila de captura de un valor real de test (unidad original, no normalizado) mediante control deslizante, con vista previa del porcentaje normalizado.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): solo captura y previsualiza un valor; la normalización definitiva ocurre en StepFisicas.
 *  - D (Inversión de dependencias): el valor y el cambio se controlan desde el padre (valor, onChange).
 * Notas: un slider HTML siempre tiene valor, por lo que el estado no se actualiza hasta el primer movimiento del usuario; antes se muestra el punto medio y el campo cuenta como sin responder (valor '') para la validación de obligatoriedad.
 */
import { normalizarValor } from '../logic/modelo';
import Icono from './Icono';

/** Renderiza el slider de una variable con rango, valor actual y barra de vista previa.
 * @param {Object} props
 * @param {Object} props.variable - definición (id, nombre, unidad, minimo, maximo, paso, direccion, color).
 * @param {string|number} props.valor - valor real actual; '' si no se ha respondido.
 * @param {Function} props.onChange - recibe (id, valor) al mover el slider.
 * @param {string} [props.error] - mensaje de validación a mostrar.
 * @returns {JSX.Element} fila de ingreso. */
export default function VariableInput({ variable: v, valor, onChange, error }) {
  const respondido = valor !== '' && valor !== null && valor !== undefined;
  const paso = v.paso ?? 1;
  const decimales = paso < 1 ? 1 : 0;
  const medio = Math.round(((v.minimo + v.maximo) / 2) / paso) * paso;
  const valorMostrado = respondido ? parseFloat(valor) : medio;

  const pct = respondido ? normalizarValor(valorMostrado, v.minimo, v.maximo, v.direccion) : null;

  return (
    <div className={`norm-row${error ? ' norm-row--error' : ''}`}>
      <div className="norm-meta">
        <span className="norm-name">{v.nombre}</span>
        <span className="norm-rango">
          Rango: {v.minimo} – {v.maximo} {v.unidad}
          &nbsp;·&nbsp;
          <span className="norm-dir">
            {v.direccion === 'mayor_mejor' ? <><Icono n="arriba" /> mayor = mejor</> : <><Icono n="abajo" /> menor = mejor</>}
          </span>
        </span>
      </div>

      <div className="slider-row">
        <span className="slider-edge">{v.minimo} {v.unidad}</span>
        <input
          type="range"
          className="slider-input"
          min={v.minimo}
          max={v.maximo}
          step={paso}
          value={valorMostrado}
          onChange={e => onChange(v.id, e.target.value)}
          style={{ accentColor: v.color }}
          aria-label={v.nombre}
          aria-valuemin={v.minimo}
          aria-valuemax={v.maximo}
          aria-valuenow={valorMostrado}
        />
        <span className="slider-edge">{v.maximo} {v.unidad}</span>
      </div>

      <div className="slider-valor-row">
        <span className="slider-valor" style={{ color: respondido ? v.color : '#8792a8' }}>
          {respondido
            ? `Valor actual: ${valorMostrado.toFixed(decimales)} ${v.unidad}`
            : 'Desliza para fijar un valor'}
        </span>
        <span className="norm-preview" style={{ color: pct !== null ? v.color : '#8792a8' }}>
          {pct !== null ? `${pct}%` : '—%'}
        </span>
      </div>

      <div className="norm-bar-track">
        <div
          className="norm-bar-fill"
          style={{ width: `${pct ?? 0}%`, background: v.color }}
        />
      </div>

      {error && <p className="norm-error">{error}</p>}
    </div>
  );
}
