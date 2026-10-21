/* StepComplementarias.jsx — Preguntas complementarias de PhysicalPicking (paso 3).
   Elaboración propia: NO es PAR-Q+ oficial y se presenta como bloque separado.
   A. Antecedentes de lesiones · B. Limitaciones · C. Experiencia deportiva. */
import { useState } from 'react';
import Icono from './Icono';
import {
  PREGUNTAS_ANTECEDENTES, NIVELES_EXPERIENCIA, MODALIDADES, HABILIDADES,
  PRUEBAS_BATERIA_UI, algunaLesion, faltantesComplementarias,
} from '../logic/complementarias';

function SiNo({ id, valor, onChange, marcados }) {
  return (
    <div className="parq-opciones" role="radiogroup" aria-label={id}>
      {['si', 'no'].map(op => {
        const bool = op === 'si';
        return (
          <button
            key={op} type="button" role="radio" aria-checked={valor === bool}
            className={`parq-opcion${valor === bool ? ' seleccionada' : ''}`}
            onClick={() => onChange(id, bool)}
          >
            {bool ? 'Sí' : 'No'}
          </button>
        );
      })}
    </div>
  );
}

const EXPERIENCIA_VACIA = { deporte: '', anios: '', tipo: '', modalidad: '', habilidad: '' };

