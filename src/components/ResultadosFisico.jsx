/**
 * @module components/ResultadosFisico
 * @description Perfil físico: nivel de cada capacidad según su baremo por sexo y edad, junto al valor medido.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): presenta resultados físicos; el nivel lo calcula el flujo de evaluación.
 *  - D (Inversión de dependencias): depende de ejecutarFlujoEvaluacion y del catálogo de capacidades, no de reglas de baremo.
 * Notas: la barra sube de a un nivel (Muy bajo = 20 %, Muy alto = 100 %); sin nivel no se dibuja y se informa "Sin dato".
 */
import { useMemo } from 'react';
import Icono from './Icono';
import BarraVariable    from './BarraVariable';
import ParticipantStrip from './ParticipantStrip';
import { VARIABLES_CAPTURA } from '../evaluacion/capacidades';
import { NIVELES } from '../evaluacion/niveles';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../evaluacion';

/** Muestra una barra por capacidad con su valor medido y su nivel.
 * @param {Object} props
 * @param {Object} props.analisis - análisis con participante y realesF (valores reales).
 * @param {Function} props.onContinuar - avanza a la composición corporal.
 * @returns {JSX.Element} tarjeta de resultados físicos. */
export default function ResultadosFisico({ analisis, onContinuar }) {
  const flujo = useMemo(
    () => ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis)),
    [analisis],
  );
  // null cuando la capacidad no tiene dato o baremo aplicable.
  const nivelDe = (v) => flujo.etapas.modulos[`fisica_${v.capacidad}`]?.nivel ?? null;

  return (
    <div className="panel-card">
      <ParticipantStrip participante={analisis.participante} />
      <h2 className="panel-title">Perfil fisico</h2>
      <p className="panel-desc">Nivel de cada capacidad según su baremo por sexo y edad. La barra sube de a un nivel, de Muy bajo a Muy alto.</p>

      <div className="bars-list">
        {VARIABLES_CAPTURA.map(v => {
          const nivel = nivelDe(v);
          const indice = NIVELES.indexOf(nivel);
          return (
            <BarraVariable
              key={v.id}
              nombre={v.nombre}
              pct={(indice + 1) * 20}
              etiqueta={nivel ?? 'Sin dato'}
              color={v.color}
              subtexto={analisis.realesF[v.id] != null && analisis.realesF[v.id] !== '' ? `${analisis.realesF[v.id]} ${v.unidad}` : null}
            />
          );
        })}
      </div>

      <button className="btn btn-primary btn-full mt-lg" onClick={onContinuar} type="button">
        Ver composicion corporal <Icono n="derecha" />
      </button>
    </div>
  );
}
