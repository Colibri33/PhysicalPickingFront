/**
 * @module components/StepBreq
 * @description Paso del cuestionario BREQ-3 de motivación hacia el ejercicio (escala 0-4, 23 afirmaciones obligatorias).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): captura respuestas y valida completitud; el puntaje se delega a logic/breq.
 *  - D (Inversión de dependencias): ítems, faltantes y cálculo provienen de logic/breq; el estado se recibe por props.
 */
import { useState } from 'react';
import Icono from './Icono';
import { ITEMS_BREQ, NOMBRES_SUBESCALAS, faltantesBreq, calcularBreq } from '../logic/breq';

const OPCIONES = [0, 1, 2, 3, 4];

/** Convierte la lista de faltantes a ids, admitiendo cadenas u objetos con id.
 * @param {Array<string|{id: string}>} f - faltantes.
 * @returns {string[]} ids. */
function normalizarFaltantes(f) {
  return f.map(x => (typeof x === 'string' ? x : x.id));
}

/** Formulario del cuestionario BREQ-3 con resumen por subescala.
 * @param {Object} props
 * @param {Object} props.analisis - análisis actual (breq).
 * @param {Function} props.updateAnalisis - actualiza campos del análisis.
 * @param {Function} props.onContinuar - avanza al siguiente paso.
 * @param {Function} props.mostrarToast - muestra una notificación (mensaje, tipo).
 * @returns {JSX.Element} tarjeta del paso. */
export default function StepBreq({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const breq = analisis.breq ?? { respuestas: {} };
  const respuestas = breq.respuestas ?? {};
  const faltan = faltantesBreq(respuestas);
  const resultado = calcularBreq(respuestas);
  const [marcados, setMarcados] = useState([]);

  /** Resalta las preguntas sin responder.
   * @param {Array<string|{id: string}>} f - faltantes. */
  function marcarFaltantes(f) {
    const ids = normalizarFaltantes(f);
    // Reinicio previo y asignación diferida para reiniciar la animación de resaltado.
    setMarcados([]);
    setTimeout(() => setMarcados(ids), 40);
  }

  /** Registra una respuesta y retira el resaltado de esa pregunta.
   * @param {string} id - id del ítem.
   * @param {number} valor - respuesta 0-4. */
  function handleRespuesta(id, valor) {
    setMarcados(prev => prev.filter(m => m !== id));
    updateAnalisis({ breq: { respuestas: { ...respuestas, [id]: valor } } });
  }

  /** Exige todas las respuestas antes de avanzar. */
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
