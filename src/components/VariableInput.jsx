/* ─── VariableInput.jsx v7 — slider real ───
   Fila de ingreso de un valor REAL de test (no normalizado) mediante
   <input type="range">. El slider trabaja exactamente en la misma
   unidad y escala que el test (kg, segundos, metros, repeticiones,
   ms, %) — la normalizacion a 0-100 ocurre despues, en el Step
   correspondiente (StepFisicas/StepCognitivas), igual que antes con
   el input numerico. Este componente NO cambia el significado ni la
   estructura de los datos, solo la forma de capturarlos.

   Usada tanto en StepFisicas como en StepCognitivas.

   IMPORTANTE sobre la validacion de "campo obligatorio": un slider
   HTML siempre tiene un valor numerico (no puede estar "vacio"), asi
   que para no romper la regla de "todos los campos son obligatorios"
   el valor NO se escribe en el estado del analisis hasta que el
   usuario efectivamente mueve el slider al menos una vez. Antes de
   eso se muestra visualmente en el punto medio del rango pero el
   campo sigue contando como "sin responder" para la validacion
   (analisis.realesF[id] permanece '' hasta el primer cambio real,
   igual que con el input numerico anterior).
*/
import { normalizarValor } from '../logic/modelo';

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
            {v.direccion === 'mayor_mejor' ? '↑ mayor = mejor' : '↓ menor = mejor'}
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

      {/* Barra de progreso (previsualizacion del % normalizado) */}
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
