/**
 * @module components/StepFisicas
 * @description Paso de la batería física: dinamometría, salto, flexibilidad, equilibrio bilateral y resistencia aeróbica (Léger).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): captura, valida y normaliza los valores de la batería; los rangos y la normalización se delegan a logic/modelo.
 *  - O (Abierto/Cerrado): una variable estándar nueva se agrega a VARS_FISICAS y se renderiza con VariableInput sin modificar este paso.
 *  - D (Inversión de dependencias): rangos, validación y autorización PAR-Q+ provienen de logic/modelo y logic/parq.
 * Notas: el Léger registra el último nivel máximo alcanzado (entero) y solo se exige si el PAR-Q+ lo autoriza; el VO2máx se estima y califica en evaluacion/normalizacion/leger.js.
 */
import { useState } from 'react';
import Icono from './Icono';
import VariableInput from './VariableInput';
import { VARS_FISICAS, EQUILIBRIO_POR_PIERNA_MAX, FUERZA_POR_MANO_MAX, validarFormularioVariables, normalizarValor, esNivelLegerValido } from '../logic/modelo';
import { evaluarParq } from '../logic/parq';

const LEGER_PALIER_MAX = 21;

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
  const v = VARS_FISICAS.find(x => x.id === 'fuerza');
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
  const v = VARS_FISICAS.find(x => x.id === 'equilibrio');
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

/** Formulario de la batería física con validación y normalización a 0-100.
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
    setAdvertencias(prev => prev.filter(a => !a.startsWith(VARS_FISICAS.find(v => v.id === id)?.nombre)));
  }

  /** Guarda el nivel Léger en ambos almacenamientos (leger.palier y realesF.resistencia).
   * @param {string} valor - nivel ingresado. */
  function handleLeger(valor) {
    if (errores.leger || errores.resistencia) setErrores(e => { const c = { ...e }; delete c.leger; delete c.resistencia; return c; });
    updateAnalisis({ leger: { palier: valor }, realesF: { ...analisis.realesF, resistencia: valor } });
  }

  /** Valida todos los campos, normaliza a porcentajes y avanza. */
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
      VARS_FISICAS.filter(v => v.id !== 'resistencia'),
      analisis.realesF,
    );

    const palierNum = Number(palier);
    const palierOk = !legerAutorizado || (palier !== '' && esNivelLegerValido(palierNum));
    if (!palierOk) mapaExtra.leger = `Resistencia aeróbica (Léger): registra el nivel máximo alcanzado (número entero de 1 a ${LEGER_PALIER_MAX}).`;

    if (!ok || mapaExtra.equilibrio || mapaExtra.fuerza || mapaExtra.leger) {
      const mapa = { ...mapaExtra };
      lista.forEach(msg => {
        const v = VARS_FISICAS.find(v => msg.startsWith(v.nombre));
        if (v) mapa[v.id] = msg;
      });
      setErrores(mapa);
      mostrarToast(`${lista.length} campo(s) obligatorio(s) sin completar.`, 'error');
      return;
    }

    setAdvertencias(warns);

    // Normaliza a 0-100 (el clamp acota valores fuera de rango). Sin autorización, la resistencia
    // vale 0 en el cálculo heredado y queda sin dato (sin penalización) en el flujo definitivo.
    const fisicas = {};
    VARS_FISICAS.forEach(v => {
      if (v.id === 'resistencia' && !legerAutorizado) {
        fisicas[v.id] = 0;
        return;
      }
      fisicas[v.id] = normalizarValor(
        parseFloat(v.id === 'resistencia' ? palier : analisis.realesF[v.id]),
        v.minimo, v.maximo, v.direccion
      );
    });

    // Espeja el nivel Léger en ambos almacenamientos.
    updateAnalisis({ realesF: { ...analisis.realesF, resistencia: legerAutorizado ? palier : '' }, fisicas });

    if (warns.length > 0) {
      mostrarToast(`${warns.length} valor(es) fuera del rango de referencia — se aplicó clamp.`, 'info');
    } else {
      mostrarToast('Variables fisicas registradas y normalizadas.', 'success');
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
          Los rangos de referencia cubren el espectro de población general activa.
          Valores fuera del rango se aceptan como advertencia y se normalizan al límite más cercano.
        </span>
      </div>

      <div className="norm-formulario">
        {VARS_FISICAS.filter(v => v.id !== 'resistencia').map(v => (
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
            <span className="norm-rango">1 – {LEGER_PALIER_MAX} (número entero) · prueba máxima autorizada por PAR-Q+</span>
          </div>
          <div className="norm-input-row">
            <input
              className="norm-input" type="number" min={1} max={LEGER_PALIER_MAX} step={1}
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
          <strong>Advertencias (valores fuera de rango de referencia):</strong>
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

