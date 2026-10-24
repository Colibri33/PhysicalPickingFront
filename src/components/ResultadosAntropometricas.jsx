/**
 * @module components/ResultadosAntropometricas
 * @description Composición corporal: medidas antropométricas capturadas y su clasificación (IMC según la OMS e ICC según la OMS 2008).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): presenta las medidas y su clasificación; los cálculos residen en evaluacion/antropometria.
 *  - D (Inversión de dependencias): depende de las funciones de clasificación, no de umbrales embebidos en la pantalla.
 * Notas: estas medidas se informan, pero no modifican los niveles de las capacidades ni la recomendación.
 */
import Icono from './Icono';
import { calcularIMC, clasificarICC } from '../evaluacion/antropometria';

const ETIQUETAS = {
  peso:       'Peso (kg)',
  talla:      'Talla (cm)',
  imc:        'IMC calculado',
  cintura:    'Cintura (cm)',
  cadera:     'Cadera (cm)',
  icc:        'ICC calculado',
  grasaVisc:  'Grasa visceral (nivel)',
};

/** Presenta las medidas antropométricas y su clasificación.
 * @param {Object} props
 * @param {Object} props.analisis - análisis con participante y antropometricas.
 * @param {Function} props.onContinuar - avanza al informe final.
 * @returns {JSX.Element} tarjeta de resultados. */
export default function ResultadosAntropometricas({ analisis, onContinuar }) {
  const c = analisis.antropometricas;
  const imc = calcularIMC(parseFloat(c.peso), parseFloat(c.talla));
  const riesgoICC = clasificarICC(Number(c.icc), analisis.participante?.genero);

  return (
    <div className="panel-card">
      <h2 className="panel-title">Composicion corporal</h2>

      <div className="antrop-grid">
        {Object.entries(ETIQUETAS).map(([k, lbl]) => {
          const val = c[k];
          const display = (val !== null && val !== '' && val !== undefined) ? val : '—';
          return (
            <div key={k} className="cdg-item">
              <div className="cdg-lbl">{lbl}</div>
              <div className="cdg-val">{display}</div>
            </div>
          );
        })}
      </div>

      <h3 className="section-subtitle mt-lg">Clasificacion</h3>
      <div className="antrop-grid">
        <div className="cdg-item">
          <div className="cdg-lbl">IMC (OMS)</div>
          <div className="cdg-val">{imc.categoria || '—'}</div>
        </div>
        <div className="cdg-item">
          <div className="cdg-lbl">Riesgo por ICC (OMS 2008)</div>
          <div className="cdg-val">{riesgoICC || '—'}</div>
        </div>
      </div>
      <p className="empty-text">
        Estas medidas se informan, pero no modifican los niveles de las capacidades ni la recomendación deportiva.
      </p>

      <button className="btn btn-primary btn-full mt-lg" onClick={onContinuar} type="button">
        Ver informe final <Icono n="derecha" />
      </button>
    </div>
  );
}
