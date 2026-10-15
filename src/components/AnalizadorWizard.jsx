/* AnalizadorWizard.jsx v7
   - Sin dermatoglifia
   - Sin somatotipo
   - Sin modulo cognitivo (v7); "corporales" → "antropometricas"
   - Paso 7: Recomendación de deportes (paso final)
   - Al guardar se adjunta `evaluacion`: salida trazable del flujo de
     src/evaluacion (validacion → ... → informe). El calculo heredado
     (consolidado/perfiles/ranking) se conserva sin cambios de forma.
   - Navegación automática al completar cada bloque
   - Panel lateral conservado
*/
import { useState, useEffect } from 'react';
import Sidebar, { PASO_HISTORIAL } from './Sidebar';
import StepParticipante      from './StepParticipante';
import StepParq              from './StepParq';
import StepComplementarias   from './StepComplementarias';
import StepBreq              from './StepBreq';
import StepBarreras          from './StepBarreras';
import StepIpaq              from './StepIpaq';
import StepPsqi              from './StepPsqi';
import StepFisicas           from './StepFisicas';
import StepAntropometricas   from './StepAntropometricas';
import ResultadosFisico      from './ResultadosFisico';
import ResultadosAntropometricas from './ResultadosAntropometricas';
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
import { evaluarParq } from '../logic/parq';
import { calcularBreq } from '../logic/breq';
import { calcularBarreras } from '../logic/barreras';
import { calcularIpaq } from '../logic/ipaq';
import { calcularPsqi } from '../logic/psqi';
import { MODULO_COMPLEMENTARIAS } from '../evaluacion/modulos/complementarias/physicalpicking.js';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../evaluacion';
import {
  guardarRegistroHistorial,
  leerHistorial,
  limpiarHistorialInvitado,
} from '../auth/authService';

const TITULOS = {
  1:  ['Evaluacion',   'Datos del participante'],
  2:  ['Evaluacion',   'PAR-Q+ (aptitud para la actividad física)'],
  3:  ['Evaluacion',   'Complementarias PhysicalPicking (no es PAR-Q+)'],
  4:  ['Evaluacion',   'Variables antropometricas'],
  5:  ['Evaluacion',   'Actividad física actual (IPAQ corto)'],
  6:  ['Evaluacion',   'Calidad de sueño (PSQI/ICSP-VC)'],
  7:  ['Evaluacion',   'Motivación hacia el ejercicio (BREQ-3)'],
  8:  ['Evaluacion',   'Barreras hacia la actividad física (BBAQ-21)'],
  9:  ['Evaluacion',   'Batería física'],
  10: ['Analisis',     'Perfil fisico'],
  11: ['Analisis',     'Ajustes antropometricos'],
  12: ['Analisis',     'Informe final'],
  13: ['Resultado',    'Recomendacion de deportes'],
  [PASO_HISTORIAL]: ['Registros', 'Historial'],
};

const TOTAL_PASOS = 13;

