/**
 * @module evaluacion/modulos/registro
 * @description Lista única de módulos del flujo de evaluación e ids de cuestionarios esperados.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la composición del conjunto de módulos.
 *  - O (Abierto/Cerrado): un módulo nuevo se añade a la lista sin modificar el orquestador.
 */
import { MODULOS_FISICOS } from './fisicas.js';
import { MODULO_ANTROPOMETRICAS } from './antropometricas.js';
import { MODULO_PARQ } from './seguridad/parq.js';
import { MODULO_COMPLEMENTARIAS } from './complementarias/physicalpicking.js';
import { MODULO_IPAQ } from './cuestionarios/ipaq.js';
import { MODULO_PSQI } from './cuestionarios/psqi.js';
import { MODULO_BREQ3 } from './cuestionarios/breq3.js';
import { MODULO_BBAQ21 } from './cuestionarios/bbaq21.js';

/** Módulos en orden de ejecución. */
export const MODULOS = [
  ...MODULOS_FISICOS,
  MODULO_ANTROPOMETRICAS,
  MODULO_PARQ,
  MODULO_COMPLEMENTARIAS,
  MODULO_IPAQ,
  MODULO_PSQI,
  MODULO_BREQ3,
  MODULO_BBAQ21,
];

/** Ids de cuestionarios que espera `analisis.cuestionarios`. */
export const IDS_CUESTIONARIOS = ['parq', 'complementarias', 'ipaq', 'psqi', 'breq3', 'bbaq21'];
