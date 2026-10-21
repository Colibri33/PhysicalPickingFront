/**
 * @module components/AsistenteIA
 * @description Interpretación del perfil mediante IA y chat de dudas sobre el resultado.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): presenta y solicita texto generado; no calcula resultados.
 *  - D (Inversión de dependencias): depende de iaService, parseInterpretacion y capacidades, no de un proveedor concreto.
 * Notas: recibe el resumen ya calculado; la IA solo redacta y explica.
 */
import { useState, useRef, useEffect } from 'react';
import { interpretarConIA, preguntarALaIA } from '../ia/iaService';
import { parseInterpretacion } from '../ia/parseInterpretacion';
import { capacidadesParaMostrar } from '../ia/capacidades';
import Icono from './Icono';

const SUGERENCIAS = ['¿Por qué me recomendaron este deporte?', '¿Qué debo mejorar primero?', '¿Qué significa el mapa 3D?', '¿Qué es el test de Léger?'];

/** Fila de lista con icono, título y detalle.
 * @param {Object} props
 * @param {string} props.icono - Nombre del icono.
 * @param {string} [props.titulo] - Texto destacado.
 * @param {string} props.detalle - Texto descriptivo.
 * @param {string} props.tono - Variante visual.
 * @returns {JSX.Element} */
function Fila({ icono, titulo, detalle, tono }) {
  return (
    <li className={`ia-fila ia-fila--${tono}`}>
      <span className="ia-fila-ico" aria-hidden="true"><Icono n={icono} /></span>
      <span>{titulo && <strong>{titulo}</strong>}{titulo && detalle ? ' · ' : ''}{detalle}</span>
    </li>
  );
}

/** Resumen visual de capacidades con su nivel en escala de cinco pasos.
 * @param {Object} props
 * @param {Object} props.capacidades - Niveles por capacidad.
 * @returns {JSX.Element|null} null si no hay capacidades. */
