/* StepParq.jsx — PAR-Q+ (paso 2). Selector Si/No con arbol condicional y poda. */
import { useState } from 'react';
import { todasVisibles, pendientes, evaluarParq, podarRespuestas, seccionCondicionesAbierta } from '../logic/parq';

export default function StepParq({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const parq = analisis.parq ?? { respuestas: {}, detalles: {} };
  const respuestas = parq.respuestas ?? {};
  const detalles = parq.detalles ?? {};
  const visibles = todasVisibles(respuestas);
  const faltan = pendientes(respuestas);
  const completo = faltan.length === 0;
  const resultado = completo ? evaluarParq(respuestas) : null;
  const [marcados, setMarcados] = useState([]);

  function marcarFaltantes(f) {
    const ids = f.map(p => (typeof p === 'string' ? p : p.id));
    setMarcados([]);
    setTimeout(() => setMarcados(ids), 40);
  }

  function handleRespuesta(id, valor) {
    setMarcados(prev => prev.filter(m => m !== id));
    const combinadas = { ...respuestas, [id]: valor };
    const podadas = podarRespuestas(combinadas, detalles);
    updateAnalisis({ parq: { respuestas: podadas.respuestas, detalles: podadas.detalles } });
  }

  function handleDetalle(id, valor) {
    updateAnalisis({ parq: { respuestas, detalles: { ...detalles, [id]: valor.slice(0, 300) } } });
  }

  function handleContinuar() {
    const p = pendientes(respuestas);
    if (p.length > 0) {
      marcarFaltantes(p);
      mostrarToast(`Responde todas las preguntas visibles antes de continuar (faltan ${p.length}).`, 'error');
      return;
    }
    setMarcados([]);
    onContinuar();
  }

  function renderPregunta(preg) {
    const valor = respuestas[preg.id];
    return (
      <div key={preg.id} className={`parq-pregunta${marcados.includes(preg.id) ? ' pregunta-faltante' : ''}`} style={preg.nivel > 0 ? { marginLeft: `${preg.nivel * 1.25}rem` } : undefined}>
        <p className="parq-texto">{preg.texto}</p>
        <div className="parq-opciones" role="radiogroup" aria-label={preg.id}>
          {['si', 'no'].map(op => (
            <button
              key={op}
              type="button"
              role="radio"
              aria-checked={valor === op}
              className={`parq-opcion${valor === op ? ' seleccionada' : ''}`}
              onClick={() => handleRespuesta(preg.id, op)}
            >
              {op === 'si' ? 'Sí' : 'No'}
            </button>
          ))}
        </div>
        {preg.detalle && valor === 'si' && (
          <input
            className="field-input parq-detalle"
            type="text"
            placeholder={preg.detalle}
            value={detalles[preg.id] ?? ''}
            maxLength={300}
            onChange={e => handleDetalle(preg.id, e.target.value)}
          />
        )}
      </div>
    );
  }

  const generales = visibles.filter(p => p.nivel === 0 && p.id.startsWith('g'));
  const condiciones = visibles.filter(p => !(p.nivel === 0 && p.id.startsWith('g')));
  const seccion2Abierta = seccionCondicionesAbierta(respuestas);

  return (
    <div className="panel-card">
      <h2 className="panel-title">PAR-Q+ — Aptitud para la actividad física</h2>
      <p className="panel-desc">
        Responde Sí o No a cada pregunta. Si respondes Sí a alguna pregunta general,
        se mostrarán preguntas de seguimiento. Todas las preguntas visibles son obligatorias.
      </p>

      <h3 className="section-subtitle">Sección 1 — Preguntas generales de salud</h3>
      <div className="parq-lista">{generales.map(renderPregunta)}</div>

      {seccion2Abierta && (
        <>
          <h3 className="section-subtitle">Sección 2 — Seguimiento sobre condiciones médicas</h3>
          <p className="panel-desc">Como respondiste Sí a alguna pregunta general, indica si tienes alguna de estas condiciones.</p>
          <div className="parq-lista">{condiciones.map(renderPregunta)}</div>
        </>
      )}

      {completo && resultado === 'apto' && (
        <div className="parq-resultado parq-apto">Según tus respuestas puedes ser más activo/a físicamente.</div>
      )}
      {completo && resultado === 'consultar' && (
        <div className="parq-resultado parq-consultar">
          Según tus respuestas, se recomienda consultar a un médico o profesional cualificado del ejercicio
          antes de aumentar tu actividad física. Puedes continuar, pero interpreta los resultados con precaución.
        </div>
      )}

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar →
      </button>
    </div>
  );
}
