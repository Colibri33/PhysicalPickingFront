/**
 * @module components/ResultadosConsolidado
 * @description Informe final: estado del flujo, nivel por capacidad, radar, compatibilidad por familia, mapa de brechas e interpretación.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): composición del informe final.
 *  - D (Inversión de dependencias): delega el cálculo en src/evaluacion y la presentación en subcomponentes.
 * Notas: sin familia firme se presenta Estado 3 o datos faltantes (R-DEC-03).
 */
import { useMemo, useState } from 'react';
import Icono from './Icono';
import ParticipantStrip from './ParticipantStrip';
import RadarChart       from './RadarChart';
import EstadoFlujoEvaluacion from './EstadoFlujoEvaluacion';
import MapaCorporalBrechas from './MapaCorporalBrechas';
import AsistenteIA from './AsistenteIA';
import { construirResumenIA } from '../ia/resumenIA';
import PlanAdaptacion, { AlertaAntecedentes } from './PlanAdaptacion';
import { VARIABLES_CAPTURA, ETIQUETAS_CAPACIDAD } from '../evaluacion/capacidades';
import { detalleCapacidades, mayorOportunidad } from '../evaluacion/informe/detalleCapacidades';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../evaluacion';
import { MATRIZ_DEMANDA } from '../evaluacion/decision/matrizDemanda';
import { motivosNoFirme, textoMotivosNoFirme } from '../evaluacion/decision/ranking';

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

/** Informe final de orientación de perfil.
 * @param {Object} props
 * @param {Object} props.analisis - Estado global del análisis.
 * @param {Function} [props.onGuardar] - Guarda el análisis.
 * @param {Function} [props.onNuevo] - Inicia una evaluación nueva.
 * @param {Function} [props.onContinuar] - Avanza al siguiente paso.
 * @param {boolean} [props.analisisGuardado] - Indica si ya se guardó.
 * @param {boolean} [props.guardando] - Guardado en curso.
 * @returns {JSX.Element} */
