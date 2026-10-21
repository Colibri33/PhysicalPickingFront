/**
 * @module ia/capacidades
 * @description Resume las capacidades físicas para mostrar, a partir de los niveles ya calculados por el motor.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la presentación resumida de capacidades.
 *  - O (Abierto/Cerrado): ETIQUETAS es un catálogo; se agregan capacidades sin tocar la función.
 * Notas: cálculo local, independiente de la IA.
 */

const NIVELES = ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];
const ETIQUETAS = {
  fuerza: ['fuerza', 'Fuerza de agarre'],
  fuerza_explosiva: ['salto', 'Salto y potencia'],
  vo2max: ['resistencia', 'Resistencia'],
  flexibilidad: ['flexibilidad', 'Flexibilidad'],
  equilibrio: ['equilibrio', 'Equilibrio'],
};

/** Construye la lista de capacidades con nivel válido, con ícono, nombre y paso (1-5).
 * @param {Object} [capacidades] - capacidades del motor indexadas por id, con campo nivel.
 * @returns {Array<{id: string, icono: string, nombre: string, nivel: string, paso: number}>} capacidades a mostrar. */
export function capacidadesParaMostrar(capacidades = {}) {
  return Object.entries(ETIQUETAS).map(([id, [icono, nombre]]) => {
    const nivel = capacidades?.[id]?.nivel;
    const idx = NIVELES.indexOf(nivel);
    return idx < 0 ? null : { id, icono, nombre, nivel, paso: idx + 1 };
  }).filter(Boolean);
}