export default function AnalizadorWizard({ usuarioActual, modoInvitado, mostrarToast, onLogout }) {
  const [paso,        setPaso]      = useState(1);
  const [pasoMax,     setPasoMax]   = useState(1);
  const [sidebarOpen, setSidebar]   = useState(false);
  const [analisis,    setAnalisis]  = useState(estadoAnalisisInicial());
  const [historial,   setHistorial] = useState([]);
  const [analisisGuardado, setAnalisisGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    leerHistorial(usuarioActual?.id ?? null).then(h => { if (!cancelado) setHistorial(h); });
    return () => { cancelado = true; };
  }, [usuarioActual]);

  function irA(n) {
    if (n > pasoMax && n !== PASO_HISTORIAL) return;
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
  }

  async function guardarEnHistorial() {
    // Doble bloqueo: por estado ya confirmado (analisisGuardado) y
    // por una peticion ya en curso (guardando) — esto es lo que
    // protege contra 10 clics rapidos antes de que llegue la primera
    // respuesta del backend, no solo contra volver a guardar despues.
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
      const consolidado        = calcularConsolidado(analisis.fisicas, analisis.antropometricas);
      const perfilesDeportivos = calcularPerfilesDeportivos(consolidado, analisis.antropometricas);
      const rankingDeportes    = calcularRankingDeportes(perfilesDeportivos);
      const interpretacion     = generarInterpretacion(consolidado, perfilesDeportivos, rankingDeportes);
      const evaluacion         = ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis));

      const registro = {
        id: Date.now(),
        fecha: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
        participante: { ...analisis.participante },
        parq:     { ...(analisis.parq ?? { respuestas: {}, detalles: {} }),     resultado: evaluarParq((analisis.parq ?? {}).respuestas ?? {}) },
        complementarias: { ...(analisis.complementarias ?? { respuestas: {} }),
          resultado: MODULO_COMPLEMENTARIAS.evaluar((analisis.complementarias ?? {}).respuestas ?? {}).resultadoEvaluacion },
        breq:     { ...(analisis.breq ?? { respuestas: {} }),     resultado: calcularBreq((analisis.breq ?? {}).respuestas ?? {}) },
        barreras: { ...(analisis.barreras ?? { respuestas: {} }), resultado: calcularBarreras((analisis.barreras ?? {}).respuestas ?? {}) },
        ipaq:     { ...(analisis.ipaq ?? { respuestas: {} }),     resultado: calcularIpaq((analisis.ipaq ?? {}).respuestas ?? {}) },
        psqi:     { ...(analisis.psqi ?? { respuestas: {} }),     resultado: calcularPsqi((analisis.psqi ?? {}).respuestas ?? {}) },
        leger:    { ...(analisis.leger ?? { palier: '' }) },
        realesF:    { ...analisis.realesF },
        fisicas:    { ...analisis.fisicas },
        antropometricas: { ...analisis.antropometricas },
        cuestionarios:   { ...analisis.cuestionarios },
        consolidado,
        perfilesDeportivos,
        rankingDeportes: rankingDeportes.slice(0, 5),
        interpretacion,
        evaluacion,
      };

      // analisisGuardado SOLO se confirma tras respuesta exitosa real
      // del backend — nunca se asume exito de antemano.
      const res = await guardarRegistroHistorial(usuarioActual?.id ?? null, registro);
      if (!res || res.ok === false) {
        mostrarToast(res?.error || 'No se pudo guardar el analisis. Intenta de nuevo.', 'error');
        return; // analisisGuardado permanece false: se puede reintentar
      }

      setAnalisisGuardado(true);
      setHistorial(await leerHistorial(usuarioActual?.id ?? null));
      mostrarToast(res.duplicado ? 'Este analisis ya estaba guardado.' : 'Analisis guardado en historial.', 'success');
    } finally {
      setGuardando(false);
    }
  }

  function nuevoAnalisis() {
    setAnalisis(estadoAnalisisInicial());
    setAnalisisGuardado(false);
    setPaso(1);
    setPasoMax(1);
    mostrarToast('Listo para un nuevo analisis.', 'info');
  }

  const props = { mostrarToast, analisis, updateAnalisis };

  function renderPaso() {
    switch (paso) {
      case 1:  return <StepParticipante      {...props} onContinuar={() => avanzarA(2)} />;
      case 2:  return <StepParq              {...props} onContinuar={() => avanzarA(3)} />;
      case 3:  return <StepComplementarias   {...props} onContinuar={() => avanzarA(4)} />;
      case 4:  return <StepAntropometricas   {...props} onContinuar={() => avanzarA(5)} />;
      case 5:  return <StepIpaq              {...props} onContinuar={() => avanzarA(6)} />;
      case 6:  return <StepPsqi              {...props} onContinuar={() => avanzarA(7)} />;
      case 7:  return <StepBreq              {...props} onContinuar={() => avanzarA(8)} />;
      case 8:  return <StepBarreras          {...props} onContinuar={() => avanzarA(9)} />;
      case 9:  return <StepFisicas           {...props} onContinuar={() => avanzarA(10)} />;
      case 10: return <ResultadosFisico      {...props} onContinuar={() => avanzarA(11)} />;
      case 11: return <ResultadosAntropometricas {...props} onContinuar={() => avanzarA(12)} />;
      case 12: return (
        <ResultadosConsolidado
          {...props}
          onContinuar={() => avanzarA(13)}
          onGuardar={guardarEnHistorial}
          onNuevo={nuevoAnalisis}
          analisisGuardado={analisisGuardado}
          guardando={guardando}
        />
      );
      case 13:  return (
        <RecomendacionDeportes
          {...props}
          onGuardar={guardarEnHistorial}
          onNuevo={nuevoAnalisis}
          analisisGuardado={analisisGuardado}
          guardando={guardando}
        />
      );
      case PASO_HISTORIAL: return (
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
          onHistorialActualizado={(registroActualizado) => {
            setHistorial(prev => prev.map(r => r.id === registroActualizado.id ? registroActualizado : r));
          }}
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
