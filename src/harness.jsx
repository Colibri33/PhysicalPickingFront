/**
 * @module harness
 * @description Arnés de desarrollo que renderiza MapaCorporalBrechas con un flujo de evaluación de ejemplo, parametrizable por query string.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el escenario de prueba visual del mapa corporal.
 * Notas: uso exclusivo de desarrollo; no forma parte de la aplicación productiva.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import MapaCorporalBrechas from './components/MapaCorporalBrechas';
import { ejecutarFlujoEvaluacion } from './evaluacion';
const q = new URLSearchParams(location.search);
const sexo = q.get('sexo') || 'masculino';
const datos = {
  participante: { nombre: 'Prueba', edad: 22, genero: sexo },
  realesF: { fuerza: '90', fuerzaDer: '45', fuerzaIzq: '45', fuerzaExp: '35', resistencia: q.get('leger') || '5', flexibilidad: '10', equilibrio: '15', equilibrioDer: '7', equilibrioIzq: '8' },
  antropometricas: { peso: '60', talla: '165' }, cuestionarios: { parq: { p1:false,p2:false,p3:false,p4:false,p5:false,p6:false,p7:false } }, leger: { palier: q.get('leger') || '5' },
};
const flujo = ejecutarFlujoEvaluacion(datos);
function App() { const [f, setF] = useState(flujo.etapas.ranking.recomendada?.id ?? ''); return <div style={{ padding: 16, maxWidth: 1280, margin: '0 auto' }}><MapaCorporalBrechas flujo={flujo} familiaId={f} onFamiliaChange={setF} sexo={sexo} /></div>; }
createRoot(document.getElementById('root')).render(<App />);
