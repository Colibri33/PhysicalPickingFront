/**
 * @module components/PlanAdaptacion
 * @description Presenta el plan de adaptación (Estado 3 o datos insuficientes) y la alerta por antecedente de lesión.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): presentación de la salida de evaluacion/reglas/planAdaptacion.js; no calcula.
 *  - I (Segregación de interfaces): cada componente recibe solo el plan o las alertas.
 * Notas: se muestra cuando ninguna familia es recomendación firme (R-DEC-03); alerta R-SEG-04.
 */
const ETIQUETAS_CAPACIDAD = {
  fuerza: 'Fuerza prensil',
  fuerza_explosiva: 'Fuerza explosiva',
  vo2max: 'Resistencia aeróbica',
  flexibilidad: 'Flexibilidad',
  equilibrio: 'Equilibrio',
};

/** Alerta R-SEG-04 por antecedente de lesión.
 * @param {Object} props
 * @param {Array} [props.alertas] - Alertas de seguridad.
 * @returns {JSX.Element|null} null si no hay antecedente. */
export function AlertaAntecedentes({ alertas = [] }) {
  const lesion = alertas.find(a => a.codigo === 'ANTECEDENTE_LESION');
  if (!lesion) return null;
  return (
    <div className="alerta-lesion" role="alert">
      <span className="alerta-lesion-icono" aria-hidden="true">!</span>
      <div>
        <p className="alerta-lesion-titulo">{lesion.titulo ?? 'Adaptación y recuperación previa'}</p>
        <p className="alerta-lesion-texto">{lesion.mensaje}</p>
      </div>
    </div>
  );
}

/** Tarjeta del plan de adaptación.
 * @param {Object} props
 * @param {Object} props.plan - Plan generado por el motor.
 * @returns {JSX.Element|null} null si el plan no aplica. */
export default function PlanAdaptacion({ plan }) {
  if (!plan?.aplica) return null;

  if (plan.tipo === 'datos_insuficientes') {
    return (
      <div className="plan-card plan-card--datos">
        <span className="plan-badge">Faltan datos para recomendar</span>
        <p className="plan-motivo">{plan.motivo}</p>
        {plan.faltantes?.length > 0 && (
          <div className="plan-chips">
            {plan.faltantes.map(c => <span key={c} className="plan-chip">{ETIQUETAS_CAPACIDAD[c] ?? c}</span>)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="plan-card">
      <div className="plan-head">
        <span className="plan-estado">Estado {plan.estado}</span>
        <h4 className="plan-titulo">{plan.nombre}</h4>
      </div>
      <p className="plan-motivo">{plan.motivo}</p>

      {plan.prioridades?.length > 0 && (
        <>
          <p className="plan-sub">Capacidades a priorizar</p>
          <div className="plan-chips">
            {plan.prioridades.map(p => (
              <span key={p.capacidad} className={`plan-chip${p.nivel === 'Muy bajo' ? ' plan-chip--fuerte' : ''}`}>
                {ETIQUETAS_CAPACIDAD[p.capacidad] ?? p.capacidad} · {p.nivel}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="plan-grid">
        {[...(plan.pautasGenerales ?? []), ...(plan.pautasComponentes ?? [])].map(p => (
          <div key={p.id} className="plan-pauta">
            <p className="plan-pauta-titulo">{p.titulo}</p>
            <p className="plan-pauta-texto">{p.texto}</p>
            <p className="plan-pauta-ref">{p.referencia}</p>
          </div>
        ))}
      </div>

      <p className="plan-fuente">
        Orientación general basada en {String(plan.fuente?.referencia ?? '').replace(/\.$/, '')}. No reemplaza la prescripción individual
        de un profesional en ciencias del deporte.
      </p>
    </div>
  );
}
