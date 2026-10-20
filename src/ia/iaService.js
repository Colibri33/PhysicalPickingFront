/* iaService.js — llamadas al backend /ia (la clave de DeepSeek nunca llega al navegador). */
import { API_URL } from '../supabaseClient';

async function post(ruta, cuerpo) {
  let res;
  try {
    res = await fetch(`${API_URL}/ia${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo obtener respuesta de la IA.');
  return data.texto;
}

export const interpretarConIA = resumen => post('/interpretar', { resumen });
export const preguntarALaIA = (resumen, mensajes) => post('/chat', { resumen, mensajes: mensajes.slice(-10) });
