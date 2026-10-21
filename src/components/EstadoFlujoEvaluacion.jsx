/**
 * @module components/EstadoFlujoEvaluacion
 * @description Presenta el estado del flujo de evaluación: alertas de seguridad, estado por módulo y pendientes.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): solo presenta la salida de ejecutarFlujoEvaluacion().
 *  - D (Inversión de dependencias): depende de la API pública de src/evaluacion.
 * Notas: las alertas de seguridad se muestran siempre antes de la recomendación.
 */
import { useMemo } from 'react';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../evaluacion';

const ETIQUETA_ESTADO = {
  sin_datos: 'Sin datos',
  invalido: 'Invalido',
  incompleto: 'Incompleto',
  pendiente_calificacion: 'Calificacion pendiente',
  pendiente_baremo: 'Baremo pendiente',
  completo: 'Completo',
};

/** Panel de estado del flujo de evaluación.
 * @param {Object} props
 * @param {Object} props.analisis - Estado global del análisis.
 * @returns {JSX.Element} */
export default function EstadoFlujoEvaluacion({ analisis }) {
  const { informe } = useMemo(
    () => ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis)),
    [analisis],
  );

  return (
    <div className="info-block mt-lg">
      <p className="info-title">Flujo de evaluacion definitivo (en preparacion)</p>
      <p className="info-desc">
        Prueba maxima (resistencia aeróbica · Léger): {informe.seguridad.pruebaMaxima.autorizada ? 'autorizada' : 'no autorizada automaticamente'}.
        {' '}{informe.seguridad.pruebaMaxima.motivo}
        {' '}DecisionEngine: {informe.resumen.decisionEngine === 'pendiente_integracion' ? 'pendiente de integracion' : informe.resumen.decisionEngine}.
      </p>

      {informe.seguridad.alertas.length > 0 && (
        <div className="warn-list">
          <strong>Alertas de seguridad:</strong>
          <ul>{informe.seguridad.alertas.map((a, i) => <li key={i}>{a.mensaje}</li>)}</ul>
        </div>
      )}

      <div className="ajuste-table-wrap mt-lg">
        <table className="ajuste-table">
          <thead><tr><th>Modulo</th><th>Estado</th><th>Nivel</th></tr></thead>
          <tbody>
            {informe.modulos.map(m => (
              <tr key={m.moduloId}>
                <td className="td-var">{m.nombre}</td>
                <td>{ETIQUETA_ESTADO[m.estado] ?? m.estado}</td>
                <td>{m.nivel ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
