/**
 * @module test/carga.test
 * @description Guarda de la carga diferida: el generador de PDF (jsPDF) no debe entrar al paquete principal (node --test).
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la regla de qué módulos pesados se cargan al inicio.
 * Notas: jsPDF pesa ~336 KB (107 KB comprimido). Solo utils/informeMisDatosPdf.js puede importarlo, y nadie en src/ puede importar ese módulo ni
 * utils/recursosPdf de forma estática: se cargan con import() al pulsar "Descargar mis datos". Es un chequeo sobre el texto de los fuentes porque
 * el entorno de pruebas no compila el paquete.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname;

/** Lista recursivamente los archivos .js y .jsx de una carpeta.
 * @param {string} dir - carpeta.
 * @returns {string[]} rutas absolutas. */
function fuentes(dir) {
  return readdirSync(dir).flatMap(n => {
    const ruta = join(dir, n);
    return statSync(ruta).isDirectory() ? fuentes(ruta) : (/\.jsx?$/.test(n) ? [ruta] : []);
  });
}

const PESADOS = [/from\s+['"]jspdf['"]/, /from\s+['"][^'"]*utils\/informeMisDatosPdf(\.js)?['"]/, /from\s+['"][^'"]*utils\/recursosPdf(\.jsx?)?['"]/];

test('carga diferida: ningún módulo del inicio importa jsPDF ni el generador de PDF de forma estática', () => {
  const infractores = [];
  for (const ruta of fuentes(SRC)) {
    const texto = readFileSync(ruta, 'utf8');
    const rel = relative(SRC, ruta);
    for (const patron of PESADOS) {
      if (!patron.test(texto)) continue;
      // jsPDF solo lo importa el propio generador.
      if (rel === 'utils/informeMisDatosPdf.js' && /jspdf/.test(patron.source)) continue;
      infractores.push(`${rel}: ${patron}`);
    }
  }
  assert.deepEqual(infractores, []);
});

test('carga diferida: el historial descarga el generador con import() al exportar', () => {
  const historial = readFileSync(join(SRC, 'components/Historial.jsx'), 'utf8');
  assert.match(historial, /import\('\.\.\/utils\/informeMisDatosPdf'\)/);
  assert.match(historial, /import\('\.\.\/utils\/recursosPdf'\)/);
});
