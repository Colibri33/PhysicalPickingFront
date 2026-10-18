/* ResultadosConsolidado.jsx v7
   Informe final:
   0. Estado del flujo de evaluacion (src/evaluacion): seguridad y pendientes
   1. Tabla desglosada base/ajAntrop/total (descriptivo heredado)
   2. Radar chart variables fisicas
   3. Compatibilidad por familia del DecisionEngine (matriz + Mitchell)
   4. Mapa corporal de brechas frente a la familia elegida
   5. Interpretacion: recomendación firme, o Estado 3 / datos faltantes
      cuando ninguna familia es firme (R-DEC-03)
*/
import { useMemo, useState } from 'react';
import ParticipantStrip from './ParticipantStrip';
import RadarChart       from './RadarChart';
import EstadoFlujoEvaluacion from './EstadoFlujoEvaluacion';
import MapaCorporalBrechas from './MapaCorporalBrechas';
import PlanAdaptacion, { AlertaAntecedentes } from './PlanAdaptacion';
import {
  VARS_FISICAS,
  calcularConsolidado,
} from '../logic/modelo';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../evaluacion';
import { MATRIZ_DEMANDA } from '../evaluacion/decision/matrizDemanda';
import { motivosNoFirme, textoMotivosNoFirme } from '../evaluacion/decision/ranking';

function signo(d) { const r = Math.round(d * 10)/10; return r > 0 ? `+${r}` : `${r}`; }

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

