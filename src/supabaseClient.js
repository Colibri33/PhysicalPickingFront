/* 
   supabaseClient.js
   Cliente de Supabase para el navegador. Usa la ANON KEY (pública
   por diseño, protegida por Row Level Security en Postgres)NUNCA
   la service role key, que solo vive en el backend.
*/

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* Tiempo máximo de espera para Auth (redes móviles lentas).
   Sin esto, un login con red pobre se queda colgado sin aviso. */
const SUPABASE_TIMEOUT_MS = 25000;

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

// URL del backend propio (Render), para las rutas que cifran/leen
// datos sensibles y para los derechos ARCO.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