function Capacidades({ capacidades }) {
  const lista = capacidadesParaMostrar(capacidades);
  if (lista.length === 0) return null;
  return (
    <div>
      <span className="ia-etq">Tus capacidades de un vistazo</span>
      <div className="ia-caps">
        {lista.map(c => (
          <div key={c.id} className="ia-cap">
            <span className="ia-cap-ico" aria-hidden="true"><Icono n={c.icono} /></span>
            <div className="ia-cap-info">
              <span className="ia-cap-n">{c.nombre}</span>
              <div className={`ia-seg ia-nivel-${c.paso}`} aria-label={c.nivel}>
                {[1, 2, 3, 4, 5].map(n => <i key={n} className={n <= c.paso ? 'on' : ''} />)}
              </div>
            </div>
            <span className="ia-cap-niv">{c.nivel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const AVATAR_IA = `${import.meta.env?.BASE_URL ?? '/'}brand/ia-avatar.jpg`;

/** Vista de la interpretación estructurada, o texto plano si no pudo analizarse.
 * @param {Object} props
 * @param {Object} props.data - Interpretación procesada por parseInterpretacion.
 * @param {Object} props.capacidades - Niveles por capacidad.
 * @returns {JSX.Element} */
export function InterpretacionVista({ data, capacidades }) {
  if (data.textoPlano !== undefined) return <div className="ia-texto">{data.textoPlano}</div>;
  return (
    <div className="ia-interp">
      {data.resumen && (
        <div className="ia-lectura">
          <span className="ia-lectura-ico" aria-hidden="true"><Icono n="destellos" /></span>
          <p>{data.resumen}</p>
        </div>
      )}
      <Capacidades capacidades={capacidades} />
      {(data.fuertes.length > 0 || data.mejorar.length > 0) && (
        <div className="ia-cols">
          {data.fuertes.length > 0 && (
            <div className="ia-card ia-card--ok">
              <h4>Lo que haces bien</h4>
              <ul className="ia-filas">{data.fuertes.map((x, i) => <Fila key={i} icono="check" tono="ok" {...x} />)}</ul>
            </div>
          )}
          {data.mejorar.length > 0 && (
            <div className="ia-card ia-card--mejora">
              <h4>Para mejorar</h4>
              <ul className="ia-filas">{data.mejorar.map((x, i) => <Fila key={i} icono="tendencia" tono="mejora" {...x} />)}</ul>
            </div>
          )}
        </div>
      )}
      {data.deportes.length > 0 && (
        <div>
          <span className="ia-etq">Deportes que mejor te van</span>
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
      {data.precaucion && (
        <div className="ia-aviso-box"><span className="ia-aviso-ico" aria-hidden="true"><Icono n="alerta" /></span><p>{data.precaucion}</p></div>
      )}
    </div>
  );
}

/** Convierte **negrita** en elementos <strong>.
 * @param {string} t - Texto de una línea.
 * @returns {Array} fragmentos de texto y elementos. */
function enLinea(t) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (/^\*\*[^*]+\*\*$/.test(p) ? <strong key={i}>{p.slice(2, -2)}</strong> : p));
}

/** Renderiza Markdown mínimo (negrita, viñetas y párrafos) sin HTML arbitrario.
 * @param {Object} props
 * @param {string} props.texto - Mensaje a mostrar.
 * @returns {JSX.Element} */
function Mensaje({ texto }) {
  const bloques = [];
  let lista = null;
  texto.replace(/\r/g, '').split('\n').forEach(l => {
    const m = /^\s*(?:[-•*])\s+(.*)$/.exec(l);
    if (m) { if (!lista) { lista = []; bloques.push({ lista }); } lista.push(m[1]); }
    else { lista = null; if (l.trim()) bloques.push({ p: l.replace(/^#+\s*/, '') }); }
  });
  return (
    <>
      {bloques.map((b, i) => (b.lista
        ? <ul key={i}>{b.lista.map((x, j) => <li key={j}>{enLinea(x)}</li>)}</ul>
        : <p key={i}>{enLinea(b.p)}</p>))}
    </>
  );
}

/** Hora local actual formateada para el chat.
 * @returns {string} hora y minutos. */
const hora = () => new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });

/** Panel de interpretación con IA y chat de dudas.
 * @param {Object} props
 * @param {Object} props.resumen - Resumen calculado que se envía a la IA.
 * @returns {JSX.Element} */
export default function AsistenteIA({ resumen }) {
  const [interp, setInterp] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cajaRef = useRef(null);
  useEffect(() => {
    const c = cajaRef.current;
    if (c) c.scrollTop = c.scrollHeight; // Desplaza solo el chat, no la página.
  }, [msgs, enviando]);

  /** Solicita la interpretación a la IA. */
  async function generar() {
    setCargando(true); setError('');
    try { setInterp(await interpretarConIA(resumen)); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }

  /** Envía una pregunta al chat (máx. 1000 caracteres).
   * @param {string} [t] - Texto; si se omite usa el campo de entrada. */
  async function enviar(t) {
    const q = (t ?? texto).trim();
    if (!q || enviando) return;
    const nuevos = [...msgs, { role: 'user', content: q.slice(0, 1000), hora: hora() }];
    setMsgs(nuevos); setTexto(''); setEnviando(true);
    try {
      const r = await preguntarALaIA(resumen, nuevos);
      setMsgs([...nuevos, { role: 'assistant', content: r, hora: hora() }]);
    } catch (e) {
      setMsgs([...nuevos, { role: 'assistant', content: e.message, error: true, hora: hora() }]);
    } finally { setEnviando(false); }
  }

  return (
    <section className="ia-box">
      <h3 className="section-subtitle">Interpretación con IA</h3>
      {!interp && (
        <button className="btn btn-primary" onClick={generar} disabled={cargando} type="button">
          {cargando ? 'Analizando…' : <><Icono n="destellos" /> Generar interpretación con IA</>}
        </button>
      )}
      {error && <p className="ia-error">{error}</p>}
      {interp && (
        <>
          <InterpretacionVista data={parseInterpretacion(interp)} capacidades={resumen?.capacidadesFisicas} />
          <button className="btn btn-outline" onClick={generar} disabled={cargando} type="button">{cargando ? 'Analizando…' : 'Regenerar'}</button>
        </>
      )}
      <p className="ia-aviso">Texto generado por IA a partir de tus resultados. Es orientativo y no sustituye a un profesional de salud o entrenador.</p>

      <h3 className="section-subtitle mt-lg">Asistente: resuelve tus dudas</h3>
      <div className="chat">
        <div className="chat-head">
          <span className="chat-avatar" aria-hidden="true"><img src={AVATAR_IA} alt="" /></span>
          <div>
            <strong>Asistente PhysicalPicking</strong>
            <span className="chat-estado"><i /> En línea</span>
          </div>
        </div>
        <div className="chat-caja" ref={cajaRef}>
          <div className="chat-fila chat-fila--bot">
            <span className="chat-avatar chat-avatar--sm" aria-hidden="true"><img src={AVATAR_IA} alt="" /></span>
            <div className="chat-burbuja chat-burbuja--bot"><p>¡Hola! Soy tu asistente. Puedo explicarte tus resultados en palabras simples. ¿Qué quieres saber?</p></div>
          </div>
          {msgs.length === 0 && (
            <div className="chat-sugs">
              {SUGERENCIAS.map(s => <button key={s} type="button" className="chat-sug" onClick={() => enviar(s)}>{s}</button>)}
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`chat-fila chat-fila--${m.role === 'user' ? 'yo' : 'bot'}`}>
              {m.role !== 'user' && <span className="chat-avatar chat-avatar--sm" aria-hidden="true"><img src={AVATAR_IA} alt="" /></span>}
              <div className={`chat-burbuja chat-burbuja--${m.role === 'user' ? 'yo' : 'bot'}${m.error ? ' chat-burbuja--error' : ''}`}>
                {m.role === 'user' ? <p>{m.content}</p> : <Mensaje texto={m.content} />}
                <span className="chat-hora">{m.hora}</span>
              </div>
            </div>
          ))}
          {enviando && (
            <div className="chat-fila chat-fila--bot">
              <span className="chat-avatar chat-avatar--sm" aria-hidden="true"><img src={AVATAR_IA} alt="" /></span>
              <div className="chat-burbuja chat-burbuja--bot"><span className="chat-puntos"><i /><i /><i /></span></div>
            </div>
          )}
        </div>
        <form className="chat-form" onSubmit={e => { e.preventDefault(); enviar(); }}>
          <input className="chat-input" value={texto} maxLength={1000} placeholder="Escribe tu pregunta…" onChange={e => setTexto(e.target.value)} />
          <button className="chat-enviar" type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"><Icono n="enviar" /></button>
        </form>
      </div>
    </section>
  );
}
