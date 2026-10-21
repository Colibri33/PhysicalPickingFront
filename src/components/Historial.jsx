/**
 * @module components/Historial
 * @description Lista de registros guardados con detalle, edición de datos del participante y descarga de PDF.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): gestión visual del historial de evaluaciones.
 *  - D (Inversión de dependencias): persistencia y PDF mediante servicios importados; reutiliza ResultadosConsolidado y RecomendacionDeportes.
 */
import { useState } from 'react';
import Icono from './Icono';
import { VARS_FISICAS, estadoAnalisisInicial } from '../logic/modelo';
import ResultadosConsolidado from './ResultadosConsolidado';
import RecomendacionDeportes from './RecomendacionDeportes';
import { EDAD_MIN, EDAD_MAX } from './StepParticipante';
import {
  exportarMisDatos,
  eliminarCuenta,
  actualizarRegistroHistorial,
  descargarInformePdf,
} from '../auth/authService';
import { generarPdfMisDatos } from '../utils/informeMisDatosPdf';
import { AlertaAntecedentes } from './PlanAdaptacion';
import { alertaAntecedenteLesion } from '../evaluacion/reglas/preparacionSeguridad';

/** Pone en mayúscula la primera letra.
 * @param {string} s - Texto.
 * @returns {string} texto capitalizado o cadena vacía. */
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

/** Descarga un Blob como archivo.
 * @param {Blob} blob - Contenido.
 * @param {string} nombreArchivo - Nombre sugerido. */
function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

/** Reconstruye el estado `analisis` desde un registro guardado para reutilizar las pantallas del informe.
 * @param {Object} r - Registro guardado.
 * @returns {Object} estado de análisis. */
function analisisDesdeRegistro(r) {
  const base = estadoAnalisisInicial();
  const claves = ['participante', 'parq', 'complementarias', 'breq', 'barreras', 'ipaq', 'psqi', 'leger', 'realesF', 'fisicas', 'antropometricas', 'cuestionarios'];
  const a = { ...base };
  for (const k of claves) if (r[k] && typeof r[k] === 'object') a[k] = { ...base[k], ...r[k] };
  return a;
}

/** Vista completa de un registro (informe o recomendación).
 * @param {Object} props
 * @param {Object} props.registro - Registro guardado.
 * @param {Function} props.onVolver - Regresa a la lista.
 * @param {Function} props.onEditarPdf - Abre edición y PDF.
 * @returns {JSX.Element} */
