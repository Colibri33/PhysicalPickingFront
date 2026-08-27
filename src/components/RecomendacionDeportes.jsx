/* ─── RecomendacionDeportes.jsx v6 ───
   Paso final: presenta la recomendacion de deportes.

   IMPORTANTE: este componente NO calcula recomendaciones con reglas
   propias. Consume exclusivamente el motor unico definido en
   logic/modelo.js (calcularPerfilesDeportivos + calcularRankingDeportes
   + calcularFortalezasDeporte), la misma fuente de verdad que usa el
   informe final (ResultadosConsolidado.jsx). Esto garantiza que la
   recomendacion sea siempre coherente en todas las pantallas.
*/
import {
  calcularConsolidado,
  calcularPerfilesDeportivos,
  calcularRankingDeportes,
  calcularFortalezasDeporte,
} from '../logic/modelo';

const PERFIL_NOMBRES = {
  resistencia: 'Resistencia',
  potencia:    'Potencia',
  velocidad:   'Velocidad',
  coordinativo: 'Coordinacion',
};

export default function RecomendacionDeportes({ analisis, onNuevo, onGuardar, analisisGuardado }) {
  const consolidado        = calcularConsolidado(analisis.fisicas, analisis.cognitivas, analisis.corporales);
  const perfilesDeportivos = calcularPerfilesDeportivos(consolidado, analisis.cognitivas, analisis.corporales);
  const rankingDeportes    = calcularRankingDeportes(perfilesDeportivos);
  const recomendaciones    = rankingDeportes.slice(0, 5);

  const perfilTop = Object.entries(perfilesDeportivos).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="panel-card">
      <h2 className="panel-title">Recomendacion de deportes</h2>
      <p className="panel-desc">
        Basado en tus capacidades fisicas y cognitivo-motrices evaluadas, el sistema
        identifica los deportes y actividades con mayor afinidad para tu perfil funcional.
        Esta recomendacion es una <strong>orientacion de tendencia</strong>, no una
        seleccion definitiva.
      </p>

      {/* Resumen del perfil dominante */}
      {perfilTop && (
        <div className="rec-perfil-banner" style={{ borderColor: '#2555d4' }}>
          <span className="rec-perfil-etiqueta">Tu perfil dominante</span>
          <span className="rec-perfil-nombre">{PERFIL_NOMBRES[perfilTop[0]] ?? perfilTop[0]}</span>
          <span className="rec-perfil-pct">{perfilTop[1]}%</span>
        </div>
      )}

      {/* Lista de deportes recomendados (fuente unica: rankingDeportes) */}
      <div className="rec-lista">
        {recomendaciones.map((deporte, idx) => {
          const fortalezasDetalle = calcularFortalezasDeporte(deporte.brechas);
          return (
            <div key={deporte.nombre} className="rec-card">
              <div className="rec-card-header">
                <div className="rec-card-rank" style={{ background: idx === 0 ? '#2555d4' : idx === 1 ? '#0f9d66' : '#6b7280' }}>
                  #{idx + 1}
                </div>
                <div className="rec-card-meta">
                  <span className="rec-card-nombre">{deporte.nombre}</span>
                  <span className="rec-card-afinidad">{deporte.afinidad}% de afinidad</span>
                  {fortalezasDetalle.length > 0 && (
                    <span className="rec-card-tags">
                      {fortalezasDetalle.map((tag, i) => (
                        <span key={i} className="rec-tag" style={{ borderColor: deporte.color, color: deporte.color }}>
                          {tag}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              <p className="rec-card-desc">{deporte.descripcion}</p>
              <div className="rec-card-bar-track">
                <div
                  className="rec-card-bar-fill"
                  style={{ width: `${deporte.afinidad}%`, background: deporte.color }}
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
          Las recomendaciones se calculan por afinidad de perfil funcional frente al
          perfil de referencia de cada familia de actividad. No reemplazan la
          orientacion de un especialista en ciencias del deporte.
        </span>
      </div>

      {/* Acciones */}
      <div className="action-row mt-lg">
        {onGuardar && (
          <button className="btn btn-primary" onClick={onGuardar} disabled={analisisGuardado} type="button">
            {analisisGuardado ? 'Analisis guardado ✓' : 'Guardar en historial'}
          </button>
        )}
        {onNuevo && (
          <button className="btn btn-outline" onClick={onNuevo} type="button">＋ Nuevo analisis</button>
        )}
      </div>
    </div>
  );
}
