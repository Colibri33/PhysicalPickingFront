/* capacidades.js — "tus capacidades de un vistazo": se calcula localmente
   con los niveles que ya dio el motor (no depende de la IA). */
const NIVELES = ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];
const ETIQUETAS = {
  fuerza: ['fuerza', 'Fuerza de agarre'],
  fuerza_explosiva: ['salto', 'Salto y potencia'],
  vo2max: ['resistencia', 'Resistencia'],
  flexibilidad: ['flexibilidad', 'Flexibilidad'],
  equilibrio: ['equilibrio', 'Equilibrio'],
};

export function capacidadesParaMostrar(capacidades = {}) {
  return Object.entries(ETIQUETAS).map(([id, [icono, nombre]]) => {
    const nivel = capacidades?.[id]?.nivel;
    const idx = NIVELES.indexOf(nivel);
    return idx < 0 ? null : { id, icono, nombre, nivel, paso: idx + 1 };
  }).filter(Boolean);
}
