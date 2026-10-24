/**
 * @module components/StepParticipante
 * @description Paso 1: datos del participante, con validación obligatoria antes de avanzar.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): captura y validación de datos básicos.
 * Notas: población objetivo de 18 a 30 años (batería EUROFIT prevista); todos los campos son obligatorios.
 */
import Icono from './Icono';
const EDAD_MIN = 18;
const EDAD_MAX = 30;
export { EDAD_MIN, EDAD_MAX };

/**
 * Paso de datos del participante.
 * @param {Object} props
 * @param {Object} props.analisis - Estado global del análisis.
 * @param {Function} props.updateAnalisis - Actualiza parcialmente el análisis.
 * @param {Function} props.onContinuar - Avanza al siguiente paso.
 * @param {Function} props.mostrarToast - Muestra notificaciones.
 * @returns {JSX.Element}
 */
export default function StepParticipante({ analisis, updateAnalisis, onContinuar, mostrarToast }) {
  const p = analisis.participante;

  /** Actualiza un campo del participante.
   * @param {string} campo - Nombre del campo.
   * @param {*} valor - Nuevo valor. */
  function handleChange(campo, valor) {
    updateAnalisis({ participante: { ...p, [campo]: valor } });
  }

  /** Valida y avanza al siguiente paso. */
  function handleContinuar() {
    const nombre = (p.nombre || '').trim();
    if (!nombre)              return mostrarToast('Ingresa el nombre del participante.', 'error');
    if (nombre.length > 120)  return mostrarToast('El nombre es demasiado largo (maximo 120 caracteres).', 'error');

    if (p.edad === '' || p.edad === null || p.edad === undefined)
      return mostrarToast('Ingresa la edad del participante.', 'error');
    const edadNum = Number(p.edad);
    if (isNaN(edadNum) || !Number.isInteger(edadNum))
      return mostrarToast('La edad debe ser un numero entero.', 'error');
    if (edadNum < EDAD_MIN || edadNum > EDAD_MAX)
      return mostrarToast(`PhysicalPicking evalua unicamente participantes de ${EDAD_MIN} a ${EDAD_MAX} anos. Edad ingresada: ${edadNum}.`, 'error');

    if (!p.genero)  return mostrarToast('Selecciona el sexo biológico.', 'error');
    if (!p.perfil)  return mostrarToast('Selecciona el tipo de perfil.', 'error');
    if (!(p.deporte || '').trim()) return mostrarToast('Ingresa la actividad o deporte del participante.', 'error');

    if (nombre !== p.nombre) updateAnalisis({ participante: { ...p, nombre } });
    mostrarToast(`Participante "${nombre}" registrado.`, 'success');
    onContinuar();
  }

  return (
    <div className="panel-card">
      <h2 className="panel-title">Datos del participante</h2>
      <p className="panel-desc">
        PhysicalPicking evalua participantes adultos entre {EDAD_MIN} y {EDAD_MAX} años.
        Todos los campos son obligatorios.
      </p>

      <div className="form-grid">
        <label className="field-label">
          Nombre
          <input className="field-input" type="text" value={p.nombre} maxLength={120}
            onChange={e => handleChange('nombre', e.target.value)} />
        </label>

        <label className="field-label">
          Edad ({EDAD_MIN}–{EDAD_MAX} años)
          <input className="field-input" type="number" value={p.edad} min={EDAD_MIN} max={EDAD_MAX} step={1}
            onChange={e => handleChange('edad', e.target.value)} />
        </label>

        <label className="field-label">
          Sexo biológico
          <select className="field-input" value={p.genero}
            onChange={e => handleChange('genero', e.target.value)}>
            <option value="">Seleccionar…</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
        </label>

        <label className="field-label">
          Tipo de perfil
          <select className="field-input" value={p.perfil}
            onChange={e => handleChange('perfil', e.target.value)}>
            <option value="">Seleccionar…</option>
            <option value="deportivo">Deportivo</option>
            <option value="entrenador">Entrenador / profesional</option>
            <option value="general">General</option>
          </select>
        </label>

        <label className="field-label" style={{ gridColumn: '1/-1' }}>
          Actividad / deporte
          <input className="field-input" type="text" value={p.deporte}
            onChange={e => handleChange('deporte', e.target.value)} />
        </label>
      </div>

      <button className="btn btn-primary btn-full mt-lg" onClick={handleContinuar} type="button">
        Continuar <Icono n="derecha" />
      </button>
    </div>
  );
}