function DetalleAnalisis({ registro, onVolver, onEditarPdf }) {
  const [vista, setVista] = useState('informe');
  const analisis = analisisDesdeRegistro(registro);
  return (
    <div>
      <div className="action-row" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-outline" onClick={onVolver} type="button"><Icono n="izquierda" /> Volver a la lista</button>
        <button className="btn btn-outline" onClick={onEditarPdf} type="button">Editar datos / PDF</button>
        <span className="hist-count" style={{ marginLeft: 'auto' }}>{registro.participante.nombre} · {registro.fecha}</span>
      </div>
      <div className="action-row" style={{ marginBottom: '1rem' }}>
        <button className={`btn ${vista === 'informe' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setVista('informe')} type="button">Informe final</button>
        <button className={`btn ${vista === 'reco' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setVista('reco')} type="button">Recomendación deportiva</button>
      </div>
      {vista === 'informe'
        ? <ResultadosConsolidado analisis={analisis} />
        : <RecomendacionDeportes analisis={analisis} />}
    </div>
  );
}

/** Formulario de edición de los datos del participante de un registro.
 * @param {Object} props
 * @param {Object} props.registro - Registro a editar.
 * @param {Function} props.onCancelar - Cancela la edición.
 * @param {Function} props.onGuardado - Recibe el registro actualizado.
 * @param {string} props.usuarioId - Identificador del usuario.
 * @param {Function} props.mostrarToast - Muestra notificaciones.
 * @returns {JSX.Element} */
function FormularioEdicion({ registro, onCancelar, onGuardado, usuarioId, mostrarToast }) {
  const [form, setForm] = useState({ ...registro.participante });
  const [guardando, setGuardando] = useState(false);

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  async function handleGuardar() {
    const nombre = (form.nombre || '').trim();
    if (!nombre) return mostrarToast('El nombre no puede estar vacio.', 'error');

    const edadNum = Number(form.edad);
    if (!form.edad || isNaN(edadNum) || !Number.isInteger(edadNum))
      return mostrarToast('Ingresa una edad valida.', 'error');
    if (edadNum < EDAD_MIN || edadNum > EDAD_MAX)
      return mostrarToast(`La edad debe estar entre ${EDAD_MIN} y ${EDAD_MAX} años.`, 'error');

    if (!form.genero) return mostrarToast('Selecciona el genero.', 'error');
    if (!form.perfil) return mostrarToast('Selecciona el tipo de perfil.', 'error');
    if (!(form.deporte || '').trim()) return mostrarToast('Ingresa la actividad o deporte.', 'error');

    // Estos campos no participan en el motor de cálculo (logic/modelo.js): no se recalcula nada.
    const registroActualizado = { ...registro, participante: { ...form, nombre, edad: edadNum } };

    setGuardando(true);
    const res = await actualizarRegistroHistorial(usuarioId, registro.id, registroActualizado);
    setGuardando(false);

    if (!res.ok) {
      mostrarToast(res.error || 'No se pudo actualizar el registro.', 'error');
      return;
    }
    mostrarToast('Registro actualizado.', 'success');
    onGuardado(registroActualizado);
  }

  return (
    <div className="form-grid" style={{ marginTop: '1rem' }}>
      <label className="field-label">
        Nombre
        <input className="field-input" type="text" value={form.nombre || ''} maxLength={120}
          onChange={e => set('nombre', e.target.value)} />
      </label>
      <label className="field-label">
        Edad ({EDAD_MIN}–{EDAD_MAX})
        <input className="field-input" type="number" value={form.edad || ''} min={EDAD_MIN} max={EDAD_MAX} step={1}
          onChange={e => set('edad', e.target.value)} />
      </label>
      <label className="field-label">
        Genero
        <select className="field-input" value={form.genero || ''} onChange={e => set('genero', e.target.value)}>
          <option value="">Seleccionar…</option>
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label className="field-label">
        Tipo de perfil
        <select className="field-input" value={form.perfil || ''} onChange={e => set('perfil', e.target.value)}>
          <option value="">Seleccionar…</option>
          <option value="deportivo">Deportivo</option>
          <option value="entrenador">Entrenador / profesional</option>
          <option value="general">General</option>
        </select>
      </label>
      <label className="field-label" style={{ gridColumn: '1/-1' }}>
        Actividad / deporte
        <input className="field-input" type="text" value={form.deporte || ''}
          onChange={e => set('deporte', e.target.value)} />
      </label>

      <div className="action-row" style={{ gridColumn: '1/-1' }}>
        <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando} type="button">
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button className="btn btn-outline" onClick={onCancelar} disabled={guardando} type="button">Cancelar</button>
      </div>
    </div>
  );
}

/** Modal con resumen del registro, edición y descarga de PDF.
 * @param {Object} props
 * @param {Object|null} props.registro - Registro seleccionado.
 * @param {Function} props.onClose - Cierra el modal.
 * @param {string} props.usuarioId - Identificador del usuario.
 * @param {Function} props.mostrarToast - Muestra notificaciones.
 * @param {Function} props.onActualizado - Notifica un registro actualizado.
 * @returns {JSX.Element|null} */