export default function StepComplementarias({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const comp = analisis.complementarias ?? { respuestas: {} };
  const respuestas = comp.respuestas ?? {};
  const edad = Number.isInteger(Number(analisis.participante?.edad)) ? Number(analisis.participante.edad) : undefined;
  const conLesion = algunaLesion(respuestas);
  const conLimitacion = respuestas.limitacion_pruebas === true;
  const conPractica = respuestas.practica_deporte === true;
  const [marcados, setMarcados] = useState([]);

  function marcarFaltantes(f) {
    setMarcados([]);
    setTimeout(() => setMarcados(f), 40);
  }

  function handle(id, valor) {
    setMarcados(prev => prev.filter(m => m !== id));
    const r2 = { ...respuestas, [id]: valor };
    if (id === 'practica_deporte' && valor === false) delete r2.experiencias;
    if ((id === 'lesion_2anios' || id === 'cirugia_musculoesqueletica' || id === 'dolor_articular') && !algunaLesion(r2)) {
      delete r2.zona_articulacion;
      delete r2.fecha_aprox_lesion;
      delete r2.tratamiento_medico;
    }
    if (id === 'limitacion_pruebas' && valor === false) {
      delete r2.limitacion_pruebas_afectadas;
      delete r2.limitacion_descripcion;
    }
    updateAnalisis({ complementarias: { respuestas: r2 } });
  }

  function handleTexto(id, valor) {
    setMarcados(prev => prev.filter(m => m !== id));
    updateAnalisis({ complementarias: { respuestas: { ...respuestas, [id]: valor.slice(0, 500) } } });
  }

  function handleExperiencia(idx, campo, valor) {
    const lista = [...(respuestas.experiencias ?? [])];
    lista[idx] = { ...lista[idx], [campo]: valor };
    setMarcados(prev => prev.filter(m => m !== 'experiencias'));
    updateAnalisis({ complementarias: { respuestas: { ...respuestas, experiencias: lista } } });
  }

  function agregarExperiencia() {
    updateAnalisis({ complementarias: { respuestas: { ...respuestas, experiencias: [...(respuestas.experiencias ?? []), { ...EXPERIENCIA_VACIA }] } } });
  }

  function quitarExperiencia(idx) {
    updateAnalisis({ complementarias: { respuestas: { ...respuestas, experiencias: (respuestas.experiencias ?? []).filter((_, i) => i !== idx) } } });
  }

  function handleContinuar() {
    const f = faltantesComplementarias(respuestas, edad);
    if (f.length > 0) {
      marcarFaltantes(f);
      mostrarToast(`Responde todas las preguntas antes de continuar (faltan ${f.length}).`, 'error');
      return;
    }
    setMarcados([]);
    onContinuar();
  }

  const cls = id => `parq-pregunta${marcados.includes(id) ? ' pregunta-faltante' : ''}`;
  const lista = respuestas.experiencias ?? [];

  return (
    <div className="panel-card">
      <h2 className="panel-title">Preguntas complementarias de PhysicalPicking</h2>
      <p className="panel-desc">
        Estas preguntas son elaboración propia de PhysicalPicking y <strong>no forman parte del PAR-Q+ oficial</strong>.
        Todas las preguntas visibles son obligatorias.
      </p>

      <h3 className="section-subtitle">A. Antecedentes de lesiones previas</h3>
      <div className="parq-lista">
        {PREGUNTAS_ANTECEDENTES.map(p => (
          <div key={p.id} className={cls(p.id)}>
            <p className="parq-texto">{p.texto}</p>
            <SiNo id={p.id} valor={respuestas[p.id]} onChange={handle} marcados={marcados} />
          </div>
        ))}
        {conLesion && (
          <>
            <div className={cls('zona_articulacion')}>
              <p className="parq-texto">Si respondió SÍ a alguna de las anteriores, indique la zona/articulación afectada.</p>
              <input className="field-input" type="text" placeholder="ej. rodilla derecha" maxLength={500}
                value={respuestas.zona_articulacion ?? ''} onChange={e => handleTexto('zona_articulacion', e.target.value)} />
            </div>
            <div className={cls('fecha_aprox_lesion')}>
              <p className="parq-texto">Fecha aproximada de la lesión.</p>
              <input className="field-input" type="text" placeholder="ej. marzo de 2024" maxLength={120}
                value={respuestas.fecha_aprox_lesion ?? ''} onChange={e => handleTexto('fecha_aprox_lesion', e.target.value)} />
            </div>
            <div className={cls('tratamiento_medico')}>
              <p className="parq-texto">¿Recibió tratamiento médico/fisioterapéutico?</p>
              <SiNo id="tratamiento_medico" valor={respuestas.tratamiento_medico} onChange={handle} marcados={marcados} />
            </div>
          </>
        )}
      </div>

      <h3 className="section-subtitle">B. Limitaciones relevantes para las pruebas</h3>
      <div className="parq-lista">
        <div className={cls('limitacion_pruebas')}>
          <p className="parq-texto">¿Tiene alguna limitación física relevante para realizar las pruebas físicas?</p>
          <SiNo id="limitacion_pruebas" valor={respuestas.limitacion_pruebas} onChange={handle} marcados={marcados} />
        </div>
        {conLimitacion && (
          <>
            <div className="parq-pregunta">
              <p className="parq-texto">Pruebas a las que afecta (opcional).</p>
              {PRUEBAS_BATERIA_UI.map(p => {
                const sel = Array.isArray(respuestas.limitacion_pruebas_afectadas) && respuestas.limitacion_pruebas_afectadas.includes(p.id);
                return (
                  <label key={p.id} style={{ display: 'flex', gap: '.4rem', alignItems: 'center', fontSize: '.84rem' }}>
                    <input
                      type="checkbox" checked={!!sel}
                      onChange={e => {
                        const actual = new Set(respuestas.limitacion_pruebas_afectadas ?? []);
                        if (e.target.checked) actual.add(p.id); else actual.delete(p.id);
                        updateAnalisis({ complementarias: { respuestas: { ...respuestas, limitacion_pruebas_afectadas: [...actual] } } });
                      }}
                    />
                    {p.etiqueta}
                  </label>
                );
              })}
            </div>
            <div className={cls('limitacion_descripcion')}>
              <p className="parq-texto">Describa la limitación.</p>
              <input className="field-input" type="text" placeholder="ej. dolor al saltar" maxLength={500}
                value={respuestas.limitacion_descripcion ?? ''} onChange={e => handleTexto('limitacion_descripcion', e.target.value)} />
            </div>
          </>
        )}
      </div>

      <h3 className="section-subtitle">C. Experiencia deportiva</h3>
      <div className="parq-lista">
        <div className={cls('practica_deporte')}>
          <p className="parq-texto">¿Ha practicado deporte de forma regular alguna vez?</p>
          <SiNo id="practica_deporte" valor={respuestas.practica_deporte} onChange={handle} marcados={marcados} />
        </div>
        {conPractica && (
          <div className={cls('experiencias')}>
            <p className="parq-texto">Si respondió SÍ, indique el/los deporte(s) practicado(s).</p>
            {lista.map((exp, idx) => (
              <div key={idx} className="parq-pregunta" style={{ marginLeft: '1rem' }}>
                <p className="parq-texto">Deporte {idx + 1}</p>
                <input className="field-input" type="text" placeholder="Deporte" maxLength={80}
                  value={exp.deporte ?? ''} onChange={e => handleExperiencia(idx, 'deporte', e.target.value)} />
                <div className="norm-input-row">
                  <label className="field-label">Años
                    <input className="norm-input" type="number" min={0} max={120} step={1}
                      value={exp.anios ?? ''} onChange={e => handleExperiencia(idx, 'anios', e.target.value === '' ? '' : Number(e.target.value))} />
                  </label>
                  <label className="field-label">Nivel
                    <select className="field-input" value={exp.tipo ?? ''} onChange={e => handleExperiencia(idx, 'tipo', e.target.value)}>
                      <option value="">Seleccionar…</option>
                      {NIVELES_EXPERIENCIA.map(n => <option key={n.valor} value={n.valor}>{n.etiqueta}</option>)}
                    </select>
                  </label>
                </div>
                <div className="norm-input-row">
                  <label className="field-label">Modalidad
                    <select className="field-input" value={exp.modalidad ?? ''} onChange={e => handleExperiencia(idx, 'modalidad', e.target.value)}>
                      <option value="">Seleccionar…</option>
                      {MODALIDADES.map(n => <option key={n.valor} value={n.valor}>{n.etiqueta}</option>)}
                    </select>
                  </label>
                  <label className="field-label">Habilidad
                    <select className="field-input" value={exp.habilidad ?? ''} onChange={e => handleExperiencia(idx, 'habilidad', e.target.value)}>
                      <option value="">Seleccionar…</option>
                      {HABILIDADES.map(n => <option key={n.valor} value={n.valor}>{n.etiqueta}</option>)}
                    </select>
                  </label>
                </div>
                {lista.length > 1 && (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => quitarExperiencia(idx)}>Quitar</button>
                )}
              </div>
            ))}
            <button className="btn btn-outline btn-sm" type="button" onClick={agregarExperiencia}>+ Agregar deporte</button>
          </div>
        )}
        <div className={cls('practica_actual')}>
          <p className="parq-texto">¿Practica actualmente algún deporte de forma regular?</p>
          <SiNo id="practica_actual" valor={respuestas.practica_actual} onChange={handle} marcados={marcados} />
        </div>
      </div>

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar <Icono n="derecha" />
      </button>
    </div>
  );
}
