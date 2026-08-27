/* ─── StepParticipante.jsx ─── */
export default function StepParticipante({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const p = analisis.participante;

  function handleChange(campo, valor) {
    updateAnalisis({ participante: { ...p, [campo]: valor } });
  }

  function handleContinuar() {
    const nombre = p.nombre.trim();
    if (!nombre)              return mostrarToast('Ingresa el nombre del participante.', 'error');
    if (nombre.length > 120)  return mostrarToast('El nombre es demasiado largo (maximo 120 caracteres).', 'error');
    if (!p.edad || isNaN(p.edad) || !Number.isInteger(+p.edad) || +p.edad < 1 || +p.edad > 120)
      return mostrarToast('Ingresa una edad valida en anos completos (1-120).', 'error');
    if (!p.genero)             return mostrarToast('Selecciona el genero.', 'error');
    if (!p.perfil)             return mostrarToast('Selecciona el tipo de perfil.', 'error');
    if (nombre !== p.nombre) updateAnalisis({ participante: { ...p, nombre } });
    mostrarToast(`Participante "${nombre}" registrado.`, 'success');
    onContinuar();
  }

  return (
    <div className="panel-card">
      <h2 className="panel-title">Datos del participante</h2>

      <div className="form-grid">
        <label className="field-label">
          Nombre
          <input className="field-input" type="text" value={p.nombre} maxLength={120}
            onChange={e => handleChange('nombre', e.target.value)} />
        </label>

        <label className="field-label">
          Edad
          <input className="field-input" type="number" value={p.edad} min={1} max={120} step={1}
            onChange={e => handleChange('edad', e.target.value)} />
        </label>

        <label className="field-label">
          Genero
          <select className="field-input" value={p.genero}
            onChange={e => handleChange('genero', e.target.value)}>
            <option value="">Seleccionar…</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>
        </label>

        <label className="field-label">
          Tipo de perfil
          <select className="field-input" value={p.perfil}
            onChange={e => handleChange('perfil', e.target.value)}>
            <option value="">Seleccionar…</option>
            <option value="deportivo">Deportivo</option>
            <option value="academico">Academico</option>
            <option value="general">General</option>
          </select>
        </label>

        <label className="field-label" style={{ gridColumn: '1/-1' }}>
          Actividad / deporte <span className="field-hint">(opcional)</span>
          <input className="field-input" type="text" value={p.deporte}
            onChange={e => handleChange('deporte', e.target.value)} />
        </label>
      </div>

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar →
      </button>
    </div>
  );
}
