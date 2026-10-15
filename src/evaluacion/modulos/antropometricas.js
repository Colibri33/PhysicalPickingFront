/* ═══════════════════════════════════════════════════════════════
   evaluacion/modulos/antropometricas.js
   Variables antropometricas (antes "corporales"). Mismas variables
   que captura hoy el frontend; no se agregan nuevas.
   Destino: INFORMATIVA (no entran al porcentaje de compatibilidad).
   Reutiliza calcularIMC y RANGOS_ANTROPOMETRICOS de logic/modelo.js.
   ═══════════════════════════════════════════════════════════════ */

import { calcularIMC, calcularICC, clasificarICC, RANGOS_ANTROPOMETRICOS } from '../../logic/modelo.js';
import { ORIGEN, TIPO_MODULO, DESTINO, ESTADO_MODULO } from '../trazabilidad.js';
import { validarItems } from '../validacion/validarRespuestas.js';

const CAMPOS = Object.keys(RANGOS_ANTROPOMETRICOS);

const ITEMS = CAMPOS.map(id => ({
  id, tipo: 'numero', requerido: false, tema: RANGOS_ANTROPOMETRICOS[id].etiqueta,
  min: RANGOS_ANTROPOMETRICOS[id].min, max: RANGOS_ANTROPOMETRICOS[id].max,
}));

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

  validar(respuestas) {
    return validarItems(ITEMS, respuestas);
  },

  evaluar(r, _validacion, contexto) {
    const imc = calcularIMC(r.peso, r.talla);
    const icc = calcularICC(r.cintura, r.cadera);
    const advertencias = [];
    if ((r.peso != null) !== (r.talla != null)) advertencias.push('IMC no calculable: se requieren peso y talla.');
    if ((r.cintura != null) !== (r.cadera != null)) advertencias.push('ICC no calculable: se requieren cintura y cadera.');
    return {
      resultadoEvaluacion: {
        ...r,
        imc: imc.valor, categoriaIMC: imc.categoria || null,
        icc: icc.valor, categoriaICC: clasificarICC(icc.valor, contexto?.sexo) || null,
      },
      advertencias,
    };
  },

  normalizar(resultado) {
    return {
      datoNormalizado: resultado,
      nivel: null,
      estado: ESTADO_MODULO.PENDIENTE_BAREMO,
      advertencias: ['Antropometria: baremos definitivos pendientes; solo se informa la clasificacion de IMC existente.'],
      datosFaltantes: ['baremos_antropometricos'],
    };
  },
};
