/**
 * @module components/Icono
 * @description Catálogo de iconos SVG de trazo que heredan el color del texto y sustituyen emojis en la interfaz.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el catálogo de iconos y su renderizado.
 *  - O (Abierto/Cerrado): se añaden iconos agregando entradas a RUTAS sin modificar el componente.
 */
const RUTAS = {
  derecha: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  izquierda: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  arriba: <><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>,
  abajo: <><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  cerrar: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
  enviar: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  tendencia: <><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></>,
  alerta: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  rayo: <path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  destellos: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 3v4" /><path d="M21 5h-4" /><path d="M5 17v4" /><path d="M7 19H3" /></>,
  robot: <><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></>,
  objetivo: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  // Capacidades físicas
  fuerza: <><path d="M6.5 6.5v11" /><path d="M17.5 6.5v11" /><path d="M3.5 9v6" /><path d="M20.5 9v6" /><path d="M6.5 12h11" /></>,
  salto: <><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
  resistencia: <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />,
  flexibilidad: <><path d="m8 3-4 4 4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></>,
  equilibrio: <><path d="M12 3v18" /><path d="M7 21h10" /><path d="M3 7h18" /><path d="m5 7-3 7h6z" /><path d="m19 7-3 7h6z" /></>,
};

/** Renderiza el icono identificado por su nombre; si no existe, un SVG vacío.
 * @param {Object} props
 * @param {string} props.n - clave del icono en RUTAS.
 * @param {string} [props.className] - clases CSS adicionales.
 * @returns {JSX.Element} elemento SVG decorativo (aria-hidden). */
export default function Icono({ n, className = '' }) {
  return (
    <svg className={`ico ${className}`.trim()} viewBox="0 0 24 24" width="1em" height="1em" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {RUTAS[n] ?? null}
    </svg>
  );
}
