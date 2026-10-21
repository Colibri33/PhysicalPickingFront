/**
 * @module components/ResultadosAntropometricas
 * @description Muestra los datos antropométricos, las reglas de ajuste activadas y la comparación entre el perfil físico base y el ajustado.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): presenta los ajustes antropométricos; las reglas y los cálculos residen en logic/modelo.
 *  - D (Inversión de dependencias): depende de REGLAS_AJUSTE_ANTROPOMETRICO y de calcularAjustesAntropometricos, no de reglas embebidas.
 */
import Icono from './Icono';
import {
  VARS_FISICAS,
  REGLAS_AJUSTE_ANTROPOMETRICO,
  calcularAjustesAntropometricos,
  prepararAntropometricas,
  clamp,
} from '../logic/modelo';

/** Formatea un delta con un decimal y signo explícito para valores positivos.
 * @param {number} d - diferencia numérica.
 * @returns {string} texto con signo. */
function signo(d) {
  const r = Math.round(d * 10) / 10;
  return r > 0 ? `+${r}` : `${r}`;
}

/** Presenta datos antropométricos, reglas activadas y comparación base frente a ajustado.
 * @param {Object} props
 * @param {Object} props.analisis - análisis con antropometricas y fisicas (0-100).
 * @param {Function} props.onContinuar - avanza al perfil consolidado.
 * @returns {JSX.Element} tarjeta de resultados. */
export default function ResultadosAntropometricas({ analisis, onContinuar }) {
  const c      = analisis.antropometricas;
  const antrop = prepararAntropometricas(c);

  const ajAntrop = calcularAjustesAntropometricos(antrop);

  const reglasActivas = REGLAS_AJUSTE_ANTROPOMETRICO.filter(r => {
    // Una condición que lanza error por datos incompletos se considera inactiva.
    try { return r.condicion(antrop); } catch { return false; }
  });

  const etiquetas = {
    peso:       'Peso (kg)',
    talla:      'Talla (cm)',
    imc:        'IMC calculado',
    cintura:    'Cintura (cm)',
    cadera:     'Cadera (cm)',
    icc:        'ICC calculado',
    grasaVisc:  'Grasa visceral (nivel)',
  };

  return (
    <div className="panel-card">
      <h2 className="panel-title">Ajustes antropometricos</h2>

      <div className="antrop-grid">
        {Object.entries(etiquetas).map(([k, lbl]) => {
          const val = c[k];
          const display = (val !== null && val !== '' && val !== undefined)
            ? val
            : '—';
          return (
            <div key={k} className="cdg-item">
              <div className="cdg-lbl">{lbl}</div>
              <div className="cdg-val">{display}</div>
            </div>
          );
        })}
      </div>

      <h3 className="section-subtitle mt-lg">Reglas de ajuste activadas</h3>
      {reglasActivas.length === 0 ? (
        <p className="empty-text">
          No se activaron reglas de ajuste. Los datos antropometricos están en rangos normales
          o no fueron completados.
        </p>
      ) : (
        <div className="ajuste-table-wrap">
          <table className="ajuste-table">
            <thead>
              <tr>
                <th>Variable afectada</th>
                <th>Ajuste</th>
                <th>Condicion</th>
              </tr>
            </thead>
            <tbody>
              {reglasActivas.map((r, i) => {
                const vF  = VARS_FISICAS.find(v => v.id === r.variable);
                const cls = r.delta > 0 ? 'td-pos' : r.delta < 0 ? 'td-neg' : 'td-neu';
                return (
                  <tr key={i}>
                    <td className="td-var">{vF?.nombre ?? r.variable}</td>
                    <td className={cls}>{signo(r.delta)} pts</td>
                    <td>{r.descripcion}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="section-subtitle mt-lg">Base normalizada <Icono n="derecha" /> tras ajuste antropometrico</h3>
      <div className="compare-list">
        {VARS_FISICAS.map(v => {
          const base = analisis.fisicas[v.id];
          const adj  = Math.round(clamp(base + (ajAntrop[v.id] || 0), 0, 100));
          const diff = adj - base;
          return (
            <div key={v.id} className="compare-row">
              <div className="compare-meta">
                <span className="compare-lbl">{v.nombre}</span>
                <div className="compare-vals">
                  <span className="compare-base">Base: {base}%</span>
                  <span className="compare-arrow"><Icono n="derecha" /></span>
                  <span className="compare-adj">{adj}%</span>
                  {diff !== 0 && (
                    <span className={`compare-delta ${diff > 0 ? 'delta-pos' : 'delta-neg'}`}>
                      {signo(diff)}
                    </span>
                  )}
                </div>
              </div>
              <div className="compare-bars-track">
                <div
                  className="compare-bar"
                  style={{ width: `${base}%`, background: v.color, opacity: 0.4 }}
                />
                <div
                  className="compare-bar compare-bar--adj"
                  style={{ width: `${adj}%`, background: v.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary btn-full mt-lg" onClick={onContinuar} type="button">
        Ver perfil consolidado <Icono n="derecha" />
      </button>
    </div>
  );
}