function ModalDetalle({ registro: r, onClose, usuarioId, mostrarToast, onActualizado }) {
  const [editando, setEditando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  if (!r) return null;
  const getTotal = id => { const c = r.consolidado?.[id]; if (!c) return 0; return typeof c === 'object' ? c.total : c; };

  async function handleDescargarPdf() {
    setDescargando(true);
    try {
      const blob = await descargarInformePdf(usuarioId, r);
      descargarBlob(blob, `physicalpicking-informe-${(r.participante.nombre || 'resultado').replace(/[^a-z0-9]+/gi, '_')}.pdf`);
      mostrarToast?.('Informe PDF generado.', 'success');
    } catch (e) {
      mostrarToast?.(e.message || 'No se pudo generar el PDF.', 'error');
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar"><Icono n="cerrar" /></button>
        <h2 className="modal-title">{r.participante.nombre}</h2>

        {editando ? (
          <FormularioEdicion
            registro={r}
            usuarioId={usuarioId}
            mostrarToast={mostrarToast}
            onCancelar={() => setEditando(false)}
            onGuardado={(actualizado) => { setEditando(false); onActualizado(actualizado); }}
          />
        ) : (
          <>
            <div className="modal-meta-grid">
              {[['Edad', `${r.participante.edad} años`], ['Genero', cap(r.participante.genero)], ['Perfil', cap(r.participante.perfil)], ['Actividad', r.participante.deporte || '—'], ['Fecha', r.fecha]]
                .map(([k, v]) => (
                  <div key={k}>
                    <div className="modal-meta-lbl">{k}</div>
                    <div className="modal-meta-val">{v}</div>
                  </div>
                ))}
            </div>

            <div className="action-row" style={{ margin: '.75rem 0 1rem' }}>
              <button className="btn btn-outline" onClick={() => setEditando(true)} type="button">Editar</button>
              <button className="btn btn-outline" onClick={handleDescargarPdf} disabled={descargando} type="button">
                {descargando ? 'Generando...' : 'Descargar PDF'}
              </button>
            </div>

            {/* R-SEG-04: en registros anteriores a la regla la alerta se deriva de los antecedentes guardados. */}
            <AlertaAntecedentes alertas={[
              (r.evaluacion?.informe?.seguridad?.alertas ?? []).find(a => a.codigo === 'ANTECEDENTE_LESION')
                ?? alertaAntecedenteLesion(r.complementarias?.resultado?.antecedentes),
            ].filter(Boolean)} />

            {(() => {
              // La recomendación proviene del DecisionEngine; el texto heredado solo aplica a registros sin ese bloque.
              const rk = r.evaluacion?.etapas?.ranking;
              const plan = r.evaluacion?.etapas?.planAdaptacion;
              const texto = rk?.familias && 'recomendada' in rk
                ? (rk.recomendada
                  ? `Recomendación firme: ${rk.recomendada.nombre ?? rk.recomendada.id} (${rk.recomendada.porcentaje ?? '—'}% de compatibilidad).`
                  : plan?.estado === 3 ? `Estado 3 · ${plan.nombre}: ${plan.motivo}`
                    : plan?.tipo === 'datos_insuficientes' ? plan.motivo : null)
                : r.interpretacion?.recomendacion;
              return texto ? (
                <div className="interp-recomendacion" style={{ marginBottom: '1rem' }}>
                  <span className="interp-label">Recomendacion</span>
                  <p style={{ fontSize: '.82rem' }}>{texto}</p>
                </div>
              ) : null;
            })()}

            {Array.isArray(r.evaluacion?.etapas?.ranking?.familias) && r.evaluacion.etapas.ranking.familias.length > 0 && (
              <>
                <p className="modal-section-title">Compatibilidad por familia (DecisionEngine)</p>
                <div className="modal-bars" style={{ marginBottom: '1rem' }}>
                  {r.evaluacion.etapas.ranking.familias.slice(0, 5).map(f => (
                    <div key={f.id} className="modal-bar-row">
                      <div className="modal-bar-meta">
                        <span>{f.nombre ?? f.id}{f.firme === false ? ' (no recomendable)' : ''}</span>
                        <strong>{f.porcentaje ?? '—'}{f.porcentaje !== null && f.porcentaje !== undefined ? '%' : ''}</strong>
                      </div>
                      <div className="modal-bar-track">
                        <div className="modal-bar-fill" style={{ width: `${f.porcentaje ?? 0}%`, background: f.firme === false ? '#c9c3e3' : '#5B3FE0' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="modal-section-title">Perfil consolidado final</p>
            <div className="modal-bars">
              {VARS_FISICAS.map(v => {
                const total = getTotal(v.id);
                return (
                  <div key={v.id} className="modal-bar-row">
                    <div className="modal-bar-meta">
                      <span>{v.nombre}</span>
                      <strong style={{ color: v.color }}>{total}%</strong>
                    </div>
                    <div className="modal-bar-track">
                      <div className="modal-bar-fill" style={{ width: `${total}%`, background: v.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Pantalla de historial de evaluaciones.
 * @param {Object} props
 * @param {Array} props.historial - Registros guardados.
 * @param {Function} props.onLimpiar - Borra el historial.
 * @param {Function} props.onNuevo - Inicia una evaluación nueva.
 * @param {Object} props.usuarioActual - Usuario autenticado, o null en modo invitado.
 * @param {Function} props.mostrarToast - Muestra notificaciones.
 * @param {Function} props.onLogout - Cierra sesión.
 * @param {Function} props.onHistorialActualizado - Notifica un registro modificado.
 * @returns {JSX.Element} */
export default function Historial({ historial, onLimpiar, onNuevo, usuarioActual, mostrarToast, onLogout, onHistorialActualizado }) {
  const [detalle, setDetalle] = useState(null);   // Modal de edición y PDF.
  const [verId, setVerId] = useState(null);         // Análisis completo.

  async function handleExportar() {
    try {
      const datos = await exportarMisDatos();
      const blob = generarPdfMisDatos(datos);
      descargarBlob(blob, 'mis-datos-physicalpicking.pdf');
      mostrarToast?.('Descarga de tus datos generada (PDF).', 'success');
    } catch (e) {
      mostrarToast?.(e.message || 'No se pudo exportar tus datos.', 'error');
    }
  }

  async function handleEliminarCuenta() {
    if (!window.confirm('Esto eliminara tu cuenta y TODOS tus datos de forma permanente. ¿Continuar?')) return;
    try {
      await eliminarCuenta();
      mostrarToast?.('Cuenta eliminada.', 'info');
      onLogout?.();
    } catch (e) {
      mostrarToast?.(e.message || 'No se pudo eliminar la cuenta.', 'error');
    }
  }

  function handleActualizado(registroActualizado) {
    setDetalle(registroActualizado);
    onHistorialActualizado?.(registroActualizado);
  }

  const regVisto = verId != null ? historial.find(r => r.id === verId) : null;
  if (regVisto) {
    return (
      <div className="panel-card">
        <DetalleAnalisis registro={regVisto} onVolver={() => setVerId(null)} onEditarPdf={() => setDetalle(regVisto)} />
        {detalle && (
          <ModalDetalle
            registro={detalle}
            onClose={() => setDetalle(null)}
            usuarioId={usuarioActual?.id ?? null}
            mostrarToast={mostrarToast}
            onActualizado={handleActualizado}
          />
        )}
      </div>
    );
  }

  return (
    <div className="panel-card">
      <div className="historial-header">
        <h2 className="panel-title" style={{ margin: 0 }}>Historial</h2>
        <span className="hist-count">{historial.length} {historial.length === 1 ? 'registro' : 'registros'}</span>
      </div>

      {usuarioActual && (
        <div className="action-row mt-lg" style={{ marginBottom: '1rem' }}>
          <button className="btn btn-ghost" onClick={handleExportar} type="button">Descargar mis datos (PDF)</button>
          <button className="btn btn-ghost btn-danger" onClick={handleEliminarCuenta} type="button">Eliminar mi cuenta y mis datos</button>
        </div>
      )}
      {!usuarioActual && (
        <div className="rango-note" style={{ marginBottom: '1rem' }}>
          <span className="rango-note-icon"><Icono n="info" /></span>
          <span>
            Estas en modo invitado: este historial vive solo en este navegador. Si lo
            borras, cambias de navegador o de dispositivo, lo perderas de forma permanente.
          </span>
        </div>
      )}
      {historial.length === 0 ? (
        <div className="empty-block">
          <p>No hay registros guardados.</p>
          <button className="btn btn-outline" onClick={onNuevo} type="button">Iniciar primer analisis</button>
        </div>
      ) : (
        <>
          <div className="hist-list">
            {historial.map((r, i) => {
              const topMotor = r.evaluacion?.etapas?.ranking?.recomendada ?? r.evaluacion?.etapas?.ranking?.familias?.[0] ?? null;
              const topHeredado = r.rankingDeportes?.[0] ?? null;
              const topNombre = topMotor?.nombre ?? topMotor?.id ?? topHeredado?.nombre ?? null;
              const topPct = topMotor?.porcentaje ?? topHeredado?.afinidad ?? null;
              return (
              <button key={r.id} className="hist-card" onClick={() => { setVerId(r.id); window.scrollTo({ top: 0 }); }} type="button">
                <span className="hist-num">#{historial.length - i}</span>
                <div className="hist-info">
                  <div className="hist-name">{r.participante.nombre}</div>
                  <div className="hist-meta">{r.participante.edad} años · {r.participante.perfil} · {r.fecha}</div>
                  {topNombre && (
                    <div className="hist-top-deporte">{topNombre}{topPct !== null && topPct !== undefined ? ` — ${topPct}%` : ''}</div>
                  )}
                </div>
                <span className="hist-tag ht-sport">Ver</span>
              </button>
              );
            })}
          </div>
          <div className="action-row mt-lg">
            <button className="btn btn-outline btn-danger" onClick={onLimpiar} type="button">Limpiar historial</button>
            <button className="btn btn-outline" onClick={onNuevo} type="button">＋ Nuevo analisis</button>
          </div>
        </>
      )}
      {detalle && (
        <ModalDetalle
          registro={detalle}
          onClose={() => setDetalle(null)}
          usuarioId={usuarioActual?.id ?? null}
          mostrarToast={mostrarToast}
          onActualizado={handleActualizado}
        />
      )}
    </div>
  );
}
