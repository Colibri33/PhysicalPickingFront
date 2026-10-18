/* ═══════════════════════════════════════════════════════════════
   evaluacion/reglas/preparacionSeguridad.js
   Etapa 6: reglas de preparacion / seguridad previas al motor.

   Solo contiene reglas YA DEFINIDAS en el proyecto:
   - R-SEG-01 (decision propia): el Leger no se aplica a personas con
     dificultades expuestas en el PAR-Q+. Con seguimiento con algun Si
     o incompleto, no se autoriza automaticamente la prueba maxima.
     Extension conservadora coherente con esa regla: PAR-Q+ sin
     responder o con preguntas generales incompletas tampoco autoriza.
   - R-SEG-02 (decision propia): si no hay autorizacion, VO2max queda
     sin dato (no penaliza); se marca "Leger no aplicado".
   - R-SEG-03: las limitaciones declaradas en las preguntas
     complementarias se reportan por prueba (solo aviso, sin excluir).
   - R-SEG-04 (decision propia, 2026-10): un antecedente de lesion
     declarado en las preguntas complementarias (lesion deportiva en
     los ultimos 2 anos, cirugia musculoesqueletica o dolor articular
     recurrente) genera la alerta de adaptacion y recuperacion previa
     antes de iniciar nuevamente un deporte. Solo alerta: no excluye
     familias ni cambia el porcentaje.

   Las reglas de ESTADO DE PREPARACION (Estados 1-3: base fisica +
   IPAQ + PSQI) ya existen dentro del DecisionEngine; aqui no se
   duplican. Esta etapa solo le entrega las condiciones previas.

   Ninguna regla de esta etapa modifica niveles de capacidades ni el
   porcentaje de compatibilidad.
   ═══════════════════════════════════════════════════════════════ */

import { ORIGEN } from '../trazabilidad.js';
import { CLASIFICACION_PARQ } from '../modulos/seguridad/parq.js';
import { CAPACIDADES } from '../modulos/fisicas.js';

export const REGLAS = [
  { id: 'R-SEG-01', origen: ORIGEN.DECISION_PROPIA, descripcion: 'Autorizacion de pruebas maximas (resistencia aeróbica · Léger) segun PAR-Q+.' },
  { id: 'R-SEG-02', origen: ORIGEN.DECISION_PROPIA, descripcion: 'Sin autorizacion, resistencia aeróbica queda sin dato y no penaliza.' },
  { id: 'R-SEG-03', origen: ORIGEN.DECISION_PROPIA, descripcion: 'Limitaciones declaradas se reportan por prueba (aviso).' },
  { id: 'R-SEG-04', origen: ORIGEN.DECISION_PROPIA, descripcion: 'Antecedente de lesion → alerta de adaptacion y recuperacion previa antes de volver al deporte.' },
];

const ANTECEDENTES_LESION = [
  { campo: 'lesion2anios', texto: 'lesión deportiva en los últimos 2 años' },
  { campo: 'cirugiaMusculoesqueletica', texto: 'cirugía por lesión musculoesquelética' },
  { campo: 'dolorArticular', texto: 'dolor articular recurrente' },
];

/** R-SEG-04: alerta por antecedente de lesion (null si no aplica). */
export function alertaAntecedenteLesion(antecedentes) {
  const presentes = ANTECEDENTES_LESION.filter(a => antecedentes?.[a.campo] === true);
  if (presentes.length === 0) return null;
  const zona = typeof antecedentes.zona === 'string' && antecedentes.zona.trim() ? antecedentes.zona.trim() : null;
  return {
    codigo: 'ANTECEDENTE_LESION',
    regla: 'R-SEG-04',
    severidad: 'precaucion',
    titulo: 'Adaptación y recuperación previa',
    mensaje: `Antecedente declarado: ${presentes.map(a => a.texto).join(', ')}${zona ? ` (zona: ${zona})` : ''}. ` +
      'Se recomienda un periodo de adaptación y recuperación previa antes de iniciar nuevamente con algún deporte.',
    antecedentes: presentes.map(a => a.campo),
    zona,
  };
}

const AUTORIZA = new Set([CLASIFICACION_PARQ.SIN_POSITIVOS, CLASIFICACION_PARQ.SEGUIMIENTO_SIN_POSITIVOS]);

export function aplicarReglasPreparacionSeguridad(perfil) {
  const alertas = [];
  const advertencias = [];
  const parq = perfil.seguridad.parq;

  // R-SEG-01
  const clasificacion = parq?.clasificacion ?? null;
  const autorizado = clasificacion !== null && AUTORIZA.has(clasificacion);
  const motivo = clasificacion === null
    ? 'PAR-Q+ sin responder: no se autoriza automaticamente la prueba maxima.'
    : autorizado
      ? 'PAR-Q+ sin hallazgos que impidan la prueba maxima.'
      : `PAR-Q+ en estado "${clasificacion}": no se autoriza automaticamente la prueba maxima.`;
  if (!autorizado && clasificacion !== null) {
    alertas.push({ codigo: 'PARQ_RESTRICCION_PRUEBA_MAXIMA', regla: 'R-SEG-01', severidad: 'restriccion', mensaje: motivo });
  }

  // R-SEG-02
  const vo2 = perfil.compatibilidad.capacidades.vo2max;
  const legerAplicado = vo2.valor !== null;
  if (!autorizado && legerAplicado) {
    advertencias.push('Hay un nivel de resistencia aeróbica (Léger) registrado sin autorizacion automatica del PAR-Q+: revisar antes de usarlo.');
  }
  if (!autorizado) {
    alertas.push({ codigo: 'LEGER_NO_AUTORIZADO', regla: 'R-SEG-02', severidad: 'informativa', mensaje: 'Resistencia aeróbica queda sin dato por la restriccion de prueba maxima; no penaliza.' });
  }

  // R-SEG-03
  const limitadas = perfil.limitaciones?.presente ? (perfil.limitaciones.pruebasAfectadas ?? []) : [];
  const avisosPorPrueba = Object.fromEntries(
    CAPACIDADES.filter(c => limitadas.includes(c.prueba))
      .map(c => [c.id, 'Limitacion declarada por el participante para esta prueba.']));
  if (perfil.limitaciones?.presente) {
    alertas.push({ codigo: 'LIMITACION_DECLARADA', regla: 'R-SEG-03', severidad: 'informativa', mensaje: 'El participante declara limitaciones relevantes para las pruebas.', pruebas: limitadas });
  }

  // R-SEG-04
  const alertaLesion = alertaAntecedenteLesion(perfil.antecedentes);
  if (alertaLesion) alertas.push(alertaLesion);

  return {
    reglasAplicadas: REGLAS,
    pruebaMaxima: { autorizada: autorizado, motivo, desbloqueoProfesional: null, legerAplicado: autorizado && legerAplicado },
    avisosPorPrueba,
    alertas,
    advertencias,
    preparacion: { delegadoA: 'DecisionEngine.evaluarEstado', nota: 'Estados 1-3 se calculan dentro del DecisionEngine con IPAQ, PSQI y base fisica.' },
  };
}
