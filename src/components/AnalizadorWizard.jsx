/* AnalizadorWizard.jsx v6
   - Sin dermatoglifia
   - Sin somatotipo
   - Paso 9: Recomendación de deportes (nuevo paso final)
   - Navegación automática al completar cada bloque
   - Panel lateral conservado
*/
import { useState, useEffect } from 'react';
import Sidebar               from './Sidebar';
import StepParticipante      from './StepParticipante';
import StepFisicas           from './StepFisicas';
import StepCognitivas        from './StepCognitivas';
import StepCorporales        from './StepCorporales';
import ResultadosFisico      from './ResultadosFisico';
import ResultadosCognitivo   from './ResultadosCognitivo';
import ResultadosCorporales  from './ResultadosCorporales';
import ResultadosConsolidado from './ResultadosConsolidado';
import RecomendacionDeportes from './RecomendacionDeportes';
import Historial             from './Historial';
import {
  estadoAnalisisInicial,
  calcularConsolidado,
  calcularPerfilesDeportivos,
  calcularRankingDeportes,
  generarInterpretacion,
} from '../logic/modelo';
import {
  guardarRegistroHistorial,
  leerHistorial,
  limpiarHistorialInvitado,
} from '../auth/authService';

const TITULOS = {
  1:  ['Evaluacion',   'Datos del participante'],
  2:  ['Evaluacion',   'Variables fisicas'],
  3:  ['Evaluacion',   'Variables cognitivas'],
  4:  ['Evaluacion',   'Variables corporales'],
  5:  ['Analisis',     'Perfil fisico'],
  6:  ['Analisis',     'Perfil cognitivo'],
  7:  ['Analisis',     'Ajustes corporales'],
  8:  ['Analisis',     'Informe final'],
  9:  ['Resultado',    'Recomendacion de deportes'],
  10: ['Registros',    'Historial'],
};

const TOTAL_PASOS = 9;

