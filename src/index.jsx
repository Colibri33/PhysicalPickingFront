/**
 * @module index
 * @description Punto de entrada: monta la aplicación React en el elemento raíz.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el arranque de la aplicación.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
