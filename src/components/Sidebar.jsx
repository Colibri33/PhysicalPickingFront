/* Sidebar.jsx v11 — 13 pasos + historial */
export const PASO_HISTORIAL = 14;

const GRUPOS_SIDEBAR = [
  {
    titulo: 'Evaluacion',
    pasos: [
      { n: 1, label: 'Datos del participante' },
      { n: 2, label: 'PAR-Q+' },
      { n: 3, label: 'Complementarias PP' },
      { n: 4, label: 'Antropometricas' },
      { n: 5, label: 'Actividad física (IPAQ)' },
      { n: 6, label: 'Sueño (PSQI/ICSP-VC)' },
      { n: 7, label: 'Motivación (BREQ-3)' },
      { n: 8, label: 'Barreras (BBAQ-21)' },
      { n: 9, label: 'Batería física' },
    ],
  },
  {
    titulo: 'Analisis',
    pasos: [
      { n: 10, label: 'Perfil fisico' },
      { n: 11, label: 'Ajustes antropometricos' },
      { n: 12, label: 'Informe final' },
    ],
  },
  {
    titulo: 'Resultado',
    pasos: [
      { n: 13, label: 'Recomendacion deportiva' },
    ],
  },
  {
    titulo: 'Registros',
    pasos: [
      { n: PASO_HISTORIAL, label: 'Historial' },
    ],
  },
];

export default function Sidebar({ paso, pasoMax, open, onClose, onNavegar, usuarioActual, modoInvitado, onLogout }) {
  return (
    <nav className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">PhysicalPicking</span>
        <button className="sidebar-close" onClick={onClose} type="button">✕</button>
      </div>
      <div className="sidebar-user">
        {usuarioActual
          ? (<><span className="su-nombre">{usuarioActual.nombre}</span><span className="su-email">{usuarioActual.email}</span></>)
          : <span className="su-invitado">Modo invitado</span>}
        <button className="su-logout" onClick={onLogout} type="button">Cerrar sesion</button>
      </div>

      {GRUPOS_SIDEBAR.map(grupo => (
        <div className="nav-grupo" key={grupo.titulo}>
          <span className="nav-grupo-titulo">{grupo.titulo}</span>
          <ul className="nav-list">
            {grupo.pasos.map(({ n, label }) => {
              const habilitado = n <= pasoMax || n === PASO_HISTORIAL;
              return (
                <li key={n}>
                  <button
                    className={`nav-item${n === paso ? ' active' : ''}${!habilitado ? ' disabled' : ''}`}
                    disabled={!habilitado}
                    onClick={() => habilitado && onNavegar(n)}
                   type="button">
                    <span className="nav-num">{n}</span>
                    <span className="nav-label">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
