/**
 * @module utils/red
 * @description Traduce fallos de red a mensajes comprensibles para la persona usuaria.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la redacción de mensajes de error de red.
 * Notas: funciones puras, sin dependencias del navegador; se prueban con node --test.
 */

/** Convierte un error de red en un mensaje legible (sustituye al críptico "Failed to fetch").
 * @param {Error|null|undefined} e - error capturado.
 * @returns {string} mensaje para mostrar. */
export function errorRedAmigable(e) {
  if (!e) return 'Ocurrió un error de red.';
  if (e.name === 'AbortError') {
    return 'El servidor está tardando en responder. Revisa tu conexión a internet e inténtalo de nuevo.';
  }
  const msg = e.message || '';
  if (e instanceof TypeError || /failed to fetch|networkerror|network request failed|load failed/i.test(msg)) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';
  }
  return msg || 'Ocurrió un error inesperado.';
}
