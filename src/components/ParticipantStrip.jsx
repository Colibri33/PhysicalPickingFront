/**
 * @module components/ParticipantStrip
 * @description Franja resumen con los datos del participante evaluado.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): solo presenta datos del participante.
 *  - I (Segregación de interfaces): recibe únicamente el objeto participante.
 */

/** Muestra nombre, edad, género, perfil y actividad opcional; no renderiza sin nombre.
 * @param {Object} props
 * @param {{nombre: string, edad: number, genero: string, perfil: string, deporte?: string}} props.participante - datos del participante.
 * @returns {JSX.Element|null} franja de datos o null si falta el nombre. */
export default function ParticipantStrip({ participante }) {
  if (!participante?.nombre) return null;
  const campos = [
    ['Participante', participante.nombre],
    ['Edad',   `${participante.edad} años`],
    ['Sexo', cap(participante.genero)],
    ['Perfil', cap(participante.perfil)],
    ...(participante.deporte ? [['Actividad', participante.deporte]] : []),
  ];
  return (
    <div className="participant-strip">
      {campos.map(([lbl, val]) => (
        <div key={lbl} className="ps-item">
          <div className="ps-lbl">{lbl}</div>
          <div className="ps-val">{val}</div>
        </div>
      ))}
    </div>
  );
}
/** Capitaliza la primera letra; devuelve un guion largo si no hay valor.
 * @param {string} s - texto de entrada.
 * @returns {string} texto capitalizado. */
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'; }
