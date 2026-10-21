/**
 * @module supabaseClient
 * @description Cliente de Supabase para el navegador y URL del backend propio.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la configuración de conexión a Supabase y al backend.
 *  - D (Inversión de dependencias): la configuración llega por variables de entorno (VITE_*), no está fijada en el código.
 * Notas: usa la ANON KEY (pública por diseño, protegida por Row Level Security en Postgres); NUNCA la service role key, que solo reside en el backend.
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* Evita que un inicio de sesión con red lenta quede colgado sin aviso. */
const SUPABASE_TIMEOUT_MS = 25000;

/** fetch con tiempo máximo de espera, que respeta además la señal de cancelación externa.
 * @param {RequestInfo} input - recurso solicitado.
 * @param {RequestInit} [init] - opciones de la petición.
 * @returns {Promise<Response>} respuesta HTTP. */
function fetchConTimeout(input, init = {}) {
  const controlador = new AbortController();
  const id = setTimeout(() => controlador.abort(), SUPABASE_TIMEOUT_MS);
  const senalExterna = init.signal;
  if (senalExterna) {
    if (senalExterna.aborted) controlador.abort();
    else senalExterna.addEventListener('abort', () => controlador.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controlador.signal })
    .finally(() => clearTimeout(id));
}

if (!url || !anonKey) {
  console.error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y complétalo.'
  );
}

export const supabase = createClient(url, anonKey, {
  global: { fetch: fetchConTimeout },
});

/* Backend propio (Render): rutas que cifran o leen datos sensibles y derechos ARCO. */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
