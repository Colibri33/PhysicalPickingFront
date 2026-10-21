/**
 * @module evaluacion/modulos/antropometricas
 * @description Módulo de variables antropométricas (IMC e ICC) de destino informativo.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la evaluación de las variables antropométricas.
 *  - L (Sustitución de Liskov): cumple el contrato de módulo de ejecutarModulo.
 *  - D (Inversión de dependencias): reutiliza calcularIMC, calcularICC y RANGOS_ANTROPOMETRICOS de logic/modelo.js y el validador genérico.
 * Notas: no entra al porcentaje de compatibilidad (DESTINO.INFORMATIVA). IMC según categorías OMS; ICC según cortes WHO 2008
 * (icc.pdf: ≥ 0,90 masculino, ≥ 0,85 femenino). Baremos definitivos pendientes.
 */

import { calcularIMC, calcularICC, clasificarICC, RANGOS_ANTROPOMETRICOS } from '../../logic/modelo.js';
import { ORIGEN, TIPO_MODULO, DESTINO, ESTADO_MODULO } from '../trazabilidad.js';
import { validarItems } from '../validacion/validarRespuestas.js';

const CAMPOS = Object.keys(RANGOS_ANTROPOMETRICOS);

const ITEMS = CAMPOS.map(id => ({
  id, tipo: 'numero', requerido: false, tema: RANGOS_ANTROPOMETRICOS[id].etiqueta,
  min: RANGOS_ANTROPOMETRICOS[id].min, max: RANGOS_ANTROPOMETRICOS[id].max,
}));

/** Módulo antropométrico conforme al contrato de ejecutarModulo. */
export const MODULO_ANTROPOMETRICAS = {
  id: 'antropometricas',
  nombre: 'Variables antropometricas',
  tipo: TIPO_MODULO.ANTROPOMETRIA,
  destino: DESTINO.INFORMATIVA,
  version: '0.1.0',
  estadoConfiguracion: 'baremo_pendiente',
  fuente: {
    referencia: 'IMC: logica existente de calcularIMC (categorias OMS). ICC: cortes WHO 2008 (icc.pdf: ≥0,90 masculino, ≥0,85 femenino). Demas variables: baremos antropometricos pendientes.',
    origen: ORIGEN.LITERATURA,
  },
  pendientes: [
    'Integrar los baremos/puntos de corte antropometricos definitivos restantes.',
    '% grasa y % masa muscular retirados de la captura (registros historicos en _legado).',
  ],

  /** Extrae las variables antropométricas numéricas.
   * @param {Object} datos - datos ingresados.
   * @returns {Object|undefined} respuestas por variable. */
  extraer(datos) {
    const a = datos?.antropometricas;
    if (!a) return undefined;
    const r = {};
    for (const c of CAMPOS) {
      const raw = a[c];
      if (raw === '' || raw === null || raw === undefined) continue;
      const n = typeof raw === 'number' ? raw : parseFloat(raw);
      r[c] = Number.isFinite(n) ? n : raw;
    }
    return r;
  },

  /** Valida rangos de coherencia de las variables.
   * @param {Object} respuestas - respuestas extraídas.
   * @returns {Object} resultado de validarItems. */
  validar(respuestas) {
    return validarItems(ITEMS, respuestas);
  },

  /** Calcula IMC e ICC y clasifica según sexo.
   * @param {Object} r - respuestas validadas.
   * @param {Object} _validacion - validación previa (no usada).
   * @param {{sexo?: string}} contexto - datos del evaluado.
   * @returns {{resultadoEvaluacion: Object, advertencias: string[]}} resultado de la evaluación. */
  evaluar(r, _validacion, contexto) {
    const imc = calcularIMC(r.peso, r.talla);
    const icc = calcularICC(r.cintura, r.cadera);
    const advertencias = [];
    if ((r.peso != null) !== (r.talla != null)) advertencias.push('IMC no calculable: se requieren peso y talla.');
    if ((r.cintura != null) !== (r.cadera != null)) advertencias.push('ICC no calculable: se requieren cintura y cadera.');
    return {
      resultadoEvaluacion: {
        ...r,
        imc: imc.valor, categoriaIMC: imc.categoria || null, nivelIMC: imc.nivel || null,
        icc: icc.valor, categoriaICC: clasificarICC(icc.valor, contexto?.sexo) || null,
      },
      advertencias,
    };
  },

  /** Resume las clasificaciones de IMC e ICC; sin baremos definitivos queda pendiente.
   * @param {Object} resultado - resultado de evaluar.
   * @returns {Object} dato normalizado, nivel descriptivo y estado. */
  normalizar(resultado) {
    const partes = [];
    if (resultado.nivelIMC) partes.push(`IMC: ${resultado.nivelIMC}`);
    if (resultado.categoriaICC) partes.push(`ICC: ${resultado.categoriaICC}`);
    return {
      datoNormalizado: resultado,
      nivel: partes.length > 0 ? partes.join(' · ') : null,
      estado: ESTADO_MODULO.PENDIENTE_BAREMO,
      advertencias: ['Antropometria: baremos definitivos pendientes; solo se informa la clasificacion de IMC e ICC existentes.'],
      datosFaltantes: ['baremos_antropometricos'],
    };
  },
};
