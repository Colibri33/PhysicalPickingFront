/**
 * @module vite.config
 * @description Configuración de Vite: plugin de React y puerto del servidor de desarrollo.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
});