export default function ResultadosConsolidado({ analisis, onGuardar, onNuevo, onContinuar, analisisGuardado, guardando }) {
  const consolidado        = calcularConsolidado(analisis.fisicas, analisis.antropometricas);
  const flujo = useMemo(
    () => ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis)),
    [analisis],
  );
  const ranking = flujo.etapas.ranking.familias;
  const lider = ranking?.[0] ?? null;
  // Solo una familia firme puede presentarse como recomendación (R-DEC-03).
  const top = flujo.etapas.ranking.recomendada ?? null;
  const liderProvisional = top && lider && lider.firme === false;
  const plan = flujo.etapas.planAdaptacion;
  const [familiaSel, setFamiliaSel] = useState(() => top?.id ?? '');

  const datosRadar = Object.fromEntries(VARS_FISICAS.map(v => [v.id, consolidado[v.id].total]));
  const totales    = VARS_FISICAS.map(v => consolidado[v.id].total);
  const promedio   = Math.round(totales.reduce((a,b) => a+b,0) / totales.length);
  const varMax     = VARS_FISICAS[totales.indexOf(Math.max(...totales))];
  const varMin     = VARS_FISICAS[totales.indexOf(Math.min(...totales))];

  return (
    <div className="panel-card">
      <ParticipantStrip participante={analisis.participante} />
      <h2 className="panel-title">Informe de orientacion de perfil</h2>
      <p className="panel-desc">
        Este informe describe la <strong>tendencia funcional</strong> del evaluado basada en
        sus capacidades físicas y antropometricas. No clasifica por baremos deportivos
        ni determina un deporte específico — orienta el perfil general.
      </p>

      <EstadoFlujoEvaluacion analisis={analisis} />

      {/* ── Tarjetas de resumen ── */}
      <div className="summary-strip">
        <div className="sum-card">
          <div className="sum-lbl">Promedio general</div>
          <div className="sum-val">{promedio}%</div>
          <div className="sum-sub">variables fisicas</div>
        </div>
        <div className="sum-card high">
          <div className="sum-lbl">Variable mas alta</div>
          <div className="sum-val">{consolidado[varMax.id].total}%</div>
          <div className="sum-sub">{varMax.nombre}</div>
        </div>
        <div className="sum-card low">
          <div className="sum-lbl">Variable mas baja</div>
          <div className="sum-val">{consolidado[varMin.id].total}%</div>
          <div className="sum-sub">{varMin.nombre}</div>
        </div>
      </div>

      {/* ── Tabla desglosada ── */}
      <h3 className="section-subtitle mt-lg">Desglose por variable fisica</h3>
      <div className="consol-table-wrap">
        <div className="consol-header">
          <span className="cr-var">Variable</span>
          <span className="cr-num">Base</span>
          <span className="cr-delta">Δ Antrop.</span>
          <span className="cr-total">Total</span>
        </div>
        {VARS_FISICAS.map(v => {
          const { base, ajAntrop, total } = consolidado[v.id];
          return (
            <div key={v.id} className="consol-row">
              <span className="cr-var">{v.nombre}</span>
              <span className="cr-num">{base}%</span>
              <span className={`cr-delta ${ajAntrop>0?'delta-pos':ajAntrop<0?'delta-neg':'delta-neu'}`}>{ajAntrop!==0?signo(ajAntrop):'0'}</span>
              <div className="cr-total">
                <span className="cr-total-num" style={{ color: v.color }}>{total}%</span>
                <div className="cr-mini-track">
                  <div className="cr-mini-fill" style={{ width: `${total}%`, background: v.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Radar ── */}
      <h3 className="section-subtitle mt-lg">Perfil fisico radial</h3>
      <div className="radar-wrap">
        <RadarChart datos={datosRadar} variables={VARS_FISICAS} />
        <div className="radar-key">
          {VARS_FISICAS.map(v => (
            <div key={v.id} className="rk-item">
              <span className="rk-dot" style={{ background: v.color }} />
              <span>{v.nombre}: <strong>{consolidado[v.id].total}%</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Compatibilidad por familia (DecisionEngine) ── */}
      <h3 className="section-subtitle mt-lg">Compatibilidad por familia deportiva</h3>
      <div className="ranking-disclaimer">
        <span className="ranking-disclaimer-icon">ℹ</span>
        <span>
          Porcentaje de requisitos cumplidos por familia (demanda = nivel mínimo).
          Sin dato en una capacidad no penaliza el porcentaje: baja la cobertura.
          Una familia no es recomendable si tiene su demanda definitoria sin evaluar
          o una brecha severa (nivel Bajo o Muy bajo donde exige Alta o Muy alta).
          Mitchell solo prioriza brechas, no modifica el porcentaje.
          Toca una familia para verla en el mapa corporal.
        </span>
      </div>
      {!ranking ? (
        <p className="empty-text">Ranking pendiente: requiere el DecisionEngine.</p>
      ) : (
        <div className="ranking-list">
          {ranking.map((f, i) => {
            const noFirme = f.firme === false;
            const severa = motivosNoFirme(f).some(m => m.tipo === 'brecha_severa');
            const destacada = !noFirme && i < 3;
            return (
              <button type="button" key={f.id}
                className={`ranking-item${destacada ? ' ranking-top' : ''}${noFirme ? ' ranking-no-firme' : ''}${familiaSel === f.id ? ' ranking-sel' : ''}`}
                onClick={() => setFamiliaSel(familiaSel === f.id ? '' : f.id)}
                aria-pressed={familiaSel === f.id}
                title={noFirme ? textoMotivosNoFirme(f).join('; ') : 'Ver en el mapa corporal'}>
                <span className="rank-pos">#{i + 1}</span>
                <span className="rank-nombre">
                  {f.nombre ?? f.id}
                  {noFirme && <span className="rank-tag">{severa ? 'brecha severa' : 'faltan datos'}</span>}
                </span>
                <div className="rank-bar-wrap">
                  <div className="rank-bar-track">
                    <div className="rank-bar-fill" style={{ width: `${f.porcentaje ?? 0}%`, background: noFirme ? '#c9c3e3' : i === 0 ? '#5B3FE0' : i === 1 ? '#2F5CE8' : '#22D3EE' }} />
                  </div>
                  <span className="rank-pct">{f.porcentaje ?? '—'}{f.porcentaje !== null && f.porcentaje !== undefined ? '%' : ''}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Mapa corporal de brechas ── */}
      {ranking && (
        <MapaCorporalBrechas flujo={flujo} familiaId={familiaSel} onFamiliaChange={setFamiliaSel} sexo={analisis.participante?.genero} />
      )}

      {/* ── Interpretación desde brechas del motor ── */}
      <h3 className="section-subtitle mt-lg">Interpretacion de la compatibilidad</h3>
      <AlertaAntecedentes alertas={flujo.informe.seguridad.alertas} />
      <div className="interp-block">
        {!top ? (
          plan?.aplica
            ? <PlanAdaptacion plan={plan} />
            : <p className="interp-parrafo">Sin compatibilidad calculada todavía.</p>
        ) : (
          <>
            <p className="interp-parrafo">
              Recomendación firme: {top.nombre ?? top.id}
              {top.porcentaje !== null && top.porcentaje !== undefined ? ` (${top.porcentaje}%, cobertura ${Math.round((top.cobertura ?? 0) * 5)}/5)` : ' (sin datos suficientes)'}.
            </p>
            {liderProvisional && (
              <div className="interp-recomendacion">
                <span className="interp-label">Familia con mayor porcentaje no recomendable</span>
                <p style={{ fontSize: '.82rem' }}>
                  {lider.nombre ?? lider.id} tiene {lider.porcentaje ?? '—'}% pero no es recomendable:
                  {' '}{textoMotivosNoFirme(lider).join('; ')}.
                </p>
              </div>
            )}
            {(top.carencias ?? []).length > 0 && (
              <div className="interp-recomendacion">
                <span className="interp-label">Demandas sin evaluar</span>
                <ul>
                  {top.carencias.map((c, i) => (
                    <li key={i} style={{ fontSize: '.82rem' }}>
                      {ETIQUETAS_CAPACIDAD[c.capacidad] ?? c.capacidad}: demanda {c.demanda} sin dato.
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {top.brechas?.filter(b => b.relevanteMitchell).length > 0 && (
              <div className="interp-recomendacion">
                <span className="interp-label">Brechas fisiológicas relevantes (Mitchell)</span>
                <ul>
                  {top.brechas.filter(b => b.relevanteMitchell).map((b, i) => (
                    <li key={i} style={{ fontSize: '.82rem' }}>
                      {ETIQUETAS_CAPACIDAD[b.capacidad] ?? b.capacidad}: nivel {b.nivel}, demanda {b.demanda}
                      {motivoMitchell(top.id ?? top.familiaId, b.capacidad) ? ` — ${motivoMitchell(top.id ?? top.familiaId, b.capacidad)}` : ''}.
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="interp-cols">
              {top.brechas?.filter(b => b.severa).length > 0 && (
                <div className="interp-col debilidades">
                  <span className="interp-col-title">Brechas severas</span>
                  <ul>
                    {top.brechas.filter(b => b.severa).map((b, i) => (
                      <li key={i}>{ETIQUETAS_CAPACIDAD[b.capacidad] ?? b.capacidad} — demanda {b.demanda}, nivel {b.nivel}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(!top.brechas || top.brechas.length === 0) && (
                <div className="interp-col fortalezas">
                  <span className="interp-col-title">Sin brechas</span>
                  <ul><li>Cumple todos los requisitos evaluados de la familia.</li></ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Acciones ── */}
      <div className="action-row mt-lg">
        <button className="btn btn-primary" onClick={onGuardar} disabled={analisisGuardado || guardando} type="button">
          {guardando ? 'Guardando...' : analisisGuardado ? 'Analisis guardado ✓' : 'Guardar en historial'}
        </button>
        {onContinuar && (
          <button className="btn btn-primary" onClick={onContinuar} type="button">Ver recomendacion deportiva →</button>
        )}
        <button className="btn btn-outline" onClick={onNuevo} type="button">＋ Nuevo analisis</button>
      </div>
    </div>
  );
}