export default function ResultadosConsolidado({ analisis, onGuardar, onNuevo, onContinuar, analisisGuardado, guardando }) {
  const flujo = useMemo(
    () => ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis)),
    [analisis],
  );
  const resumenIA = useMemo(() => construirResumenIA(analisis, flujo), [analisis, flujo]);
  const ranking = flujo.etapas.ranking.familias;
  const lider = ranking?.[0] ?? null;
  // Solo una familia firme se presenta como recomendación (R-DEC-03).
  const top = flujo.etapas.ranking.recomendada ?? null;
  const liderProvisional = top && lider && lider.firme === false;
  const plan = flujo.etapas.planAdaptacion;
  const [familiaSel, setFamiliaSel] = useState(() => top?.id ?? '');

  // Familias firmes con igual compatibilidad y criterios de desempate (R-DEC-04).
  const empatadas = flujo.etapas.ranking.empatadas ?? [];
  const idsEmpate = new Set(empatadas.length > 1 ? empatadas.map(f => f.id) : []);

  // Nivel por capacidad: cada nivel ocupa un anillo del radar (Muy bajo = 20 %, Muy alto = 100 %).
  const detalles = detalleCapacidades(flujo);
  const evaluadas = detalles.filter(d => d.nivelIndex >= 0);
  const masAlta = [...evaluadas].sort((a, b) => b.nivelIndex - a.nivelIndex)[0] ?? null;
  const oportunidad = mayorOportunidad(detalles);
  const datosRadar = {};
  const textosRadar = {};
  for (const v of VARIABLES_CAPTURA) {
    const d = detalles.find(x => x.id === v.capacidad);
    datosRadar[v.id] = d && d.nivelIndex >= 0 ? (d.nivelIndex + 1) * 20 : 0;
    textosRadar[v.id] = d?.nivel ?? 'Sin dato';
  }

  return (
    <div className="panel-card">
      <ParticipantStrip participante={analisis.participante} />
      <h2 className="panel-title">Informe de orientacion de perfil</h2>
      <p className="panel-desc">
        Este informe ubica cada capacidad física en un <strong>nivel según su baremo</strong> por
        sexo y edad, y lo compara con lo que exige cada familia deportiva. Es una orientación,
        no una selección definitiva.
      </p>

      <EstadoFlujoEvaluacion analisis={analisis} />

      <div className="summary-strip">
        <div className="sum-card">
          <div className="sum-lbl">Capacidades evaluadas</div>
          <div className="sum-val">{evaluadas.length}/{detalles.length}</div>
          <div className="sum-sub">con baremo por sexo y edad</div>
        </div>
        <div className="sum-card high">
          <div className="sum-lbl">Capacidad mas alta</div>
          <div className="sum-val">{masAlta?.nivel ?? '—'}</div>
          <div className="sum-sub">{masAlta?.nombre ?? 'Sin datos'}</div>
        </div>
        <div className="sum-card low">
          <div className="sum-lbl">Mayor oportunidad</div>
          <div className="sum-val">{oportunidad?.nivel ?? '—'}</div>
          <div className="sum-sub">{oportunidad?.nombre ?? 'Sin datos'}</div>
        </div>
      </div>

      <h3 className="section-subtitle mt-lg">Desglose por capacidad</h3>
      <div className="consol-table-wrap">
        <div className="consol-header">
          <span className="cr-var">Capacidad</span>
          <span className="cr-num">Valor</span>
          <span className="cr-num">Siguiente nivel</span>
          <span className="cr-total">Nivel</span>
        </div>
        {detalles.map(d => {
          const v = VARIABLES_CAPTURA.find(x => x.capacidad === d.id);
          return (
            <div key={d.id} className="consol-row">
              <span className="cr-var">{d.nombre}</span>
              <span className="cr-num">{d.valorTexto}</span>
              <span className="cr-num">{d.umbral?.texto ?? '—'}</span>
              <div className="cr-total">
                <span className="cr-total-num" style={{ color: v.color }}>{d.nivel ?? 'Sin dato'}</span>
                <div className="cr-mini-track">
                  <div className="cr-mini-fill" style={{ width: `${(d.nivelIndex + 1) * 20}%`, background: v.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="section-subtitle mt-lg">Perfil fisico radial</h3>
      <div className="radar-wrap">
        <RadarChart datos={datosRadar} variables={VARIABLES_CAPTURA} textos={textosRadar} />
        <div className="radar-key">
          {VARIABLES_CAPTURA.map(v => (
            <div key={v.id} className="rk-item">
              <span className="rk-dot" style={{ background: v.color }} />
              <span>{v.nombre}: <strong>{textosRadar[v.id]}</strong></span>
            </div>
          ))}
        </div>
      </div>

      <h3 className="section-subtitle mt-lg">Compatibilidad por familia deportiva</h3>
      <div className="ranking-disclaimer">
        <span className="ranking-disclaimer-icon"><Icono n="info" /></span>
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
                <span className="rank-pos">#{idsEmpate.has(f.id) ? 1 : i + 1}</span>
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

      {ranking && (
        <MapaCorporalBrechas flujo={flujo} familiaId={familiaSel} onFamiliaChange={setFamiliaSel} sexo={analisis.participante?.genero} />
      )}

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
            {idsEmpate.size > 0 && (
              <p className="interp-parrafo">
                Empatan con la misma compatibilidad y los mismos criterios de desempate: {empatadas.map(f => f.nombre ?? f.id).join(', ')}.
              </p>
            )}
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

      <AsistenteIA resumen={resumenIA} />

      {/* Acciones omitidas en la vista de solo lectura del historial. */}
      {(onGuardar || onNuevo || onContinuar) && (
      <div className="action-row mt-lg">
        {onGuardar && (
          <button className="btn btn-primary" onClick={onGuardar} disabled={analisisGuardado || guardando} type="button">
            {guardando ? 'Guardando...' : analisisGuardado ? <>Analisis guardado <Icono n="check" /></> : 'Guardar en historial'}
          </button>
        )}
        {onContinuar && (
          <button className="btn btn-primary" onClick={onContinuar} type="button">Ver recomendacion deportiva <Icono n="derecha" /></button>
        )}
        {onNuevo && <button className="btn btn-outline" onClick={onNuevo} type="button">＋ Nuevo analisis</button>}
      </div>
      )}
    </div>
  );
}
