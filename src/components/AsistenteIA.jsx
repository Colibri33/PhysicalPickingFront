/* AsistenteIA.jsx — interpretación con IA (DeepSeek) + chatbot de dudas.
   Recibe el resumen ya calculado; la IA solo redacta/explica, no calcula. */
import { useState, useRef, useEffect } from 'react';
import { interpretarConIA, preguntarALaIA } from '../ia/iaService';
import { parseInterpretacion } from '../ia/parseInterpretacion';

function Lista({ items, icono }) {
  return (
    <ul className="ia-lista">
      {items.map((t, i) => <li key={i}><span className="ia-ico" aria-hidden="true">{icono}</span><span>{t}</span></li>)}
    </ul>
  );
}

export function InterpretacionVista({ data }) {
  if (data.textoPlano !== undefined) return <div className="ia-texto">{data.textoPlano}</div>;
  return (
    <div className="ia-interp">
      {data.lectura && (
        <div className="ia-lectura">
          <span className="ia-etq">Lectura general</span>
          <p>{data.lectura}</p>
        </div>
      )}
      {(data.fortalezas.length > 0 || data.mejorar.length > 0) && (
        <div className="ia-cols">
          {data.fortalezas.length > 0 && (
            <div className="ia-card ia-card--ok"><h4>💪 Fortalezas</h4><Lista items={data.fortalezas} icono="✓" /></div>
          )}
          {data.mejorar.length > 0 && (
            <div className="ia-card ia-card--mejora"><h4>🎯 A mejorar</h4><Lista items={data.mejorar} icono="↗" /></div>
          )}
        </div>
      )}
      {data.deportes.length > 0 && (
        <div>
          <span className="ia-etq">Deportes recomendados</span>
          <div className="ia-deportes">
            {data.deportes.map((d, i) => (
              <div key={i} className="ia-dep">
                <div className="ia-dep-top">
                  <span className="ia-dep-n">{i + 1}</span>
                  <strong>{d.nombre}</strong>
                  {d.porcentaje !== null && <span className="ia-dep-pct">{d.porcentaje}%</span>}
                </div>
                {d.porcentaje !== null && <div className="ia-dep-bar"><div style={{ width: `${Math.min(100, Math.max(0, d.porcentaje))}%` }} /></div>}
                {d.razon && <p>{d.razon}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {data.precauciones.length > 0 && (
        <div className="ia-card ia-card--aviso"><h4>⚠️ Precauciones</h4><Lista items={data.precauciones} icono="•" /></div>
      )}
    </div>
  );
}

const SUGERENCIAS = ['¿Por qué me recomendaron este deporte?', '¿Qué debo mejorar primero?', '¿Qué significa el mapa 3D?', '¿Qué es el test de Léger?'];

export default function AsistenteIA({ resumen }) {
  const [interp, setInterp] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fin = useRef(null);
  useEffect(() => { fin.current?.scrollIntoView?.({ block: 'nearest' }); }, [msgs, enviando]);

  async function generar() {
    setCargando(true); setError('');
    try { setInterp(await interpretarConIA(resumen)); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }

  async function enviar(t) {
    const q = (t ?? texto).trim();
    if (!q || enviando) return;
    const nuevos = [...msgs, { role: 'user', content: q.slice(0, 1000) }];
    setMsgs(nuevos); setTexto(''); setEnviando(true);
    try {
      const r = await preguntarALaIA(resumen, nuevos);
      setMsgs([...nuevos, { role: 'assistant', content: r }]);
    } catch (e) {
      setMsgs([...nuevos, { role: 'assistant', content: `⚠ ${e.message}`, error: true }]);
    } finally { setEnviando(false); }
  }

  return (
    <section className="ia-box">
      <h3 className="section-subtitle">Interpretación con IA</h3>
      {!interp && (
        <button className="btn btn-primary" onClick={generar} disabled={cargando} type="button">
          {cargando ? 'Analizando…' : '✨ Generar interpretación con IA'}
        </button>
      )}
      {error && <p className="ia-error">{error}</p>}
      {interp && (
        <>
          <InterpretacionVista data={parseInterpretacion(interp)} />
          <button className="btn btn-outline" onClick={generar} disabled={cargando} type="button">{cargando ? 'Analizando…' : 'Regenerar'}</button>
        </>
      )}
      <p className="ia-aviso">Texto generado por IA (DeepSeek) a partir de tus resultados. Es orientativo y no sustituye a un profesional de salud o entrenador.</p>

      <h3 className="section-subtitle mt-lg">Asistente: resuelve tus dudas</h3>
      <div className="ia-chat">
        {msgs.length === 0 && (
          <div className="ia-sugs">
            {SUGERENCIAS.map(s => <button key={s} type="button" className="ia-sug" onClick={() => enviar(s)}>{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => <div key={i} className={`ia-msg ia-${m.role}${m.error ? ' ia-msg-error' : ''}`}>{m.content}</div>)}
        {enviando && <div className="ia-msg ia-assistant">Escribiendo…</div>}
        <div ref={fin} />
      </div>
      <form className="ia-form" onSubmit={e => { e.preventDefault(); enviar(); }}>
        <input className="field-input" value={texto} maxLength={1000} placeholder="Escribe tu pregunta…" onChange={e => setTexto(e.target.value)} />
        <button className="btn btn-primary" type="submit" disabled={enviando || !texto.trim()}>Enviar</button>
      </form>
    </section>
  );
}
