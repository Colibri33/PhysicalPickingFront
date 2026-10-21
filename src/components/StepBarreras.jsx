/**
 * @module components/StepBarreras
 * @description Paso 4: cuestionario BBAQ-21 (21 afirmaciones, selector de 4 niveles).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): captura y validación de respuestas de barreras.
 *  - D (Inversión de dependencias): puntuación y validación en logic/barreras.
 */
import { useState } from 'react';
import Icono from './Icono';
import { ITEMS_BARRERAS, DIMENSIONES_BARRERAS, OPCIONES_BARRERAS, faltantesBarreras, calcularBarreras } from '../logic/barreras';

/**
 * Paso del cuestionario BBAQ-21.
 * @param {Object} props
 * @param {Object} props.analisis - Estado global del análisis.
 * @param {Function} props.updateAnalisis - Actualiza parcialmente el análisis.
 * @param {Function} props.onContinuar - Avanza al siguiente paso.
 * @param {Function} props.mostrarToast - Muestra notificaciones.
 * @returns {JSX.Element}
 */
export default function StepBarreras({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const barreras = analisis.barreras ?? { respuestas: {} };
  const respuestas = barreras.respuestas ?? {};
  const faltan = faltantesBarreras(respuestas);
  const resultado = calcularBarreras(respuestas);
  const [marcados, setMarcados] = useState([]);

  /** Marca las preguntas sin responder.
   * @param {Array} f - Identificadores faltantes. */
  function marcarFaltantes(f) {
    const ids = f.map(x => (typeof x === 'string' ? x : x.id));
    setMarcados([]);
    setTimeout(() => setMarcados(ids), 40);
  }

  /** Registra una respuesta.
   * @param {string} id - Pregunta.
   * @param {number} valor - Opción elegida. */
  function handleRespuesta(id, valor) {
    setMarcados(prev => prev.filter(m => m !== id));
    updateAnalisis({ barreras: { respuestas: { ...respuestas, [id]: valor } } });
  }

  /** Valida y avanza al siguiente paso. */
  function handleContinuar() {
    const f = faltantesBarreras(respuestas);
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
      <h2 className="panel-title">Barreras hacia la actividad física (BBAQ-21)</h2>
      <p className="panel-desc">
        Indica qué tan probable es cada afirmación en tu caso. Todas son obligatorias.
      </p>

      <div className="breq-lista">
        {ITEMS_BARRERAS.map((it, idx) => {
          const valor = respuestas[it.id];
          return (
            <div key={it.id} className={`breq-pregunta${marcados.includes(it.id) ? ' pregunta-faltante' : ''}`}>
              <p className="breq-texto">{idx + 1}. {it.texto}</p>
              <div className="breq-opciones breq-opciones-4" role="radiogroup" aria-label={`barrera-${it.id}`}>
                {OPCIONES_BARRERAS.map(op => (
                  <button
                    key={op.valor}
                    type="button"
                    role="radio"
                    aria-checked={valor === op.valor}
                    className={`breq-opcion${valor === op.valor ? ' seleccionada' : ''}`}
                    onClick={() => handleRespuesta(it.id, op.valor)}
                  >
                    {op.etiqueta}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {resultado && (
        <div className="breq-resumen">
          <h3 className="section-subtitle">Resumen por dimensión</h3>
          {Object.entries(resultado.dimensiones).map(([clave, puntaje]) => (
            <div key={clave} className="breq-barra-fila">
              <div className="bar-meta">
                <span className="bar-lbl">{DIMENSIONES_BARRERAS[clave].nombre}</span>
                <span className="bar-pct">{puntaje}/9</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(puntaje / 9) * 100}%`, background: puntaje >= 5 ? 'var(--warn)' : undefined }}
                />
              </div>
            </div>
          ))}
          {resultado.significativas.length > 0 ? (
            <p className="breq-rai">
              Puntajes de 5 o más indican una barrera significativa:{' '}
              {resultado.significativas.map(id => DIMENSIONES_BARRERAS[id].nombre).join(', ')}.
            </p>
          ) : (
            <p className="breq-rai">Ninguna dimensión alcanza 5 puntos: no se identifican barreras significativas.</p>
          )}
        </div>
      )}

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar <Icono n="derecha" />
      </button>
    </div>
  );
}
