/* ─── ResultadosFisico.jsx ───
   Perfil físico: barras 0-100 (descriptivo heredado) + nivel AFISAL
   por capacidad desde el flujo de evaluación. */
import { useMemo } from 'react';
import BarraVariable    from './BarraVariable';
import ParticipantStrip from './ParticipantStrip';
import { VARS_FISICAS } from '../logic/modelo';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../evaluacion';

const MODULO_POR_VARIABLE = {
  fuerza: 'fisica_fuerza',
  fuerzaExp: 'fisica_fuerza_explosiva',
  resistencia: 'fisica_vo2max',
  flexibilidad: 'fisica_flexibilidad',
  equilibrio: 'fisica_equilibrio',
};

export default function ResultadosFisico({ analisis, onContinuar }) {
  const flujo = useMemo(
    () => ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis)),
    [analisis],
  );
  const nivelDe = (id) => flujo.etapas.modulos[MODULO_POR_VARIABLE[id] ?? '']?.nivel ?? null;

  return (
    <div className="panel-card">
      <ParticipantStrip participante={analisis.participante} />
      <h2 className="panel-title">Perfil fisico</h2>
      <p className="panel-desc">Valores normalizados a escala 0-100 a partir de los resultados reales, con su nivel AFISAL por sexo y edad.</p>

      <div className="bars-list">
        {VARS_FISICAS.map(v => {
          const nivel = nivelDe(v.id);
          return (
            <BarraVariable
              key={v.id}
              nombre={v.nombre}
              pct={analisis.fisicas[v.id]}
              color={v.color}
              subtexto={[
                analisis.realesF[v.id] !== '' ? `${analisis.realesF[v.id]} ${v.unidad}` : null,
                nivel ?? 'Sin baremo',
              ].filter(Boolean).join(' · ')}
            />
          );
        })}
      </div>

      <button className="btn btn-primary btn-full mt-lg" onClick={onContinuar} type="button">
        Ver ajustes antropometricos →
      </button>
    </div>
  );
}
