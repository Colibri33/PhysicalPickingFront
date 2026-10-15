/* ─── RecomendacionDeportes.jsx v7 ───
   Paso final: recomendación desde el ranking del DecisionEngine
   (13 familias, matriz + Mitchell). No calcula nada propio: consume
   el flujo de src/evaluacion, la misma fuente del informe final.
*/
import { useMemo } from 'react';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../evaluacion';
import { MATRIZ_DEMANDA } from '../evaluacion/decision/matrizDemanda';

const ETIQUETAS_CAPACIDAD = {
  fuerza: 'Fuerza',
  fuerza_explosiva: 'Fuerza explosiva',
  vo2max: 'Resistencia aeróbica',
  flexibilidad: 'Flexibilidad',
  equilibrio: 'Equilibrio',
};

function motivoMitchell(familiaId, capacidad) {
  const fam = MATRIZ_DEMANDA.find(f => f.id === familiaId);
  const m = /^(I+)([ABC])$/.exec(fam?.mitchell ?? '');
  if (!m) return null;
  if (capacidad === 'vo2max' && m[2] === 'C') return 'demanda metabólica (Mitchell dinámico C)';
  if (capacidad === 'fuerza' && m[1] === 'III') return 'demanda de fuerza estática (Mitchell estático III)';
  return null;
}

export default function RecomendacionDeportes({ analisis, onNuevo, onGuardar, analisisGuardado, guardando }) {
  const flujo = useMemo(
    () => ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis)),
    [analisis],
  );
  const ranking = flujo.etapas.ranking.familias ?? [];
  // Recomendación firme: primera familia sin carencias definitorias
  // (registros antiguos sin `firme` conservan el orden del motor).
  const recomendada = flujo.etapas.ranking.recomendada ?? ranking[0] ?? null;
  const lider = ranking[0] ?? null;
  const liderProvisional = lider && lider.firme === false;
  const recomendaciones = ranking.slice(0, 5);
  const top = recomendada ?? recomendaciones[0] ?? null;

  return (
    <div className="panel-card">
      <h2 className="panel-title">Recomendacion de deportes</h2>
      <p className="panel-desc">
        Basado en tus capacidades fisicas evaluadas, el sistema
        identifica los deportes y actividades con mayor afinidad para tu perfil funcional.
        Esta recomendacion es una <strong>orientacion de tendencia</strong>, no una
        seleccion definitiva.
      </p>

      {/* Resumen de la familia principal */}
      {top && (
        <div className="rec-perfil-banner" style={{ borderColor: 'var(--purple, #5B3FE0)' }}>
          <span className="rec-perfil-etiqueta">Mayor compatibilidad firme</span>
          <span className="rec-perfil-nombre">{top.nombre ?? top.id}</span>
          <span className="rec-perfil-pct">{top.porcentaje ?? '—'}{top.porcentaje !== null && top.porcentaje !== undefined ? '%' : ''}</span>
        </div>
      )}
      {liderProvisional && (
        <div className="ranking-disclaimer" style={{ marginBottom: '1rem' }}>
          <span className="ranking-disclaimer-icon">⚠</span>
          <span>
            {lider.nombre ?? lider.id} lidera por compatibilidad ({lider.porcentaje ?? '—'}%) pero tiene
            sin evaluar su demanda definitoria ({(lider.carencias ?? []).map(c => `${ETIQUETAS_CAPACIDAD[c.capacidad] ?? c.capacidad} (demanda ${c.demanda})`).join(', ')}):
            es una coincidencia provisional, no la recomendación firme.
          </span>
        </div>
      )}

      {/* Lista de familias recomendadas (fuente unica: ranking del DecisionEngine) */}
      <div className="rec-lista">
        {recomendaciones.map((fam, idx) => {
          const relevantes = (fam.brechas ?? []).filter(b => b.relevanteMitchell);
          return (
            <div key={fam.id} className="rec-card">
              <div className="rec-card-header">
                <div className="rec-card-rank" style={{ background: idx === 0 ? '#5B3FE0' : idx === 1 ? '#22D3EE' : '#8b86a8' }}>
                  #{idx + 1}
                </div>
                <div className="rec-card-meta">
                  <span className="rec-card-nombre">{fam.nombre ?? fam.id}</span>
                  <span className="rec-card-afinidad">
                    {fam.porcentaje ?? '—'}{fam.porcentaje !== null && fam.porcentaje !== undefined ? '% de compatibilidad' : ''} · cobertura {Math.round((fam.cobertura ?? 0) * 5)}/5
                    {fam.firme === false ? ' · provisional' : ''}
                  </span>
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
                  style={{ width: `${fam.porcentaje ?? 0}%`, background: idx === 0 ? '#5B3FE0' : '#22D3EE' }}
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
        <span className="ranking-disclaimer-icon">ℹ</span>
        <span>
          Las recomendaciones muestran compatibilidad ordinal con cada familia
          (demanda = nivel mínimo) y sus brechas fisiológicas relevantes según
          Mitchell. Sin dato en una capacidad no baja el porcentaje, pero una
          familia con su demanda definitoria sin evaluar es provisional y no
          encabeza como recomendación firme. No reemplazan la orientacion de
          un especialista en ciencias del deporte.
        </span>
      </div>

      {/* Acciones */}
      <div className="action-row mt-lg">
        {onGuardar && (
          <button className="btn btn-primary" onClick={onGuardar} disabled={analisisGuardado || guardando} type="button">
            {guardando ? 'Guardando...' : analisisGuardado ? 'Analisis guardado ✓' : 'Guardar en historial'}
          </button>
        )}
        {onNuevo && (
          <button className="btn btn-outline" onClick={onNuevo} type="button">＋ Nuevo analisis</button>
        )}
      </div>
    </div>
  );
}
