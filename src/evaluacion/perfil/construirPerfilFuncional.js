/* ═══════════════════════════════════════════════════════════════
   evaluacion/perfil/construirPerfilFuncional.js
   Etapa 5: construccion del perfil funcional.
   Agrupa SOLO datos ya normalizados (datoNormalizado / nivel) de cada
   modulo, ordenados por la capa a la que pertenecen. No lee
   respuestas originales ni calcula nada nuevo.
   ═══════════════════════════════════════════════════════════════ */

import { CAPACIDADES } from '../modulos/fisicas.js';

const dato = (m) => m?.datoNormalizado ?? null;
const ref = (m) => (m ? { moduloId: m.moduloId, estado: m.estado } : null);

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
  const compl = dato(resultados.complementarias_physicalpicking);

  return {
    participante: { sexo: contexto.sexo ?? null, edad: contexto.edad ?? null },
    compatibilidad: { capacidades },                                  // → porcentaje del DecisionEngine
    preparacion: {                                                     // → estado de preparacion
      ipaq: dato(resultados.ipaq), psqi: dato(resultados.psqi),
      origen: { ipaq: ref(resultados.ipaq), psqi: ref(resultados.psqi) },
    },
    seguridad: { parq: dato(resultados.parq), origen: ref(resultados.parq) }, // → alertas, nunca porcentaje
    antecedentes: compl?.antecedentes ?? null,
    limitaciones: compl?.limitaciones ?? null,
    experiencia: compl?.experiencia ?? null,
    informativas: {                                                    // → interpretacion e informe
      antropometricas: dato(resultados.antropometricas),
      breq3: dato(resultados.breq3),
      bbaq21: dato(resultados.bbaq21),
    },
  };
}
