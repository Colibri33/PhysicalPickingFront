/* ─── StepCorporales.jsx ─── */
import { calcularIMC } from '../logic/modelo';

export default function StepCorporales({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const c = analisis.corporales;

  function setField(campo, valor) {
    const nuevoCorp = { ...c, [campo]: valor };

    // Recalcular IMC en tiempo real si hay peso y talla
    if (campo === 'peso' || campo === 'talla') {
      const peso  = campo === 'peso'  ? parseFloat(valor) : parseFloat(c.peso);
      const talla = campo === 'talla' ? parseFloat(valor) : parseFloat(c.talla);
      const { valor: imcVal } = calcularIMC(peso, talla);
      nuevoCorp.imc = imcVal;
    }

    updateAnalisis({ corporales: nuevoCorp });
  }

  const { valor: imcVal, categoria: imcCat } = calcularIMC(
    parseFloat(c.peso), parseFloat(c.talla)
  );

  function handleContinuar() {
    // Los campos corporales son opcionales, pero si se completan deben
    // ser fisicamente coherentes (no bloquea por vacio, si por absurdo).
    const revisiones = [
      { campo: 'peso',      etiqueta: 'Peso',            min: 1,   max: 400 },
      { campo: 'talla',     etiqueta: 'Talla',           min: 30,  max: 250 },
      { campo: 'grasa',     etiqueta: '% Grasa corporal', min: 0,   max: 75  },
      { campo: 'muscular',  etiqueta: '% Masa muscular',  min: 0,   max: 75  },
      { campo: 'grasaVisc', etiqueta: 'Grasa visceral',   min: 0,   max: 60  },
    ];
    for (const r of revisiones) {
      const raw = c[r.campo];
      if (raw === '' || raw === null || raw === undefined) continue;
      const n = parseFloat(raw);
      if (isNaN(n)) return mostrarToast(`${r.etiqueta}: debe ser un numero valido.`, 'error');
      if (n < r.min || n > r.max)
        return mostrarToast(`${r.etiqueta}: valor fuera de un rango fisicamente coherente (${r.min}-${r.max}).`, 'error');
    }
    mostrarToast('Variables corporales guardadas. Calculando resultados...', 'success');
    onContinuar();
  }

  return (
    <div className="panel-card">
      <h2 className="panel-title">Variables corporales</h2>
      <p className="panel-desc">Los datos corporales ajustan el perfil físico base. Son opcionales.</p>

      <div className="form-grid">
        <label className="field-label">
          Peso (kg)
          <input className="field-input" type="number" step="0.1" value={c.peso}
            onChange={e => setField('peso', e.target.value)} placeholder="ej. 75" />
        </label>

        <label className="field-label">
          Talla (cm)
          <input className="field-input" type="number" step="0.5" value={c.talla}
            onChange={e => setField('talla', e.target.value)} placeholder="ej. 175" />
        </label>

        {/* IMC calculado */}
        {imcVal !== null && (
          <div className="imc-display" style={{ gridColumn: '1/-1' }}>
            <span className="imc-val">{imcVal}</span>
            <span className="imc-cat">{imcCat}</span>
          </div>
        )}

        <label className="field-label">
          % Grasa corporal
          <input className="field-input" type="number" step="0.1" value={c.grasa}
            onChange={e => setField('grasa', e.target.value)} placeholder="ej. 18" />
        </label>

        <label className="field-label">
          % Masa muscular
          <input className="field-input" type="number" step="0.1" value={c.muscular}
            onChange={e => setField('muscular', e.target.value)} placeholder="ej. 42" />
        </label>

        <label className="field-label">
          Grasa visceral (nivel)
          <input className="field-input" type="number" step="1" value={c.grasaVisc}
            onChange={e => setField('grasaVisc', e.target.value)} placeholder="ej. 5" />
        </label>
      </div>

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar}>
        Continuar →
      </button>
    </div>
  );
}
