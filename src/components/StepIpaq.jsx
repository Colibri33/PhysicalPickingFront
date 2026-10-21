/* StepIpaq.jsx — IPAQ versión corta (paso 5). Días 0-7 + tiempo por día. */
import { useState } from 'react';
import Icono from './Icono';
import { ITEMS_IPAQ, faltantesIpaq, calcularIpaq } from '../logic/ipaq';

const DIAS = [0, 1, 2, 3, 4, 5, 6, 7];

function TiempoDia({ id, minutos, noSabe, onChange }) {
  const horas = typeof minutos === 'number' ? Math.floor(minutos / 60) : '';
  const mins = typeof minutos === 'number' ? minutos % 60 : '';
  return (
    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <label className="field-label" style={{ minWidth: '7rem' }}>
        Horas
        <input
          className="field-input" type="number" min={0} max={16} step={1}
          value={horas} disabled={noSabe}
          onChange={e => {
            const h = e.target.value === '' ? 0 : Number(e.target.value);
            const m = typeof minutos === 'number' ? minutos % 60 : 0;
            onChange(id, h * 60 + m);
          }}
        />
      </label>
      <label className="field-label" style={{ minWidth: '7rem' }}>
        Minutos
        <input
          className="field-input" type="number" min={0} max={59} step={1}
          value={mins} disabled={noSabe}
          onChange={e => {
            const m = e.target.value === '' ? 0 : Number(e.target.value);
            const h = typeof minutos === 'number' ? Math.floor(minutos / 60) : 0;
            onChange(id, h * 60 + m);
          }}
        />
      </label>
      <label style={{ fontSize: '.8rem', display: 'flex', gap: '.35rem', alignItems: 'center' }}>
        <input
          type="checkbox" checked={!!noSabe}
          onChange={e => onChange(id, e.target.checked ? 'no_sabe' : 0)}
        />
        No sabe / no está seguro
      </label>
    </div>
  );
}

export default function StepIpaq({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const ipaq = analisis.ipaq ?? { respuestas: {} };
  const respuestas = ipaq.respuestas ?? {};
  const faltan = faltantesIpaq(respuestas);
  const resultado = calcularIpaq(respuestas);
  const [marcados, setMarcados] = useState([]);

  function marcarFaltantes(f) {
    setMarcados([]);
    setTimeout(() => setMarcados(f), 40);
  }

  function handleDias(id, valor) {
    setMarcados(prev => prev.filter(m => m !== id));
    const r2 = { ...respuestas, [id]: valor };
    // Al poner 0 días se limpia el tiempo; al poner >0 se inicializa en 0 si estaba vacío.
    const mapaTiempo = { i1: 'i2', i3: 'i4', i5: 'i6' };
    const t = mapaTiempo[id];
    if (t) {
      if (valor === 0) delete r2[t];
      else if (r2[t] === undefined) r2[t] = 0;
    }
    updateAnalisis({ ipaq: { respuestas: r2 } });
  }

  function handleTiempo(id, valor) {
    setMarcados(prev => prev.filter(m => m !== id));
    updateAnalisis({ ipaq: { respuestas: { ...respuestas, [id]: valor } } });
  }

  function handleContinuar() {
    const f = faltantesIpaq(respuestas);
    if (f.length > 0) {
      marcarFaltantes(f);
      mostrarToast(`Responde todas las preguntas antes de continuar (faltan ${f.length}).`, 'error');
      return;
    }
    setMarcados([]);
    onContinuar();
  }

  function bloqueDias(idTiempo, idDias, titulo, ayuda) {
    const dias = respuestas[idDias];
    const visibleTiempo = typeof dias === 'number' && dias > 0;
    const falta = marcados.includes(idDias) || marcados.includes(idTiempo);
    return (
      <div className={`breq-pregunta${falta ? ' pregunta-faltante' : ''}`}>
        <p className="breq-texto"><strong>{titulo}</strong></p>
        <p className="breq-texto">{ITEMS_IPAQ.find(i => i.id === idDias).texto}</p>
        {ITEMS_IPAQ.find(i => i.id === idDias).ayuda && (
          <p className="panel-desc" style={{ margin: 0 }}>{ITEMS_IPAQ.find(i => i.id === idDias).ayuda}</p>
        )}
        <div className="breq-opciones" role="radiogroup" aria-label={`ipaq-${idDias}`}>
          {DIAS.map(d => (
            <button
              key={d} type="button" role="radio" aria-checked={dias === d}
              className={`breq-opcion${dias === d ? ' seleccionada' : ''}`}
              onClick={() => handleDias(idDias, d)}
            >
              {d}
            </button>
          ))}
          <span className="breq-extremo">días/semana</span>
        </div>
        {visibleTiempo && (
          <>
            <p className="breq-texto">{ITEMS_IPAQ.find(i => i.id === idTiempo).texto}</p>
            {ayuda && <p className="panel-desc" style={{ margin: 0 }}>{ayuda}</p>}
            <TiempoDia
              id={idTiempo}
              minutos={respuestas[idTiempo]}
              noSabe={respuestas[idTiempo] === 'no_sabe'}
              onChange={handleTiempo}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="panel-card">
      <h2 className="panel-title">Actividad física actual (IPAQ corto)</h2>
      <p className="panel-desc">
        Piense en todas las actividades que realizó en los últimos 7 días, solo las de por lo menos
        10 minutos seguidos. Todas las preguntas son obligatorias.
      </p>

      <div className="breq-lista">
        {bloqueDias('i2', 'i1', 'Actividad vigorosa', 'Esfuerzo físico intenso que lo hace respirar mucho más intensamente que lo normal.')}
        {bloqueDias('i4', 'i3', 'Actividad moderada', 'Esfuerzo físico moderado que lo hace respirar algo más intensamente que lo normal.')}
        {bloqueDias('i6', 'i5', 'Caminata', null)}

        <div className={`breq-pregunta${marcados.includes('i7') ? ' pregunta-faltante' : ''}`}>
          <p className="breq-texto"><strong>Tiempo sentado</strong></p>
          <p className="breq-texto">{ITEMS_IPAQ.find(i => i.id === 'i7').texto}</p>
          <p className="panel-desc" style={{ margin: 0 }}>{ITEMS_IPAQ.find(i => i.id === 'i7').ayuda}</p>
          <TiempoDia id="i7" minutos={respuestas.i7} noSabe={respuestas.i7 === 'no_sabe'} onChange={handleTiempo} />
        </div>
      </div>

      {resultado && (
        <div className="breq-resumen">
          <h3 className="section-subtitle">Resumen MET-min/semana</h3>
          <div className="bar-meta"><span className="bar-lbl">Vigorosa (8 MET)</span><span className="bar-pct">{resultado.met.vigorosa}</span></div>
          <div className="bar-meta"><span className="bar-lbl">Moderada (4 MET)</span><span className="bar-pct">{resultado.met.moderada}</span></div>
          <div className="bar-meta"><span className="bar-lbl">Caminata (3,3 MET)</span><span className="bar-pct">{resultado.met.caminata}</span></div>
          <div className="bar-meta"><span className="bar-lbl">Total</span><span className="bar-pct">{resultado.met.total}</span></div>
          <p className="breq-rai">Nivel de actividad física: <strong>{resultado.categoria}</strong>.</p>
        </div>
      )}

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar <Icono n="derecha" />
      </button>
    </div>
  );
}
