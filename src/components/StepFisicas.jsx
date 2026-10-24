/**
 * @module components/StepFisicas
 * @description Paso de la batería física: dinamometría, salto, flexibilidad, equilibrio bilateral y resistencia aeróbica (Léger).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): captura y valida los valores de la batería; los rangos y las reglas de captura se delegan al catálogo de capacidades.
 *  - O (Abierto/Cerrado): una variable estándar nueva se agrega al catálogo de capacidades y se renderiza con VariableInput sin modificar este paso.
 *  - D (Inversión de dependencias): rangos y validación provienen de evaluacion/capacidades y la autorización PAR-Q+ de logic/parq.
 * Notas: el Léger registra el último nivel máximo alcanzado (entero) y solo se exige si el PAR-Q+ lo autoriza; el VO2máx se estima y califica en evaluacion/normalizacion/leger.js.
 */
import { useState } from 'react';
import Icono from './Icono';
import VariableInput from './VariableInput';
import { VARIABLES_CAPTURA, EQUILIBRIO_POR_PIERNA_MAX, FUERZA_POR_MANO_MAX, NIVEL_LEGER_MAX, validarFormularioVariables, esNivelLegerValido } from '../evaluacion/capacidades';
import { evaluarParq } from '../logic/parq';

/** Entrada de fuerza prensil por mano con suma derivada.
 * @param {Object} props
 * @param {Object} props.realesF - valores reales actuales.
 * @param {Function} props.onCambio - recibe (campo, valor).
 * @param {string} [props.error] - mensaje de validación.
 * @returns {JSX.Element} fila de ingreso. */
function InputFuerza({ realesF, onCambio, error }) {
  const der = realesF.fuerzaDer;
  const izq = realesF.fuerzaIzq;
  const total = realesF.fuerza;
  const v = VARIABLES_CAPTURA.find(x => x.id === 'fuerza');
  return (
    <div className={`norm-row${error ? ' norm-row--error' : ''}`}>
      <div className="norm-meta">
        <span className="norm-name">Fuerza prensil (suma ambas manos)</span>
        <span className="norm-rango">
          {v.minimo} – {v.maximo} {v.unidad} · <span className="norm-dir"><Icono n="arriba" /> mayor = mejor</span>
        </span>
      </div>
      <p className="panel-desc" style={{ margin: 0 }}>
        Mejor intento de cada mano (dinamometría). El resultado es la suma de ambas manos (baremo AFISAL sobre la suma).
      </p>
      <div className="norm-input-row">
        <label className="field-label">
          Mano derecha (kg)
          <input
            className="norm-input" type="number" min={0} max={FUERZA_POR_MANO_MAX} step={1}
            value={der ?? ''} onChange={e => onCambio('fuerzaDer', e.target.value)}
          />
        </label>
        <label className="field-label">
          Mano izquierda (kg)
          <input
            className="norm-input" type="number" min={0} max={FUERZA_POR_MANO_MAX} step={1}
            value={izq ?? ''} onChange={e => onCambio('fuerzaIzq', e.target.value)}
          />
        </label>
        <span className="norm-unit">Suma: <strong>{total === '' || total == null ? '—' : `${total} kg`}</strong></span>
      </div>
      {error && <p className="norm-error">{error}</p>}
    </div>
  );
}

/** Entrada de equilibrio por pierna con total derivado.
 * @param {Object} props
 * @param {Object} props.realesF - valores reales actuales.
 * @param {Function} props.onCambio - recibe (campo, valor).
 * @param {string} [props.error] - mensaje de validación.
 * @returns {JSX.Element} fila de ingreso. */
function InputEquilibrio({ realesF, onCambio, error }) {
  const der = realesF.equilibrioDer;
  const izq = realesF.equilibrioIzq;
  const total = realesF.equilibrio;
  const v = VARIABLES_CAPTURA.find(x => x.id === 'equilibrio');
  return (
    <div className={`norm-row${error ? ' norm-row--error' : ''}`}>
      <div className="norm-meta">
        <span className="norm-name">Equilibrio (suma ambas piernas)</span>
        <span className="norm-rango">
          0 – {v.maximo} {v.unidad} · <span className="norm-dir"><Icono n="abajo" /> menor = mejor</span>
        </span>
      </div>
      <p className="panel-desc" style={{ margin: 0 }}>
        2 intentos, uno por pierna. Cuenta cada vez que se baja el pie durante 1 minuto por pierna.
      </p>
      <div className="norm-input-row">
        <label className="field-label">
          Pierna derecha (intentos)
          <input
            className="norm-input" type="number" min={0} max={EQUILIBRIO_POR_PIERNA_MAX} step={1}
            value={der ?? ''} onChange={e => onCambio('equilibrioDer', e.target.value)}
          />
        </label>
        <label className="field-label">
          Pierna izquierda (intentos)
          <input
            className="norm-input" type="number" min={0} max={EQUILIBRIO_POR_PIERNA_MAX} step={1}
            value={izq ?? ''} onChange={e => onCambio('equilibrioIzq', e.target.value)}
          />
        </label>
        <span className="norm-unit">Total: <strong>{total === '' || total == null ? '—' : `${total} intentos`}</strong></span>
      </div>
      {error && <p className="norm-error">{error}</p>}
    </div>
  );
}