export default function AnalizadorWizard({ usuarioActual, modoInvitado, mostrarToast, onLogout }) {
  const [paso,        setPaso]      = useState(1);
  const [pasoMax,     setPasoMax]   = useState(1);
  const [sidebarOpen, setSidebar]   = useState(false);
  const [analisis,    setAnalisis]  = useState(estadoAnalisisInicial());
  const [historial,   setHistorial] = useState([]);
  const [analisisGuardado, setAnalisisGuardado] = useState(false);
  const [analisisGuardadoId, setAnalisisGuardadoId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    leerHistorial(usuarioActual?.id ?? null).then(h => { if (!cancelado) setHistorial(h); });
    return () => { cancelado = true; };
  }, [usuarioActual]);

  function irA(n) {
    if (n > pasoMax && n !== 10) return;
    setPaso(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function avanzarA(n) {
    setPasoMax(p => Math.max(p, n));
    setPaso(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateAnalisis(cambios) {
    setAnalisis(prev => ({ ...prev, ...cambios }));
    // Cualquier modificacion de datos invalida el "guardado" previo:
    // si el usuario cambia algo, al volver a guardar debe crear un
    // registro nuevo, no confundirse con el analisis ya guardado.
    setAnalisisGuardado(false);
    setAnalisisGuardadoId(null);
  }

  async function guardarEnHistorial() {
    // Bloqueo real contra doble guardado: por estado ya confirmado
    // (analisisGuardado) y por una peticion ya en curso (guardando),
    // para evitar dobles clics mientras la respuesta del backend
    // todavia no llega.
    if (analisisGuardado) {
      mostrarToast('Este analisis ya fue guardado en el historial.', 'info');
      return;
    }
    if (guardando) return;

    if (!analisis.participante.nombre) {
      mostrarToast('Completa los datos del participante antes de guardar.', 'error');
      return;
    }

    setGuardando(true);
    try {
      const consolidado        = calcularConsolidado(analisis.fisicas, analisis.cognitivas, analisis.corporales);
      const perfilesDeportivos = calcularPerfilesDeportivos(consolidado, analisis.cognitivas, analisis.corporales);
      const rankingDeportes    = calcularRankingDeportes(perfilesDeportivos);
      const interpretacion     = generarInterpretacion(consolidado, perfilesDeportivos, analisis.cognitivas, rankingDeportes);

      const registro = {
        id: Date.now(),
        fecha: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
        participante: { ...analisis.participante },
        realesF:    { ...analisis.realesF },
        realesC:    { ...analisis.realesC },
        fisicas:    { ...analisis.fisicas },
        cognitivas: { ...analisis.cognitivas },
        corporales: { ...analisis.corporales },
        consolidado,
        perfilesDeportivos,
        rankingDeportes: rankingDeportes.slice(0, 5),
        interpretacion,
      };

      // El guardado SOLO se confirma (analisisGuardado = true) si el
      // backend responde exitosamente con el registro persistido.
      // No se simula ni se asume exito de antemano.
      const res = await guardarRegistroHistorial(usuarioActual?.id ?? null, registro);
      if (!res || res.ok === false) {
        mostrarToast(res?.error || 'No se pudo guardar el analisis. Intenta de nuevo.', 'error');
        return; // analisisGuardado permanece false: se puede reintentar
      }

      setAnalisisGuardado(true);
      setAnalisisGuardadoId(res.resultado?.id ?? registro.id);

      // Recarga real del historial desde la fuente de verdad (backend
      // o localStorage segun el modo) para reflejar el registro nuevo.
      setHistorial(await leerHistorial(usuarioActual?.id ?? null));
      mostrarToast('Analisis guardado en historial.', 'success');
    } finally {
      setGuardando(false);
    }
  }

  function nuevoAnalisis() {
    setAnalisis(estadoAnalisisInicial());
    setAnalisisGuardado(false);
    setAnalisisGuardadoId(null);
    setPaso(1);
    setPasoMax(1);
    mostrarToast('Listo para un nuevo analisis.', 'info');
  }

  const props = { mostrarToast, analisis, updateAnalisis };

  function renderPaso() {
    switch (paso) {
      case 1:  return <StepParticipante      {...props} onContinuar={() => avanzarA(2)} />;
      case 2:  return <StepFisicas           {...props} onContinuar={() => avanzarA(3)} />;
      case 3:  return <StepCognitivas        {...props} onContinuar={() => avanzarA(4)} />;
      case 4:  return <StepCorporales        {...props} onContinuar={() => avanzarA(5)} />;
      case 5:  return <ResultadosFisico      {...props} onContinuar={() => avanzarA(6)} />;
      case 6:  return <ResultadosCognitivo   {...props} onContinuar={() => avanzarA(7)} />;
      case 7:  return <ResultadosCorporales  {...props} onContinuar={() => avanzarA(8)} />;
      case 8:  return (
        <ResultadosConsolidado
          {...props}
          onContinuar={() => avanzarA(9)}
          onGuardar={guardarEnHistorial}
          onNuevo={nuevoAnalisis}
          analisisGuardado={analisisGuardado}
          guardando={guardando}
        />
      );
      case 9:  return (
        <RecomendacionDeportes
          {...props}
          onGuardar={guardarEnHistorial}
          onNuevo={nuevoAnalisis}
          analisisGuardado={analisisGuardado}
          guardando={guardando}
        />
      );
      case 10: return (
        <Historial
          historial={historial}
          usuarioActual={usuarioActual}
          mostrarToast={mostrarToast}
          onLogout={onLogout}
          onLimpiar={() => {
            if (!window.confirm('Borrar todos los registros?')) return;
            if (usuarioActual?.id == null) limpiarHistorialInvitado();
            setHistorial([]);
            mostrarToast('Historial borrado.', 'info');
          }}
          onNuevo={() => irA(1)}
        />
      );
      default: return null;
    }
  }

  const [seccion, titulo] = TITULOS[paso] || ['', ''];

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebar(false)} />}
      <Sidebar
        paso={paso} pasoMax={pasoMax} open={sidebarOpen}
        onClose={() => setSidebar(false)}
        onNavegar={n => { irA(n); setSidebar(false); }}
        usuarioActual={usuarioActual} modoInvitado={modoInvitado} onLogout={onLogout}
      />
      <div className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setSidebar(o => !o)} aria-label="Menu" type="button">☰</button>
          <div className="topbar-info">
            <span className="tb-section">{seccion}</span>
            <span className="tb-title">{titulo}</span>
            {paso <= TOTAL_PASOS && (
              <span className="tb-paso">Paso {paso} de {TOTAL_PASOS}</span>
            )}
          </div>
          <div className="step-dots">
            {Array.from({ length: TOTAL_PASOS }, (_, i) => {
              const n = i + 1;
              return <div key={n} className={n < paso ? 'sd-dot done' : n === paso ? 'sd-dot active' : 'sd-dot'} />;
            })}
          </div>
        </header>
        <main className="panel-area">{renderPaso()}</main>
      </div>
    </div>
  );
}
