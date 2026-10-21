/* StepBreq.jsx — BREQ-3 (paso 3). Escala 0-4, 23 afirmaciones obligatorias. */
import { useState } from 'react';
import Icono from './Icono';
import { ITEMS_BREQ, NOMBRES_SUBESCALAS, faltantesBreq, calcularBreq } from '../logic/breq';

const OPCIONES = [0, 1, 2, 3, 4];

function normalizarFaltantes(f) {
  return f.map(x => (typeof x === 'string' ? x : x.id));
}

export default function StepBreq({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const breq = analisis.breq ?? { respuestas: {} };
  const respuestas = breq.respuestas ?? {};
  const faltan = faltantesBreq(respuestas);
  const resultado = calcularBreq(respuestas);
  const [marcados, setMarcados] = useState([]);

  function marcarFaltantes(f) {
    const ids = normalizarFaltantes(f);
    setMarcados([]);
    setTimeout(() => setMarcados(ids), 40);
  }

  function handleRespuesta(id, valor) {
    setMarcados(prev => prev.filter(m => m !== id));
    updateAnalisis({ breq: { respuestas: { ...respuestas, [id]: valor } } });
  }

  function handleContinuar() {
    const f = faltantesBreq(respuestas);
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
      <h2 className="panel-title">Motivación hacia el ejercicio (BREQ-3)</h2>
      <p className="panel-desc">
        Completa la frase “Yo hago ejercicio físico...” con cada afirmación.
        0 = Nada verdadero, 4 = Totalmente verdadero. Todas son obligatorias.
      </p>

      <div className="breq-lista">
        {ITEMS_BREQ.map((it, idx) => {
          const valor = respuestas[it.id];
          return (
            <div key={it.id} className={`breq-pregunta${marcados.includes(it.id) ? ' pregunta-faltante' : ''}`}>
              <p className="breq-texto">{idx + 1}. Yo hago ejercicio físico... {it.texto.charAt(0).toLowerCase() + it.texto.slice(1)}</p>
              <div className="breq-opciones" role="radiogroup" aria-label={`breq-${it.id}`}>
                <span className="breq-extremo">Nada verdadero</span>
                {OPCIONES.map(op => (
                  <button
                    key={op}
                    type="button"
                    role="radio"
                    aria-checked={valor === op}
                    className={`breq-opcion${valor === op ? ' seleccionada' : ''}`}
                    onClick={() => handleRespuesta(it.id, op)}
                  >
                    {op}
                  </button>
                ))}
                <span className="breq-extremo">Totalmente verdadero</span>
              </div>
            </div>
          );
        })}
      </div>

      {resultado && (
        <div className="breq-resumen">
          <h3 className="section-subtitle">Resumen por subescala</h3>
          {Object.entries(resultado.subescalas).map(([clave, prom]) => (
            <div key={clave} className="breq-barra-fila">
              <div className="bar-meta">
                <span className="bar-lbl">{NOMBRES_SUBESCALAS[clave]}</span>
                <span className="bar-pct">{prom.toFixed(2)}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(prom / 4) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="breq-rai">Índice de autodeterminación relativa (RAI): {resultado.rai}. Valores más altos indican una motivación más autónoma.</p>
        </div>
      )}

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar <Icono n="derecha" />
      </button>
    </div>
  );
}
