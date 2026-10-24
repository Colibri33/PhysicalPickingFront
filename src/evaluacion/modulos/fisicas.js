/**
 * @module evaluacion/modulos/fisicas
 * @description Genera los módulos de las cinco capacidades de la batería: valor crudo, evaluación y nivel ordinal por baremo inyectado.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es cómo se lee, valida y evalúa cada prueba.
 *  - O (Abierto/Cerrado): una capacidad nueva se declara en capacidades.js; si su prueba necesita lógica propia se agrega en COMPORTAMIENTO.
 *  - L (Sustitución de Liskov): cada módulo generado cumple el contrato de ejecutarModulo.
 *  - D (Inversión de dependencias): el catálogo viene de capacidades.js y los baremos llegan por `recursos.baremos`; no se incluyen aquí.
 * Notas: sin baremo para una capacidad, nivel = null y estado 'pendiente_baremo'. Solo la resistencia aeróbica tiene lógica propia
 * (lectura del nivel de Léger y estimación del VO2máx); el resto sigue el camino común.
 */

import { CAPACIDADES_FISICAS, esNivelLegerValido } from '../capacidades.js';
import { ORIGEN, TIPO_MODULO, DESTINO, ESTADO_MODULO } from '../trazabilidad.js';
import { aplicarBaremo } from '../normalizacion/baremos.js';
import { vo2MaxDesdeNivel, nivelEnteroDeRegistro, velocidadNivel } from '../normalizacion/leger.js';

/** Lógica propia por capacidad, indexada por id. Cada hook es opcional y reemplaza el paso común correspondiente. */
const COMPORTAMIENTO = {
  vo2max: {
    /** Lee el nivel máximo alcanzado del test de Léger.
     * @param {Object} datos - datos ingresados.
     * @returns {{palier: number}|undefined} nivel válido, si existe. */
    leerDato(datos) {
      // Nivel en realesF.resistencia o leger.palier. Valores > 21 son la antigua resistencia en metros (retirada) y se ignoran.
      const candidatos = [datos?.realesF?.resistencia, datos?.leger?.palier];
      for (const raw of candidatos) {
        if (raw === null || raw === undefined || raw === '') continue;
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (!esNivelLegerValido(n)) continue;
        return { palier: n };
      }
      return undefined;
    },
    /** Valida que el nivel sea un entero dentro del rango del test.
     * @param {Object} respuestas - respuestas extraídas.
     * @returns {Object} resultado de validación. */
    validarDato(respuestas) {
      const p = respuestas?.palier;
      if (typeof p !== 'number' || !Number.isFinite(p)) {
        return { ok: false, errores: ['Resistencia aeróbica (Léger): el nivel debe ser un numero valido.'], advertencias: [], faltantes: [], omitidosPorCondicion: [], respondidos: 0 };
      }
      if (!esNivelLegerValido(p)) {
        return { ok: false, errores: ['Resistencia aeróbica (Léger): el nivel máximo alcanzado debe ser un número entero entre 1 y 21.'], advertencias: [], faltantes: [], omitidosPorCondicion: [], respondidos: 0 };
      }
      return { ok: true, errores: [], advertencias: [], faltantes: [], omitidosPorCondicion: [], respondidos: 1 };
    },
    /** Estima el VO2máx a partir del nivel alcanzado.
     * @param {Object} respuestas - respuestas validadas.
     * @returns {{resultadoEvaluacion: Object, advertencias: string[]}} resultado de la evaluación. */
    evaluarDato(respuestas) {
      const palier = respuestas?.palier;
      const nivelEntero = nivelEnteroDeRegistro(palier);
      const vo2max = nivelEntero !== null ? vo2MaxDesdeNivel(nivelEntero) : null;
      return {
        resultadoEvaluacion: {
          prueba: 'leger_course_navette_20m',
          palier: palier ?? null,
          valor: vo2max,
          unidad: 'ml/kg/min',
          detalle: { nivel: palier ?? null, nivelEntero, velocidad: velocidadNivel(nivelEntero), vo2max },
        },
        advertencias: [],
      };
    },
  },
};

/** Catálogo de capacidades con su lógica propia, si la tienen. */
const CAPACIDADES = CAPACIDADES_FISICAS.map(c => ({ ...c, ...COMPORTAMIENTO[c.id] }));

/** Construye el módulo de evaluación de una capacidad.
 * @param {Object} cap - entrada de CAPACIDADES.
 * @returns {Object} módulo conforme al contrato de ejecutarModulo. */
