/* ═══════════════════════════════════════════════════════════════
   evaluacion/decision/decisionEngine.js
   DecisionEngine DE REFERENCIA v1 (auditable, sustituible).
   Aplica EXCLUSIVAMENTE la regla aprobada:
     - compatibilidad por familia: cumple/no cumple ordinal contra la
       matriz de demanda (compatibilidad.js);
     - Mitchell: solo desempate/priorización de brechas (no modifica
       el porcentaje);
     - sin pesos, sin conversiones numéricas de niveles.
   El porcentaje publicado es compatibilidad × 100 (escala de
   presentación, no metodología). Sin dato en una capacidad: fuera del
   numerador y del denominador (baja cobertura, no penaliza).
   La preparación (base física + IPAQ + PSQI) se informa de forma
   descriptiva, sin umbrales inventados.
   Para usar otro motor: registrarDecisionEngine(otro) o pasarlo en
   opciones { decisionEngine }.
   ═══════════════════════════════════════════════════════════════ */

import { validarEntradaDecisionEngine } from './decisionEnginePort.js';
import { MATRIZ_DEMANDA } from './matrizDemanda.js';
import { ordenarFamilias } from './compatibilidad.js';

// 1.2: R-DEC-02 (brecha severa → no firme) y motivosNoFirme en la salida.
export const VERSION_MOTOR_REFERENCIA = '1.2-referencia';

export class DecisionEngineReferencia {
  constructor(config = {}) {
    this.matriz = config.matriz ?? MATRIZ_DEMANDA;
    this.version = config.version ?? VERSION_MOTOR_REFERENCIA;
  }

  evaluar(entrada) {
    const contrato = validarEntradaDecisionEngine(entrada);
    if (!contrato.ok) {
      throw new Error(`Entrada del DecisionEngine invalida: ${contrato.errores.join(' ')}`);
    }
    const niveles = {
      fuerza: entrada.capacidades.fuerza ?? null,
      fuerza_explosiva: entrada.capacidades.fuerza_explosiva ?? null,
      vo2max: entrada.capacidades.vo2max ?? null,
      flexibilidad: entrada.capacidades.flexibilidad ?? null,
      equilibrio: entrada.capacidades.equilibrio ?? null,
    };
    const ranking = ordenarFamilias(niveles, this.matriz).map(r => ({
      id: r.familiaId,
      porcentaje: r.compatibilidad === null ? null : Math.round(r.compatibilidad * 100),
      compatibilidad: r.compatibilidad,
      cobertura: r.cobertura,
      mitchell: r.mitchell,
      brechas: r.brechas,
      brechasRelevantes: r.brechasRelevantes,
      brechasSeveras: r.brechasSeveras,
      carencias: r.carencias,
      carenciasRelevantes: r.carenciasRelevantes,
      firme: r.firme,
      motivosNoFirme: r.motivosNoFirme,
    }));
    return {
      estado: 'evaluado',
      motor: { id: 'referencia', version: this.version },
      compatibilidad: { ranking },
      preparacion: {
        baseFisica: {
          fuerza: niveles.fuerza, fuerza_explosiva: niveles.fuerza_explosiva,
          flexibilidad: niveles.flexibilidad, equilibrio: niveles.equilibrio, vo2max: niveles.vo2max,
        },
        ipaq: entrada.ipaq,
        psqi: entrada.psqi,
        nota: 'Estados de preparación descriptivos; umbrales de Estado 1-3 pendientes de definición.',
      },
      experiencia: {
        experiencias: entrada.experiencias ?? [],
        nota: 'La regla de 2 años y la interpretación por familia viven en este motor: pendientes de definición.',
      },
      seguridad: { alertas: [] },
    };
  }
}
