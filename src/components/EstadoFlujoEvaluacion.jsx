/* ─── EstadoFlujoEvaluacion.jsx ───
   Muestra el estado del flujo de evaluacion de src/evaluacion:
   alertas de seguridad (siempre antes de la recomendacion), estado de
   cada modulo y lo que queda pendiente de integrar. No calcula nada:
   solo presenta la salida de ejecutarFlujoEvaluacion().
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
