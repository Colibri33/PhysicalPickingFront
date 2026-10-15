/* red.js — helpers puros para fallos de red (sin dependencias
   de navegador: se pueden probar con node --test). */

/* Traduce fallos de red a un mensaje que la persona sí entiende,
   en vez del críptico "Failed to fetch". */
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
