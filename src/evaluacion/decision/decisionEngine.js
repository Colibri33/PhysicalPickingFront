/**
 * @module evaluacion/decision/decisionEngine
 * @description DecisionEngine de referencia v1: compatibilidad ordinal por familia, Mitchell como desempate y preparación descriptiva.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la composición de la salida del motor de referencia.
 *  - O (Abierto/Cerrado): la matriz y la versión se configuran en el constructor; otro motor se registra sin modificar este.
 *  - L (Sustitución de Liskov): expone evaluar(entrada), el contrato del puerto, por lo que es sustituible por el motor definitivo.
 *  - D (Inversión de dependencias): la matriz se inyecta por configuración y la entrada se valida con el puerto.
 * Notas: aplica solo la regla aprobada, sin pesos ni conversiones numéricas de niveles; el porcentaje es compatibilidad × 100 (escala de presentación).
 * Sin dato en una capacidad: fuera de numerador y denominador. La preparación se informa de forma descriptiva, sin umbrales inventados.
 * Para usar otro motor: registrarDecisionEngine(otro) o pasar { decisionEngine } en las opciones.
 */

import { validarEntradaDecisionEngine } from './decisionEnginePort.js';
import { MATRIZ_DEMANDA } from './matrizDemanda.js';
import { ordenarFamilias } from './compatibilidad.js';

/** Versión del motor; 1.2 incorpora R-DEC-02 (brecha severa → no firme) y motivosNoFirme en la salida. */
export const VERSION_MOTOR_REFERENCIA = '1.2-referencia';

/** Motor de referencia auditable y sustituible. */
export class DecisionEngineReferencia {
  /** @param {Object} [config] - configuración.
   * @param {Object[]} [config.matriz] - matriz de demandas.
   * @param {string} [config.version] - versión del motor. */
  constructor(config = {}) {
    this.matriz = config.matriz ?? MATRIZ_DEMANDA;
    this.version = config.version ?? VERSION_MOTOR_REFERENCIA;
  }

  /** Evalúa la entrada y devuelve ranking, preparación y experiencia.
   * @param {Object} entrada - entrada conforme al puerto.
   * @returns {Object} salida del motor.
   * @throws {Error} si la entrada no cumple el contrato. */
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
