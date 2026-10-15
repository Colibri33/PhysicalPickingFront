/* evaluacion/modulos/registro.js — lista unica de modulos del flujo. */
import { MODULOS_FISICOS } from './fisicas.js';
import { MODULO_ANTROPOMETRICAS } from './antropometricas.js';
import { MODULO_PARQ } from './seguridad/parq.js';
import { MODULO_COMPLEMENTARIAS } from './complementarias/physicalpicking.js';
import { MODULO_IPAQ } from './cuestionarios/ipaq.js';
import { MODULO_PSQI } from './cuestionarios/psqi.js';
import { MODULO_BREQ3 } from './cuestionarios/breq3.js';
import { MODULO_BBAQ21 } from './cuestionarios/bbaq21.js';

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
