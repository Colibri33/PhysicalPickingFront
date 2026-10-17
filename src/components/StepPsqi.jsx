/* StepPsqi.jsx — PSQI / ICSP-VC (paso 6). Calidad de sueño último mes. */
import { useState } from 'react';
import {
  OPCIONES_FRECUENCIA, OPCIONES_PROBLEMA, OPCIONES_CALIDAD, OPCIONES_CONVIVENCIA,
  ITEMS_PSQI_PERTURBACIONES, ITEMS_PSQI_COMPANERO,
  tieneCompanero, faltantesPsqi, calcularPsqi,
} from '../logic/psqi';

function Opciones({ id, valor, opciones, onChange }) {
  return (
    <div className="breq-opciones breq-opciones-4" role="radiogroup" aria-label={`psqi-${id}`}>
      {opciones.map(op => (
        <button
          key={op.valor} type="button" role="radio" aria-checked={valor === op.valor}
          className={`breq-opcion${valor === op.valor ? ' seleccionada' : ''}`}
          onClick={() => onChange(id, op.valor)}
        >
          {op.etiqueta}
        </button>
      ))}
    </div>
  );
}

export default function StepPsqi({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const psqi = analisis.psqi ?? { respuestas: {} };
  const respuestas = psqi.respuestas ?? {};
  const faltan = faltantesPsqi(respuestas);
  const resultado = calcularPsqi(respuestas);
  const conCompanero = tieneCompanero(respuestas);
  const [marcados, setMarcados] = useState([]);

  function marcarFaltantes(f) {
    const ids = f.map(id => String(id).replace(/_descripcion$/, ''));
    setMarcados([]);
    setTimeout(() => setMarcados(ids), 40);
  }

  function limpiarMarca(id) {
    setMarcados(prev => prev.filter(m => m !== id && m !== String(id).replace(/_descripcion$/, '')));
  }

  const cls = id => `breq-pregunta${marcados.includes(id) ? ' pregunta-faltante' : ''}`;

  function handle(id, valor) {
    limpiarMarca(id);
    const r2 = { ...respuestas, [id]: valor };
    if (id === 'p5j' && valor === 0) delete r2.p5j_descripcion;
    if (id === 'p10' && valor === 0) {
      for (const it of ITEMS_PSQI_COMPANERO) delete r2[it.id];
      delete r2.p10e_descripcion;
    }
    if (id === 'p10e' && valor === 0) delete r2.p10e_descripcion;
    updateAnalisis({ psqi: { respuestas: r2 } });
  }

  function handleTexto(id, valor) {
    limpiarMarca(id);
    updateAnalisis({ psqi: { respuestas: { ...respuestas, [id]: valor.slice(0, 500) } } });
  }

  function handleContinuar() {
    const f = faltantesPsqi(respuestas);
    if (f.length > 0) {
      marcarFaltantes(f);
      mostrarToast(`Responde todas las preguntas antes de continuar (faltan ${f.length}).`, 'error');
      return;
    }
    setMarcados([]);
    onContinuar();
  }

  return (
    <div className="panel-card">
      <h2 className="panel-title">Calidad de sueño (PSQI / ICSP-VC)</h2>
      <p className="panel-desc">
        Las siguientes preguntas se refieren a su forma habitual de dormir únicamente durante el último mes,
        en promedio. Responda lo más exacto posible a la mayoría de los días y noches. Todas son obligatorias.
      </p>

      <h3 className="section-subtitle">Hábitos del último mes</h3>
      <div className="breq-lista">
        <div className={cls('p1')}>
          <p className="breq-texto">1. Durante el último mes, ¿cuál ha sido, normalmente, su hora de acostarse?</p>
          <input className="field-input" type="time" value={respuestas.p1 ?? ''} onChange={e => handle('p1', e.target.value)} />
        </div>
        <div className={cls('p2')}>
          <p className="breq-texto">2. Durante el último mes, ¿cuánto tiempo habrá tardado en dormirse, normalmente, las noches del último mes? (Apunte el tiempo en minutos)</p>
          <input className="field-input" type="number" min={0} max={1440} step={1} value={respuestas.p2 ?? ''} onChange={e => handle('p2', e.target.value === '' ? undefined : Number(e.target.value))} />
        </div>
        <div className={cls('p3')}>
          <p className="breq-texto">3. Durante el último mes, ¿a qué hora se ha levantado habitualmente por la mañana?</p>
          <input className="field-input" type="time" value={respuestas.p3 ?? ''} onChange={e => handle('p3', e.target.value)} />
        </div>
        <div className={cls('p4')}>
          <p className="breq-texto">4. Durante el último mes, ¿cuántas horas calcula que habrá dormido verdaderamente cada noche durante el último mes? (El tiempo puede ser diferente al que usted permanezca en la cama)</p>
          <input className="field-input" type="number" min={0} max={24} step={0.5} value={respuestas.p4 ?? ''} onChange={e => handle('p4', e.target.value === '' ? undefined : Number(e.target.value))} />
        </div>
      </div>

      <h3 className="section-subtitle">5. Problemas para dormir a causa de…</h3>
      <div className="breq-lista">
        {ITEMS_PSQI_PERTURBACIONES.map(it => (
          <div key={it.id} className={cls(it.id)}>
            <p className="breq-texto">{it.id}. {it.texto}</p>
            <Opciones id={it.id} valor={respuestas[it.id]} opciones={OPCIONES_FRECUENCIA} onChange={handle} />
            {it.id === 'p5j' && respuestas.p5j > 0 && (
              <input className="field-input" type="text" placeholder="Describa las otras razones" maxLength={500}
                value={respuestas.p5j_descripcion ?? ''} onChange={e => handleTexto('p5j_descripcion', e.target.value)} />
            )}
          </div>
        ))}
      </div>

      <h3 className="section-subtitle">Medicación, somnolencia y calidad</h3>
      <div className="breq-lista">
        <div className={cls('p6')}>
          <p className="breq-texto">6. Durante el último mes, ¿cuántas veces habrá tomado medicinas (por su cuenta o recetadas por el médico) para dormir?</p>
          <Opciones id="p6" valor={respuestas.p6} opciones={OPCIONES_FRECUENCIA} onChange={handle} />
        </div>
        <div className={cls('p7')}>
          <p className="breq-texto">7. Durante el último mes, ¿cuántas veces ha sentido somnolencia mientras conducía, comía o desarrollaba alguna otra actividad?</p>
          <Opciones id="p7" valor={respuestas.p7} opciones={OPCIONES_FRECUENCIA} onChange={handle} />
        </div>
        <div className={cls('p8')}>
          <p className="breq-texto">8. Durante el último mes, ¿ha representado para usted mucho problema el «tener ánimos» para realizar alguna de las actividades detalladas en la pregunta anterior?</p>
          <Opciones id="p8" valor={respuestas.p8} opciones={OPCIONES_PROBLEMA} onChange={handle} />
        </div>
        <div className={cls('p9')}>
          <p className="breq-texto">9. Durante el último mes, ¿cómo valoraría en conjunto, la calidad de su sueño?</p>
          <Opciones id="p9" valor={respuestas.p9} opciones={OPCIONES_CALIDAD} onChange={handle} />
        </div>
      </div>

      <h3 className="section-subtitle">10. Compañero de habitación</h3>
      <div className="breq-lista">
        <div className={cls('p10')}>
          <p className="breq-texto">¿Duerme usted solo o acompañado?</p>
          <Opciones id="p10" valor={respuestas.p10} opciones={OPCIONES_CONVIVENCIA} onChange={handle} />
        </div>
        {conCompanero && (
          <>
            <p className="panel-desc">Si tiene pareja o compañero/a, pregúntele si usted durante el último mes ha tenido… (no puntúan, solo información adicional).</p>
            {ITEMS_PSQI_COMPANERO.map(it => (
              <div key={it.id} className={cls(it.id)}>
                <p className="breq-texto">{it.id}. {it.texto}</p>
                <Opciones id={it.id} valor={respuestas[it.id]} opciones={OPCIONES_FRECUENCIA} onChange={handle} />
                {it.id === 'p10e' && respuestas.p10e > 0 && (
                  <input className="field-input" type="text" placeholder="Describa los otros inconvenientes" maxLength={500}
                    value={respuestas.p10e_descripcion ?? ''} onChange={e => handleTexto('p10e_descripcion', e.target.value)} />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {resultado && (
        <div className="breq-resumen">
          <h3 className="section-subtitle">Resumen (0-21)</h3>
          {Object.entries(resultado.componentes).map(([k, v]) => (
            <div key={k} className="bar-meta"><span className="bar-lbl">{k}</span><span className="bar-pct">{v}/3</span></div>
          ))}
          <p className="breq-rai">
            Puntaje global: <strong>{resultado.puntajeGlobal}</strong> — {resultado.categoria}.
            {resultado.malDormidorBuysse ? ' (Buysse >5: mal dormidor).' : ' (Buysse ≤5: buen dormidor).'}
          </p>
        </div>
      )}

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar →
      </button>
    </div>
  );
}
