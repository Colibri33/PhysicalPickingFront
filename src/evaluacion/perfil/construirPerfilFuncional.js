/**
 * @module evaluacion/perfil/construirPerfilFuncional
 * @description Perfil funcional (etapa 5): agrupa los datos ya normalizados de cada módulo según la capa a la que pertenecen.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la agrupación del perfil por capas.
 *  - D (Inversión de dependencias): consume sobres de trazabilidad ya producidos, sin conocer cómo se evaluó cada módulo.
 * Notas: no calcula. Única excepción (seguridad, R-SEG-04): si el bloque complementario es inválido por otra pregunta, los antecedentes de
 * lesión declarados (tres Sí/No y zona) se leen de la respuesta original para no perder la alerta de adaptación y recuperación.
 */

import { CAPACIDADES } from '../modulos/fisicas.js';
import { antecedentesDeclarados } from '../modulos/complementarias/physicalpicking.js';
import { ESTADO_MODULO } from '../trazabilidad.js';

/** Obtiene el dato normalizado de un módulo.
 * @param {Object} m - sobre de trazabilidad.
 * @returns {*} dato normalizado o null. */
const dato = (m) => m?.datoNormalizado ?? null;
/** Referencia de origen (id y estado) de un módulo.
 * @param {Object} m - sobre de trazabilidad.
 * @returns {{moduloId: string, estado: string}|null} referencia. */
const ref = (m) => (m ? { moduloId: m.moduloId, estado: m.estado } : null);

/** Construye el perfil funcional a partir de los resultados por módulo.
 * @param {Object} resultados - sobres de trazabilidad por id de módulo.
 * @param {{sexo?: string, edad?: number}} contexto - datos del participante.
 * @returns {Object} perfil con compatibilidad, preparación, seguridad, antecedentes, limitaciones, experiencia e informativas. */
export function construirPerfilFuncional(resultados, contexto) {
  const capacidades = {};
  for (const c of CAPACIDADES) {
    const m = resultados[`fisica_${c.id}`];
    capacidades[c.id] = {
      nivel: m?.nivel ?? null,
      valor: m?.datoNormalizado?.valor ?? null,
      unidad: m?.datoNormalizado?.unidad ?? null,
      origen: ref(m),
    };
  }
  const mCompl = resultados.complementarias_physicalpicking;
  const compl = dato(mCompl);
  const antecedentes = compl?.antecedentes
    ?? (mCompl?.estado === ESTADO_MODULO.INVALIDO ? antecedentesDeclarados(mCompl.respuestaOriginal) : null);

  return {
    participante: { sexo: contexto.sexo ?? null, edad: contexto.edad ?? null },
    compatibilidad: { capacidades }, // alimenta el porcentaje del DecisionEngine
    preparacion: { // alimenta el estado de preparación
      ipaq: dato(resultados.ipaq), psqi: dato(resultados.psqi),
      origen: { ipaq: ref(resultados.ipaq), psqi: ref(resultados.psqi) },
    },
    seguridad: { parq: dato(resultados.parq), origen: ref(resultados.parq) }, // alertas; nunca porcentaje
    antecedentes,
    limitaciones: compl?.limitaciones ?? null,
    experiencia: compl?.experiencia ?? null,
    informativas: { // solo interpretación e informe
      antropometricas: dato(resultados.antropometricas),
      breq3: dato(resultados.breq3),
      bbaq21: dato(resultados.bbaq21),
    },
  };
}
