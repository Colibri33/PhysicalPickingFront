/* Historial.jsx v6 — edicion de registros + descarga PDF */
import { useState } from 'react';
import { VARS_FISICAS } from '../logic/modelo';
import { EDAD_MIN, EDAD_MAX } from './StepParticipante';
import {
  exportarMisDatos,
  eliminarCuenta,
  actualizarRegistroHistorial,
  descargarInformePdf,
} from '../auth/authService';

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

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

    // Nombre/edad/genero/perfil/deporte NO participan en el motor de
    // calculo (logic/modelo.js) — no hace falta recalcular fisicas,
    // cognitivas, consolidado ni ranking al editar solo estos campos.
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
        <button className="modal-close" onClick={onClose} type="button">✕</button>
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

            {r.interpretacion?.recomendacion && (
              <div className="interp-recomendacion" style={{ marginBottom: '1rem' }}>
                <span className="interp-label">Recomendacion</span>
                <p style={{ fontSize: '.82rem' }}>{r.interpretacion.recomendacion}</p>
              </div>
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

export default function Historial({ historial, onLimpiar, onNuevo, usuarioActual, mostrarToast, onLogout, onHistorialActualizado }) {
  const [detalle, setDetalle] = useState(null);

  async function handleExportar() {
    try {
      const datos = await exportarMisDatos();
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
      descargarBlob(blob, 'mis-datos-physicalpicking.json');
      mostrarToast?.('Descarga de tus datos generada.', 'success');
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

  return (
    <div className="panel-card">
      <div className="historial-header">
        <h2 className="panel-title" style={{ margin: 0 }}>Historial</h2>
        <span className="hist-count">{historial.length} {historial.length === 1 ? 'registro' : 'registros'}</span>
      </div>

      {usuarioActual && (
        <div className="action-row mt-lg" style={{ marginBottom: '1rem' }}>
          <button className="btn btn-ghost" onClick={handleExportar} type="button">Descargar mis datos (Habeas Data · JSON)</button>
          <button className="btn btn-ghost btn-danger" onClick={handleEliminarCuenta} type="button">Eliminar mi cuenta y mis datos</button>
        </div>
      )}
      {!usuarioActual && (
        <div className="rango-note" style={{ marginBottom: '1rem' }}>
          <span className="rango-note-icon">ℹ</span>
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
            {historial.map((r, i) => (
              <button key={r.id} className="hist-card" onClick={() => setDetalle(r)} type="button">
                <span className="hist-num">#{historial.length - i}</span>
                <div className="hist-info">
                  <div className="hist-name">{r.participante.nombre}</div>
                  <div className="hist-meta">{r.participante.edad} años · {r.participante.perfil} · {r.fecha}</div>
                  {r.rankingDeportes?.[0] && (
                    <div className="hist-top-deporte">{r.rankingDeportes[0].nombre} — {r.rankingDeportes[0].afinidad}%</div>
                  )}
                </div>
                <span className="hist-tag ht-sport">Ver</span>
              </button>
            ))}
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
