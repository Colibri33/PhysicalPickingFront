/**
 * @module components/AnalizadorWizard
 * @description Asistente de 13 pasos que orquesta la evaluación, el análisis, el guardado en historial y la recomendación de deportes.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): coordina el flujo de pasos y el estado del análisis; el cálculo y la presentación residen en cada Step y en los módulos de lógica.
 *  - O (Abierto/Cerrado): un paso nuevo se incorpora agregando una entrada en TITULOS y un caso en renderPaso.
 *  - L (Sustitución de Liskov): los pasos comparten el contrato de props { mostrarToast, analisis, updateAnalisis, onContinuar } y son intercambiables.
 *  - D (Inversión de dependencias): persistencia, historial y cálculos se consumen desde authService, utils y logic, no se implementan aquí.
 * Notas: al guardar se adjunta `evaluacion`, salida trazable del flujo de src/evaluacion; el cálculo heredado (consolidado, perfiles, ranking) conserva su forma.
 */
import { useState, useEffect, useRef } from 'react';
import Icono from './Icono';
import { leerBorrador, guardarBorrador, borrarBorrador } from '../utils/borrador';
import { generarAnalisisDemo } from '../utils/rellenoDemo';
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

/** Contenedor principal de la evaluación: gestiona pasos, borrador, historial y guardado.
 * @param {Object} props
 * @param {Object|null} props.usuarioActual - usuario autenticado; null en modo invitado.
 * @param {boolean} props.modoInvitado - indica sesión de invitado.
 * @param {Function} props.mostrarToast - muestra una notificación (mensaje, tipo).
 * @param {Function} props.onLogout - cierra la sesión.
 * @returns {JSX.Element} diseño con barra lateral, cabecera y panel del paso activo. */
export default function AnalizadorWizard({ usuarioActual, modoInvitado, mostrarToast, onLogout }) {
  // Recupera el análisis en curso desde el borrador al recargar la página.
  const borradorInicial = useRef(undefined);
  if (borradorInicial.current === undefined) borradorInicial.current = leerBorrador(usuarioActual?.id ?? null);
  const b0 = borradorInicial.current;
  const [paso,        setPaso]      = useState(b0?.paso ?? 1);
  const [pasoMax,     setPasoMax]   = useState(b0?.pasoMax ?? 1);
  const [sidebarOpen, setSidebar]   = useState(false);
  const [analisis,    setAnalisis]  = useState(b0?.analisis ?? estadoAnalisisInicial());
  const [historial,   setHistorial] = useState([]);
  const [analisisGuardado, setAnalisisGuardado] = useState(b0?.analisisGuardado ?? false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    leerHistorial(usuarioActual?.id ?? null).then(h => { if (!cancelado) setHistorial(h); });
    return () => { cancelado = true; };
  }, [usuarioActual]);

  // Persiste el borrador en cada cambio, solo si ya hay contenido.
  useEffect(() => {
    if (!analisis.participante?.nombre && pasoMax <= 1) return;
    guardarBorrador(usuarioActual?.id ?? null, { analisis, paso, pasoMax, analisisGuardado });
  }, [analisis, paso, pasoMax, analisisGuardado, usuarioActual]);

  /** Carga datos de demostración coherentes en todos los pasos y abre el informe final. */
  function rellenarDemo() {
    if (analisis.participante?.nombre && !window.confirm('Esto reemplaza los datos actuales con datos de ejemplo. ¿Continuar?')) return;
    // Alterna el sexo respecto al análisis actual para variar los casos de demostración.
    const g = analisis.participante?.genero;
    setAnalisis(generarAnalisisDemo(Math.random, g === 'masculino' ? 'femenino' : g === 'femenino' ? 'masculino' : null));
    setAnalisisGuardado(false);
    setPasoMax(13);
    setPaso(12);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarToast('Datos de demostración cargados. Puedes revisar cualquier paso.', 'success');
  }

  /** Navega a un paso ya alcanzado (o al historial).
   * @param {number} n - número de paso. */
  function irA(n) {
    if (n > pasoMax && n !== PASO_HISTORIAL) return;
    setPaso(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Avanza a un paso y registra el máximo alcanzado.
   * @param {number} n - número de paso. */
  function avanzarA(n) {
    setPasoMax(p => Math.max(p, n));
    setPaso(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Fusiona cambios parciales en el análisis e invalida el estado de guardado.
   * @param {Object} cambios - campos del análisis a actualizar. */
  function updateAnalisis(cambios) {
    setAnalisis(prev => ({ ...prev, ...cambios }));
    // Toda modificación invalida el guardado previo para que un nuevo guardado cree otro registro.
    setAnalisisGuardado(false);
  }

  /** Calcula el registro completo y lo guarda en el historial, evitando envíos duplicados. */
  async function guardarEnHistorial() {
    // Doble bloqueo: guardado ya confirmado o petición en curso (evita clics repetidos antes de la respuesta).
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

      // El guardado solo se confirma tras una respuesta exitosa del backend.
      const res = await guardarRegistroHistorial(usuarioActual?.id ?? null, registro);
      if (!res || res.ok === false) {
        mostrarToast(res?.error || 'No se pudo guardar el analisis. Intenta de nuevo.', 'error');
        return; // analisisGuardado permanece en false para permitir reintento
      }

      setAnalisisGuardado(true);
      setHistorial(await leerHistorial(usuarioActual?.id ?? null));
      mostrarToast(res.duplicado ? 'Este analisis ya estaba guardado.' : 'Analisis guardado en historial.', 'success');
    } finally {
      setGuardando(false);
    }
  }

  /** Descarta el borrador y reinicia el asistente con un análisis vacío. */
  function nuevoAnalisis() {
    borrarBorrador(usuarioActual?.id ?? null);
    setAnalisis(estadoAnalisisInicial());
    setAnalisisGuardado(false);
    setPaso(1);
    setPasoMax(1);
    mostrarToast('Listo para un nuevo analisis.', 'info');
  }

  const props = { mostrarToast, analisis, updateAnalisis };

  /** Devuelve el componente correspondiente al paso activo.
   * @returns {JSX.Element|null} paso actual. */
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
          <button className="menu-toggle" onClick={() => setSidebar(o => !o)} aria-label="Menu" type="button"><Icono n="menu" /></button>
          <div className="topbar-info">
            <span className="tb-section">{seccion}</span>
            <span className="tb-title">{titulo}</span>
            {paso <= TOTAL_PASOS && (
              <span className="tb-paso">Paso {paso} de {TOTAL_PASOS}</span>
            )}
          </div>
          <button type="button" className="btn-demo" onClick={rellenarDemo}
            title="Rellena todos los pasos con datos de ejemplo coherentes (para exposiciones)">
            <Icono n="rayo" /> Rellenar demo
          </button>
          <div className="step-dots">
            {Array.from({ length: TOTAL_PASOS }, (_, i) => {
              const n = i + 1;
              return <div key={n} className={n < paso ? 'sd-dot done' : n === paso ? 'sd-dot active' : 'sd-dot'} />;
            })}
          </div>
        </header>
        <main className={`panel-area${paso === 12 || paso === 13 || paso === PASO_HISTORIAL ? ' panel-area--ancha' : ''}`}>{renderPaso()}</main>
      </div>
    </div>
  );
}
