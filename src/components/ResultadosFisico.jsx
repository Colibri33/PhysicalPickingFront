/**
 * @module components/ResultadosFisico
 * @description Perfil físico: barras normalizadas 0-100 con el nivel AFISAL de cada capacidad.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): presenta resultados físicos; el cálculo del nivel se delega al flujo de evaluación.
 *  - D (Inversión de dependencias): depende de ejecutarFlujoEvaluacion y de componentes de presentación, no de reglas de baremo.
 */
import { useMemo } from 'react';
import Icono from './Icono';
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

/** Muestra una barra por variable física con su valor real y nivel AFISAL.
 * @param {Object} props
 * @param {Object} props.analisis - análisis con participante, fisicas (0-100) y realesF (valores reales).
 * @param {Function} props.onContinuar - avanza a los ajustes antropométricos.
 * @returns {JSX.Element} tarjeta de resultados físicos. */
export default function ResultadosFisico({ analisis, onContinuar }) {
  const flujo = useMemo(
    () => ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis)),
    [analisis],
  );
  // Devuelve null cuando la variable no tiene módulo de baremo asociado.
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
        Ver ajustes antropometricos <Icono n="derecha" />
      </button>
    </div>
  );
}
