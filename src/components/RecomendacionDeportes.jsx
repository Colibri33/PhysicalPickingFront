/**
 * @module components/RecomendacionDeportes
 * @description Paso final: recomendación a partir del ranking de 13 familias del DecisionEngine.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): presentar la recomendación; no calcula nada propio.
 *  - D (Inversión de dependencias): consume el flujo de src/evaluacion, la misma fuente del informe final.
 * Notas: si ninguna familia es firme no se muestra un deporte, sino el Estado 3 o los datos faltantes (R-DEC-03).
 */
import { useMemo, useState } from 'react';
import Icono from './Icono';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../evaluacion';
import { MATRIZ_DEMANDA } from '../evaluacion/decision/matrizDemanda';
import { motivosNoFirme, textoMotivosNoFirme } from '../evaluacion/decision/ranking';
import MapaCorporalBrechas from './MapaCorporalBrechas';
import PlanAdaptacion, { AlertaAntecedentes } from './PlanAdaptacion';

const ETIQUETAS_CAPACIDAD = {
  fuerza: 'Fuerza',
  fuerza_explosiva: 'Fuerza explosiva',
  vo2max: 'Resistencia aeróbica',
  flexibilidad: 'Flexibilidad',
  equilibrio: 'Equilibrio',
};

/** Motivo de demanda según la clasificación de Mitchell.
 * @param {string} familiaId - Identificador de la familia.
 * @param {string} capacidad - Capacidad evaluada.
 * @returns {string|null} motivo, o null si no aplica. */
function motivoMitchell(familiaId, capacidad) {
  const fam = MATRIZ_DEMANDA.find(f => f.id === familiaId);
  const m = /^(I+)([ABC])$/.exec(fam?.mitchell ?? '');
  if (!m) return null;
  if (capacidad === 'vo2max' && m[2] === 'C') return 'demanda metabólica (Mitchell dinámico C)';
  if (capacidad === 'fuerza' && m[1] === 'III') return 'demanda de fuerza estática (Mitchell estático III)';
  return null;
}

/** Pantalla de recomendación deportiva.
 * @param {Object} props
 * @param {Object} props.analisis - Estado global del análisis.
 * @param {Function} [props.onNuevo] - Inicia una evaluación nueva.
 * @param {Function} [props.onGuardar] - Guarda el análisis.
 * @param {boolean} [props.analisisGuardado] - Indica si ya se guardó.
 * @param {boolean} [props.guardando] - Guardado en curso.
 * @returns {JSX.Element} */
