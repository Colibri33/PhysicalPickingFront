/**
 * @module components/StepAntropometricas
 * @description Paso de captura de variables antropométricas opcionales, con IMC e ICC calculados en vivo.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): captura y valida coherencia física de datos antropométricos; los cálculos se delegan.
 *  - D (Inversión de dependencias): IMC, ICC, clasificación y rangos provienen de logic/modelo; el estado se recibe por props.
 * Notas: clasificación del ICC según OMS 2008 (riesgo sustancialmente aumentado: ≥0,90 hombres, ≥0,85 mujeres).
 */
import { calcularIMC, calcularICC, clasificarICC, RANGOS_ANTROPOMETRICOS } from '../logic/modelo';
import Icono from './Icono';

/** Formulario del paso de variables antropométricas.
 * @param {Object} props
 * @param {Object} props.analisis - análisis actual (antropometricas, participante).
 * @param {Function} props.updateAnalisis - actualiza campos del análisis.
 * @param {Function} props.onContinuar - avanza al siguiente paso.
 * @param {Function} props.mostrarToast - muestra una notificación (mensaje, tipo).
 * @returns {JSX.Element} tarjeta del paso. */
export default function StepAntropometricas({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const a = analisis.antropometricas;

  /** Actualiza un campo y recalcula IMC o ICC cuando cambian sus insumos.
   * @param {string} campo - clave del campo antropométrico.
   * @param {string} valor - valor ingresado. */
  function setField(campo, valor) {
    const nuevo = { ...a, [campo]: valor };

    // IMC derivado de peso y talla.
    if (campo === 'peso' || campo === 'talla') {
      const peso  = campo === 'peso'  ? parseFloat(valor) : parseFloat(a.peso);
      const talla = campo === 'talla' ? parseFloat(valor) : parseFloat(a.talla);
      const { valor: imcVal } = calcularIMC(peso, talla);
      nuevo.imc = imcVal;
    }

    // ICC derivado de cintura y cadera.
    if (campo === 'cintura' || campo === 'cadera') {
      const cintura = campo === 'cintura' ? parseFloat(valor) : parseFloat(a.cintura);
      const cadera  = campo === 'cadera'  ? parseFloat(valor) : parseFloat(a.cadera);
      nuevo.icc = calcularICC(cintura, cadera).valor;
    }

    updateAnalisis({ antropometricas: nuevo });
  }

  const { valor: imcVal, categoria: imcCat } = calcularIMC(
    parseFloat(a.peso), parseFloat(a.talla)
  );
  const { valor: iccVal } = calcularICC(a.cintura, a.cadera);
  const iccCat = clasificarICC(iccVal, analisis.participante?.genero);

  /** Valida el rango de los campos completados y avanza. */
  function handleContinuar() {
    // Los campos son opcionales: se bloquea por valores incoherentes, no por vacíos.
    for (const [campo, r] of Object.entries(RANGOS_ANTROPOMETRICOS)) {
      const raw = a[campo];
      if (raw === '' || raw === null || raw === undefined) continue;
      const n = parseFloat(raw);
      if (isNaN(n)) return mostrarToast(`${r.etiqueta}: debe ser un numero valido.`, 'error');
      if (n < r.min || n > r.max)
        return mostrarToast(`${r.etiqueta}: valor fuera de un rango fisicamente coherente (${r.min}-${r.max}).`, 'error');
    }
    mostrarToast('Variables antropometricas guardadas. Calculando resultados...', 'success');
    onContinuar();
  }

  return (
    <div className="panel-card">
      <h2 className="panel-title">Variables antropometricas</h2>
      <p className="panel-desc">Los datos antropometricos ajustan el perfil físico base. Son opcionales.</p>

      <div className="form-grid">
        <label className="field-label">
          Peso (kg)
          <input className="field-input" type="number" step="0.1" value={a.peso}
            onChange={e => setField('peso', e.target.value)} placeholder="ej. 75" />
        </label>

        <label className="field-label">
          Talla (cm)
          <input className="field-input" type="number" step="0.5" value={a.talla}
            onChange={e => setField('talla', e.target.value)} placeholder="ej. 175" />
        </label>

        {imcVal !== null && (
          <div className="imc-display" style={{ gridColumn: '1/-1' }}>
            <span className="imc-val">{imcVal}</span>
            <span className="imc-cat">IMC — {imcCat}</span>
          </div>
        )}

        <label className="field-label">
          Cintura (cm)
          <input className="field-input" type="number" step="0.5" value={a.cintura ?? ''}
            onChange={e => setField('cintura', e.target.value)} placeholder="ej. 82" />
          <span className="field-hint">Punto medio entre la última costilla y la cresta ilíaca, al final de una espiración normal.</span>
        </label>

        <label className="field-label">
          Cadera (cm)
          <input className="field-input" type="number" step="0.5" value={a.cadera ?? ''}
            onChange={e => setField('cadera', e.target.value)} placeholder="ej. 96" />
          <span className="field-hint">Parte más ancha de los glúteos, cinta paralela al suelo.</span>
        </label>

        {iccVal !== null && (
          <div className="imc-display" style={{ gridColumn: '1/-1' }}>
            <span className="imc-val">{iccVal}</span>
            <span className="imc-cat">ICC{iccCat ? ` — ${iccCat}` : ' (sin clasificación: registra el género)'}</span>
          </div>
        )}

        <label className="field-label">
          Grasa visceral (nivel)
          <input className="field-input" type="number" step="1" value={a.grasaVisc}
            onChange={e => setField('grasaVisc', e.target.value)} placeholder="ej. 5" />
        </label>
      </div>

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar <Icono n="derecha" />
      </button>
    </div>
  );
}
