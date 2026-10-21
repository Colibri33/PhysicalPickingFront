/**
 * @module ia/iaService
 * @description Cliente HTTP de las rutas /ia del backend (interpretación y chat).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el contrato de comunicación con el backend de IA.
 *  - D (Inversión de dependencias): depende de la URL base API_URL, no de un proveedor concreto.
 * Notas: la clave del proveedor de IA (DeepSeek) nunca llega al navegador.
 */

import { API_URL } from '../supabaseClient';

/* Red de seguridad: la interfaz no debe mostrar emojis. */
const quitarEmojis = t => String(t ?? '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/[ \t]+\n/g, '\n');

/** Envía una petición POST JSON a una ruta /ia y devuelve el texto sin emojis.
 * @param {string} ruta - sufijo de la ruta bajo /ia.
 * @param {Object} cuerpo - carga útil JSON.
 * @returns {Promise<string>} texto de respuesta saneado.
 * @throws {Error} si no hay conexión o el servidor responde con error. */
async function post(ruta, cuerpo) {
  let res;
  try {
    res = await fetch(`${API_URL}/ia${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo obtener respuesta de la IA.');
  return quitarEmojis(data.texto);
}

/** Solicita la interpretación de un resumen de resultados.
 * @param {Object} resumen - resumen construido por construirResumenIA.
 * @returns {Promise<string>} texto de la interpretación. */
export const interpretarConIA = resumen => post('/interpretar', { resumen });
/** Envía una conversación (últimos 10 mensajes) con el resumen como contexto.
 * @param {Object} resumen - resumen construido por construirResumenIA.
 * @param {Array<Object>} mensajes - historial de mensajes.
 * @returns {Promise<string>} respuesta de la IA. */
export const preguntarALaIA = (resumen, mensajes) => post('/chat', { resumen, mensajes: mensajes.slice(-10) });