function crearModuloCapacidad(cap) {
  const def = { minimo: cap.captura.minimo, maximo: cap.captura.maximo, unidad: cap.unidad };
  return {
    id: `fisica_${cap.id}`,
    capacidad: cap.id,
    nombre: cap.nombre,
    tipo: TIPO_MODULO.PRUEBA_FISICA,
    destino: DESTINO.COMPATIBILIDAD,
    version: '0.2.0',
    estadoConfiguracion: cap.baremoId === 'physicalpicking_vo2max' ? 'baremo_propio_provisional' : 'baremo_afisal_integrado',
    fuente: {
      prueba: cap.prueba,
      referencia: cap.referenciaBaremo,
      origen: ORIGEN.BAREMO,
      capturaFrontend: `capacidades.${cap.id}`,
    },
    pendientes: cap.pendientes,
    requiereAutorizacion: cap.requiereAutorizacion ?? null,

    /** Extrae el valor crudo de la capacidad (y parciales bilaterales).
     * @param {Object} datos - datos ingresados.
     * @returns {Object|undefined} respuestas de la prueba. */
    extraer(datos) {
      if (typeof cap.leerDato === 'function') return cap.leerDato(datos);
      const raw = datos?.realesF?.[cap.campo];
      if (raw === '' || raw === null || raw === undefined) return undefined;
      const n = typeof raw === 'number' ? raw : parseFloat(raw);
      if (!Number.isFinite(n)) return { [cap.campo]: raw };
      const out = { [cap.campo]: n };
      // Parciales por pierna: trazabilidad del total bilateral AFISAL.
      if (cap.id === 'equilibrio') {
        for (const k of ['equilibrioDer', 'equilibrioIzq']) {
          const p = datos?.realesF?.[k];
          const pn = typeof p === 'number' ? p : parseFloat(p);
          if (Number.isFinite(pn)) out[k] = pn;
        }
      }
      // Mejor intento por mano: trazabilidad de la suma bilateral AFISAL.
      if (cap.id === 'fuerza') {
        for (const k of ['fuerzaDer', 'fuerzaIzq']) {
          const p = datos?.realesF?.[k];
          const pn = typeof p === 'number' ? p : parseFloat(p);
          if (Number.isFinite(pn)) out[k] = pn;
        }
      }
      return out;
    },

    /** Informa la ausencia de datos de la prueba.
     * @returns {{advertencias: string[], datosFaltantes: string[]}} advertencias y faltantes. */
    sinDatos() {
      if (cap.id === 'vo2max') {
        return { advertencias: ['Resistencia aeróbica (Léger): sin nivel registrado (prueba maxima no realizada o no autorizada).'], datosFaltantes: ['palier_leger'] };
      }
      return { advertencias: [], datosFaltantes: [] };
    },

    /** Valida el valor; fuera del rango de captura solo advierte.
     * @param {Object} respuestas - respuestas extraídas.
     * @returns {Object} resultado de validación. */
    validar(respuestas) {
      if (typeof cap.validarDato === 'function') return cap.validarDato(respuestas);
      const v = respuestas[cap.campo];
      const errores = [];
      const advertencias = [];
      if (typeof v !== 'number' || !Number.isFinite(v)) errores.push(`${cap.nombre}: debe ser un numero valido.`);
      else if (v < def.minimo || v > def.maximo) {
        // Criterio del formulario: fuera del rango de captura es advertencia, no bloqueo.
        advertencias.push(`${cap.nombre}: ${v} ${def.unidad} fuera del rango de captura (${def.minimo}-${def.maximo}).`);
      }
      return { ok: errores.length === 0, errores, advertencias, faltantes: [], omitidosPorCondicion: [], respondidos: 1 };
    },

    /** Estructura el resultado de la prueba y contrasta el desglose bilateral con el total.
     * @param {Object} respuestas - respuestas validadas.
     * @returns {{resultadoEvaluacion: Object, advertencias: string[]}} resultado de la evaluación. */
    evaluar(respuestas) {
      if (typeof cap.evaluarDato === 'function') return cap.evaluarDato(respuestas);
      const advertencias = [];
      const resultadoEvaluacion = { prueba: cap.prueba, valor: respuestas[cap.campo], unidad: def.unidad };
      if (cap.id === 'fuerza') {
        const der = respuestas.fuerzaDer;
        const izq = respuestas.fuerzaIzq;
        if (Number.isFinite(der) && Number.isFinite(izq)) {
          const suma = Math.round((der + izq) * 10) / 10;
          resultadoEvaluacion.detalle = { manoDerecha: der, manoIzquierda: izq, suma };
          if (suma !== respuestas[cap.campo]) {
            advertencias.push('Fuerza: la suma no coincide con la de ambas manos; se califica el valor registrado.');
          }
        } else {
          advertencias.push('Fuerza: sin desglose por mano (registro sin captura bilateral); se califica el valor registrado.');
        }
      }
      if (cap.id === 'equilibrio') {
        const der = respuestas.equilibrioDer;
        const izq = respuestas.equilibrioIzq;
        if (Number.isFinite(der) && Number.isFinite(izq)) {
          resultadoEvaluacion.detalle = { piernaDerecha: der, piernaIzquierda: izq, total: der + izq };
          if (der + izq !== respuestas[cap.campo]) {
            advertencias.push('Equilibrio: el total no coincide con la suma de ambas piernas; se califica el total registrado.');
          }
        } else {
          advertencias.push('Equilibrio: sin desglose por pierna (registro sin captura bilateral); se califica el total.');
        }
      }
      return { resultadoEvaluacion, advertencias };
    },

    /** Asigna el nivel ordinal mediante el baremo inyectado.
     * @param {Object} resultado - resultado de evaluar.
     * @param {Object} contexto - datos del evaluado.
     * @param {{baremos: Map}} recursos - registro de baremos.
     * @returns {Object} dato normalizado, nivel y estado. */
    normalizar(resultado, contexto, recursos) {
      const b = aplicarBaremo(recursos?.baremos, cap.baremoId, resultado?.valor, contexto);
      return {
        nivel: b.nivel,
        datoNormalizado: { capacidad: cap.id, valor: resultado?.valor ?? null, unidad: resultado?.unidad ?? null, nivel: b.nivel, baremo: b.baremoAplicado },
        estado: b.nivel === null ? ESTADO_MODULO.PENDIENTE_BAREMO : ESTADO_MODULO.COMPLETO,
        advertencias: b.advertencias,
        datosFaltantes: b.datosFaltantes,
      };
    },
  };
}

/** Módulos de las capacidades de la batería. */
export const MODULOS_FISICOS = CAPACIDADES.map(crearModuloCapacidad);