export default function RecomendacionDeportes({ analisis, onNuevo, onGuardar, analisisGuardado, guardando }) {
  const flujo = useMemo(
    () => ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis)),
    [analisis],
  );
  const ranking = flujo.etapas.ranking.familias ?? [];
  // Recomendación firme: primera familia sin carencias definitorias ni brechas severas (R-DEC-03).
  const recomendada = flujo.etapas.ranking.recomendada ?? null;
  const lider = ranking[0] ?? null;
  const liderProvisional = recomendada && lider && lider.firme === false;
  const recomendaciones = ranking.slice(0, 5);
  const top = recomendada;
  const plan = flujo.etapas.planAdaptacion;
  const [familiaSel, setFamiliaSel] = useState(() => recomendada?.id ?? '');

  return (
    <div className="panel-card">
      <h2 className="panel-title">Recomendacion de deportes</h2>
      <p className="panel-desc">
        Basado en tus capacidades fisicas evaluadas, el sistema
        identifica los deportes y actividades con mayor afinidad para tu perfil funcional.
        Esta recomendacion es una <strong>orientacion de tendencia</strong>, no una
        seleccion definitiva.
      </p>

      <AlertaAntecedentes alertas={flujo.informe.seguridad.alertas} />

      {top ? (
        <div className="rec-perfil-banner" style={{ borderColor: 'var(--purple, #5B3FE0)' }}>
          <span className="rec-perfil-etiqueta">Recomendación firme</span>
          <span className="rec-perfil-nombre">{top.nombre ?? top.id}</span>
          <span className="rec-perfil-pct">{top.porcentaje ?? '—'}{top.porcentaje !== null && top.porcentaje !== undefined ? '%' : ''}</span>
        </div>
      ) : (
        <PlanAdaptacion plan={plan} />
      )}
      {liderProvisional && (
        <div className="ranking-disclaimer" style={{ marginBottom: '1rem' }}>
          <span className="ranking-disclaimer-icon"><Icono n="alerta" /></span>
          <span>
            {lider.nombre ?? lider.id} tiene {lider.porcentaje ?? '—'}% pero no es recomendable:
            {' '}{textoMotivosNoFirme(lider).join('; ')}.
          </span>
        </div>
      )}

      {ranking.length > 0 && (
        <MapaCorporalBrechas flujo={flujo} familiaId={familiaSel} onFamiliaChange={setFamiliaSel} sexo={analisis.participante?.genero} />
      )}

      {!top && recomendaciones.length > 0 && (
        <h3 className="section-subtitle mt-lg">Compatibilidad por familia (ninguna recomendable todavía)</h3>
      )}

      <div className="rec-lista">
        {recomendaciones.map((fam, idx) => {
          const relevantes = (fam.brechas ?? []).filter(b => b.relevanteMitchell);
          const noFirme = fam.firme === false;
          const severa = motivosNoFirme(fam).some(m => m.tipo === 'brecha_severa');
          return (
            <div key={fam.id}
              className={`rec-card rec-card--clic${familiaSel === fam.id ? ' rec-card--sel' : ''}${noFirme ? ' rec-card--no-firme' : ''}`}
              role="button" tabIndex={0} aria-pressed={familiaSel === fam.id}
              onClick={() => setFamiliaSel(familiaSel === fam.id ? '' : fam.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFamiliaSel(familiaSel === fam.id ? '' : fam.id); } }}>
              <div className="rec-card-header">
                <div className="rec-card-rank" style={{ background: noFirme ? '#b9b3d6' : idx === 0 ? '#5B3FE0' : idx === 1 ? '#22D3EE' : '#8b86a8' }}>
                  #{idx + 1}
                </div>
                <div className="rec-card-meta">
                  <span className="rec-card-nombre">{fam.nombre ?? fam.id}</span>
                  <span className="rec-card-afinidad">
                    {fam.porcentaje ?? '—'}{fam.porcentaje !== null && fam.porcentaje !== undefined ? '% de compatibilidad' : ''} · cobertura {Math.round((fam.cobertura ?? 0) * 5)}/5
                  </span>
                  {noFirme && (
                    <span className="rec-card-no-firme">
                      No recomendable ({severa ? 'brecha severa' : 'faltan datos'}): {textoMotivosNoFirme(fam).join('; ')}
                    </span>
                  )}
                  {relevantes.length > 0 && (
                    <span className="rec-card-tags">
                      {relevantes.map((b, i) => (
                        <span key={i} className="rec-tag" style={{ borderColor: '#b45309', color: '#b45309' }}>
                          {ETIQUETAS_CAPACIDAD[b.capacidad] ?? b.capacidad}: demanda {b.demanda}
                          {motivoMitchell(fam.id, b.capacidad) ? ` (${motivoMitchell(fam.id, b.capacidad)})` : ''}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              <div className="rec-card-bar-track">
                <div
                  className="rec-card-bar-fill"
                  style={{ width: `${fam.porcentaje ?? 0}%`, background: noFirme ? '#c9c3e3' : idx === 0 ? '#5B3FE0' : '#22D3EE' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {recomendaciones.length === 0 && (
        <div className="empty-text" style={{ textAlign: 'center', padding: '2rem' }}>
          No se encontraron deportes recomendados. Completa todas las variables
          para obtener recomendaciones precisas.
        </div>
      )}

      <div className="rec-disclaimer">
        <span className="ranking-disclaimer-icon"><Icono n="info" /></span>
        <span>
          Las recomendaciones muestran compatibilidad ordinal con cada familia
          (demanda = nivel mínimo) y sus brechas fisiológicas relevantes según
          Mitchell. Una familia no es recomendable si tiene su demanda definitoria
          sin evaluar o una brecha severa (nivel Bajo o Muy bajo donde exige Alta
          o Muy alta); si ninguna lo es, no se recomienda un deporte y se orienta
          a una fase de adaptación. Toca una familia para verla en el mapa
          corporal. No reemplazan la orientacion de un especialista en ciencias
          del deporte.
        </span>
      </div>

      <div className="action-row mt-lg">
        {onGuardar && (
          <button className="btn btn-primary" onClick={onGuardar} disabled={analisisGuardado || guardando} type="button">
            {guardando ? 'Guardando...' : analisisGuardado ? <>Analisis guardado <Icono n="check" /></> : 'Guardar en historial'}
          </button>
        )}
        {onNuevo && (
          <button className="btn btn-outline" onClick={onNuevo} type="button">＋ Nuevo analisis</button>
        )}
      </div>
    </div>
  );
}