/** Formulario de la batería física con validación de los valores capturados.
 * @param {Object} props
 * @param {Object} props.analisis - análisis actual (realesF, leger, parq).
 * @param {Function} props.updateAnalisis - actualiza campos del análisis.
 * @param {Function} props.onContinuar - avanza al siguiente paso.
 * @param {Function} props.mostrarToast - muestra una notificación (mensaje, tipo).
 * @returns {JSX.Element} tarjeta del paso. */
export default function StepFisicas({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const [errores,       setErrores]       = useState({});
  const [advertencias,  setAdvertencias]  = useState([]);
  // Léger solo si el PAR-Q+ no lo contraindica (R-SEG-01).
  const legerAutorizado = evaluarParq((analisis.parq ?? {}).respuestas ?? {}) === 'apto';
  // El nivel Léger vive en `realesF.resistencia` y se espeja en `leger.palier` por compatibilidad con registros anteriores.
  const palier = analisis.leger?.palier ?? analisis.realesF?.resistencia ?? '';

  /** Guarda un valor; en capturas bilaterales recalcula la suma y limpia errores asociados.
   * @param {string} id - id del campo.
   * @param {string} valor - valor ingresado. */
  function handleChange(id, valor) {
    // Capturas bilaterales: se almacenan los parciales y el derivado (suma).
    // La suma queda vacía si algún parcial es inválido.
    if (id === 'equilibrioDer' || id === 'equilibrioIzq') {
      const parciales = { equilibrioDer: analisis.realesF.equilibrioDer, equilibrioIzq: analisis.realesF.equilibrioIzq, [id]: valor };
      const num = k => {
        const n = Number(parciales[k]);
        return (parciales[k] === '' || parciales[k] == null || !Number.isInteger(n) || n < 0 || n > EQUILIBRIO_POR_PIERNA_MAX) ? null : n;
      };
      const d = num('equilibrioDer');
      const q = num('equilibrioIzq');
      updateAnalisis({ realesF: { ...analisis.realesF, [id]: valor, equilibrio: (d !== null && q !== null) ? String(d + q) : '' } });
    } else if (id === 'fuerzaDer' || id === 'fuerzaIzq') {
      const parciales = { fuerzaDer: analisis.realesF.fuerzaDer, fuerzaIzq: analisis.realesF.fuerzaIzq, [id]: valor };
      const num = k => {
        const n = Number(parciales[k]);
        return (parciales[k] === '' || parciales[k] == null || !Number.isFinite(n) || n < 0 || n > FUERZA_POR_MANO_MAX) ? null : n;
      };
      const d = num('fuerzaDer');
      const q = num('fuerzaIzq');
      updateAnalisis({ realesF: { ...analisis.realesF, [id]: valor, fuerza: (d !== null && q !== null) ? String(Math.round((d + q) * 10) / 10) : '' } });
    } else if (id === 'resistencia') {
      updateAnalisis({ realesF: { ...analisis.realesF, [id]: valor }, leger: { palier: valor } });
    } else {
      updateAnalisis({ realesF: { ...analisis.realesF, [id]: valor } });
    }
    if (errores[id] || errores.equilibrio || errores.fuerza || errores.leger || errores.resistencia) {
      setErrores(e => { const c = { ...e }; delete c[id]; delete c.equilibrio; delete c.fuerza; delete c.leger; delete c.resistencia; return c; });
    }
    // Retira la advertencia del campo modificado.
    setAdvertencias(prev => prev.filter(a => !a.startsWith(VARIABLES_CAPTURA.find(v => v.id === id)?.nombre)));
  }

  /** Guarda el nivel Léger en ambos almacenamientos (leger.palier y realesF.resistencia).
   * @param {string} valor - nivel ingresado. */
  function handleLeger(valor) {
    if (errores.leger || errores.resistencia) setErrores(e => { const c = { ...e }; delete c.leger; delete c.resistencia; return c; });
    updateAnalisis({ leger: { palier: valor }, realesF: { ...analisis.realesF, resistencia: valor } });
  }

  /** Valida todos los campos y avanza. */
  function handleContinuar() {
    // Valida los parciales bilaterales; la suma derivada se valida en el formulario.
    const mapaExtra = {};
    for (const k of ['equilibrioDer', 'equilibrioIzq']) {
      const raw = analisis.realesF[k];
      const n = Number(raw);
      if (raw === '' || raw == null || !Number.isInteger(n) || n < 0 || n > EQUILIBRIO_POR_PIERNA_MAX) {
        mapaExtra.equilibrio = `Equilibrio: registra los intentos de cada pierna (entero 0-${EQUILIBRIO_POR_PIERNA_MAX}).`;
      }
    }
    for (const k of ['fuerzaDer', 'fuerzaIzq']) {
      const raw = analisis.realesF[k];
      const n = Number(raw);
      if (raw === '' || raw == null || !Number.isFinite(n) || n < 0 || n > FUERZA_POR_MANO_MAX) {
        mapaExtra.fuerza = `Fuerza prensil: registra el mejor intento de cada mano (0-${FUERZA_POR_MANO_MAX} kg).`;
      }
    }
    const { ok, errores: lista, advertencias: warns } = validarFormularioVariables(
      // El Léger se valida aparte (obligatorio solo si está autorizado).
      VARIABLES_CAPTURA.filter(v => v.id !== 'resistencia'),
      analisis.realesF,
    );

    const palierNum = Number(palier);
    const palierOk = !legerAutorizado || (palier !== '' && esNivelLegerValido(palierNum));
    if (!palierOk) mapaExtra.leger = `Resistencia aeróbica (Léger): registra el nivel máximo alcanzado (número entero de 1 a ${NIVEL_LEGER_MAX}).`;

    if (!ok || mapaExtra.equilibrio || mapaExtra.fuerza || mapaExtra.leger) {
      const mapa = { ...mapaExtra };
      lista.forEach(msg => {
        const v = VARIABLES_CAPTURA.find(v => msg.startsWith(v.nombre));
        if (v) mapa[v.id] = msg;
      });
      setErrores(mapa);
      mostrarToast(`${lista.length} campo(s) obligatorio(s) sin completar.`, 'error');
      return;
    }

    setAdvertencias(warns);

    // Sin autorización del PAR-Q+, la resistencia queda sin dato (no penaliza en el flujo de evaluación).
    updateAnalisis({ realesF: { ...analisis.realesF, resistencia: legerAutorizado ? palier : '' } });

    if (warns.length > 0) {
      mostrarToast(`${warns.length} valor(es) fuera del rango de captura; se califican tal como los ingresaste.`, 'info');
    } else {
      mostrarToast('Variables fisicas registradas.', 'success');
    }
    onContinuar();
  }

  return (
    <div className="panel-card">
      <h2 className="panel-title">Batería física</h2>
      <p className="panel-desc">
        Dinamometría (suma ambas manos), salto vertical, flexibilidad, equilibrio
        monopodal y resistencia aeróbica (Léger, último nivel alcanzado — solo si
        el PAR-Q+ lo autoriza). Todos los campos visibles son obligatorios.
      </p>

      <div className="rango-note">
        <span className="rango-note-icon"><Icono n="info" /></span>
        <span>
          Los rangos de captura solo evitan errores de digitación. Un valor fuera del rango se acepta con una advertencia
          y se califica tal como lo ingresaste.
        </span>
      </div>

      <div className="norm-formulario">
        {VARIABLES_CAPTURA.filter(v => v.id !== 'resistencia').map(v => (
          v.id === 'equilibrio'
            ? <InputEquilibrio key={v.id} realesF={analisis.realesF} onCambio={handleChange} error={errores[v.id]} />
            : v.id === 'fuerza'
              ? <InputFuerza key={v.id} realesF={analisis.realesF} onCambio={handleChange} error={errores[v.id]} />
              : <VariableInput
                  key={v.id}
                  variable={v}
                  valor={analisis.realesF[v.id]}
                  onChange={handleChange}
                  error={errores[v.id]}
                />
        ))}
      </div>

      {legerAutorizado ? (
        <div className={`norm-row mt-lg${errores.leger ? ' norm-row--error' : ''}`}>
          <div className="norm-meta">
            <span className="norm-name">Resistencia aeróbica (Léger course navette 20 m) — nivel máximo alcanzado</span>
            <span className="norm-rango">1 – {NIVEL_LEGER_MAX} (número entero) · prueba máxima autorizada por PAR-Q+</span>
          </div>
          <div className="norm-input-row">
            <input
              className="norm-input" type="number" min={1} max={NIVEL_LEGER_MAX} step={1}
              value={palier} onChange={e => handleLeger(e.target.value)}
              aria-label="Nivel máximo Léger alcanzado"
            />
            <span className="norm-unit">nivel</span>
          </div>
          <p className="panel-desc" style={{ margin: 0 }}>Con el nivel alcanzado se estima el VO2máx (ecuación de Léger et al., 1988) y se califica con el baremo propio de PhysicalPicking por sexo (provisional).</p>
          {errores.leger && <p className="norm-error">{errores.leger}</p>}
        </div>
      ) : (
        <div className="rango-note mt-lg">
          <span className="rango-note-icon"><Icono n="info" /></span>
          <span>Resistencia aeróbica (Léger) no autorizada automáticamente por el PAR-Q+: esta prueba máxima se omite y quedará sin dato (no penaliza).</span>
        </div>
      )}

      {advertencias.length > 0 && (
        <div className="warn-list">
          <strong>Advertencias (valores fuera del rango de captura):</strong>
          <ul>
            {advertencias.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar <Icono n="derecha" />
      </button>
    </div>
  );
}

