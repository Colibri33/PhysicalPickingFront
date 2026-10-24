/**
 * @module test/misDatosPdf.test
 * @description Pruebas del resumen y la generación del PDF de Mis datos.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el contrato de informeMisDatosPdf.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatearFechaISO,
  resumirRegistro,
  generarPdfMisDatos,
} from '../src/utils/informeMisDatosPdf.js';
import { generarAnalisisDemo } from '../src/utils/rellenoDemo.js';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../src/evaluacion/index.js';
import { NIVELES } from '../src/evaluacion/niveles.js';

const DATOS_EJEMPLO = {
  generadoEn: '2026-10-15T12:00:00.000Z',
  perfil: { nombre: 'Ana', email: 'ana@ejemplo.com', created_at: '2026-01-01T00:00:00.000Z' },
  consentimientos: [
    { created_at: '2026-01-02T00:00:00.000Z', acepto_tratamiento: true, acepto_datos_sensibles: true, politica_version: 'v1.0' },
  ],
  resultados: [
    {
      fecha: '01/02/2026',
      participante: { nombre: 'Ana', edad: 25, genero: 'femenino', perfil: 'deportivo', deporte: 'natación' },
      parq: { resultado: 'apto' },
      consolidado: {
        fuerza: { base: 60, ajAntrop: 5, total: 65 },
        resistencia: { base: 70, ajAntrop: 0, total: 70 },
      },
      ipaq: { resultado: { categoria: 'moderado', met: { total: 1200 } } },
      interpretacion: { parrafo: 'Perfil con buena base aeróbica.', recomendacion: 'Perfil de resistencia.' },
      evaluacion: { etapas: { ranking: { familias: [
        { id: 'natacion', nombre: 'Natación', porcentaje: 82 },
        { id: 'atletismo', nombre: 'Atletismo', porcentaje: 64 },
      ] } } },
    },
  ],
};

describe('informeMisDatosPdf', () => {
  it('formatea fechas ISO a texto legible', () => {
    assert.notEqual(formatearFechaISO('2026-10-15T12:00:00.000Z'), '—');
    assert.equal(formatearFechaISO(null), '—');
  });

  it('resume un registro sin volcar JSON crudo', () => {
    const r = resumirRegistro(DATOS_EJEMPLO.resultados[0]);
    assert.equal(r.nombre, 'Ana');
    assert.equal(r.familias.length, 2);
    assert.equal(r.familias[0].nombre, 'Natación');
    assert.equal(r.recomendacion, 'Perfil de resistencia.');
    assert.equal(r.parq, 'apto');
    assert.ok(r.ipaq.includes('moderado'));
    assert.equal(r.variables.length, 2);
    assert.equal(r.variables[0].nombre, 'Fuerza prensil');
  });

  it('tolera registros vacíos o con forma antigua', () => {
    const r = resumirRegistro({});
    assert.equal(r.nombre, '—');
    assert.deepEqual(r.familias, []);
  });

  it('un registro actual se resume con el nivel de cada capacidad y sin puntajes heredados', () => {
    const analisis = generarAnalisisDemo(() => 0.6, 'masculino');
    const evaluacion = ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis));
    const r = resumirRegistro({ fecha: '01/02/2026', participante: analisis.participante, evaluacion });
    assert.equal(r.variables.length, 5);
    assert.ok(r.variables.every(v => 'nivel' in v && !('total' in v)));
    assert.ok(r.variables.some(v => NIVELES.includes(v.nivel)));
  });

  it('un registro actual se exporta a PDF sin los campos heredados', () => {
    const analisis = generarAnalisisDemo(() => 0.6, 'femenino');
    const evaluacion = ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisis));
    const blob = generarPdfMisDatos({ ...DATOS_EJEMPLO, resultados: [{ fecha: '01/02/2026', participante: analisis.participante, evaluacion }] });
    assert.ok(blob.size > 1000);
  });

  it('genera un Blob PDF no vacío', () => {
    const blob = generarPdfMisDatos(DATOS_EJEMPLO);
    assert.equal(blob.type, 'application/pdf');
    assert.ok(blob.size > 1000, `tamaño inesperado: ${blob.size}`);
  });

  it('genera PDF aun sin datos', () => {
    const blob = generarPdfMisDatos({});
    assert.equal(blob.type, 'application/pdf');
    assert.ok(blob.size > 500);
  });
});
