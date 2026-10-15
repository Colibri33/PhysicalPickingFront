/* ═══════════════════════════════════════════════════════════════
   evaluacion/modulos/fisicas.js
   Modulos de las 5 capacidades de la bateria confirmada. Cada uno:
     respuesta original (valor crudo) → evaluacion (valor + unidad) →
     normalizacion a nivel ordinal mediante un baremo INYECTADO.
   No contiene baremos: sin baremo, nivel = null y estado
   'pendiente_baremo'.

   Reutiliza las definiciones de captura existentes (VARS_FISICAS de
   logic/modelo.js) para leer el valor y su unidad; no duplica rangos.
   ═══════════════════════════════════════════════════════════════ */

import { VARS_FISICAS, esNivelLegerValido } from '../../logic/modelo.js';
import { ORIGEN, TIPO_MODULO, DESTINO, ESTADO_MODULO } from '../trazabilidad.js';
import { aplicarBaremo } from '../normalizacion/baremos.js';

const AFISAL = 'AFISAL-INEFC (Rodriguez et al., 1998; Espana; n=238; grupos 18-24 y 25-34)';

/**
 * Capacidades del DecisionEngine (ids identicos a su escala.json).
 * variableOrigen = id de la variable que hoy captura el frontend
 * (VARS_FISICAS). null = la captura no existe aun.
 */
export const CAPACIDADES = [
  {
    id: 'fuerza', nombre: 'Fuerza', prueba: 'dinamometria_manual', variableOrigen: 'fuerza',
    baremoId: 'afisal_dinamometria', referenciaBaremo: AFISAL,
    pendientes: [],
  },
  {
    id: 'fuerza_explosiva', nombre: 'Fuerza explosiva', prueba: 'salto_vertical', variableOrigen: 'fuerzaExp',
    baremoId: 'afisal_salto_vertical', referenciaBaremo: AFISAL,
    pendientes: [],
  },
  {
    id: 'flexibilidad', nombre: 'Flexibilidad', prueba: 'sit_and_reach', variableOrigen: 'flexibilidad',
    baremoId: 'afisal_sit_and_reach', referenciaBaremo: AFISAL,
    pendientes: [],
  },
  {
    id: 'equilibrio', nombre: 'Equilibrio', prueba: 'equilibrio_monopodal_sin_vision', variableOrigen: 'equilibrio',
    baremoId: 'afisal_equilibrio_monopodal', referenciaBaremo: AFISAL,
    pendientes: [
      'Tabla 9 AFISAL con erratas de origen corregidas (ver normalizacion/afisal.js); verificar contra publicacion.',
    ],
  },
  {
    id: 'vo2max', nombre: 'Resistencia aeróbica', prueba: 'leger_course_navette_20m', variableOrigen: 'resistencia',
    requiereAutorizacion: 'prueba_maxima',
    baremoId: 'physicalpicking_vo2max', referenciaBaremo: 'Baremo propio de PhysicalPicking (muestra propia, por sexo)',
    pendientes: [
      'Integrar la estimacion de VO2max a partir del nivel del Leger (formula y referencia).',
      'Integrar los baremos de VO2max propios de PhysicalPicking.',
    ],
    leerDato(datos) {
      // La batería captura el nivel en `realesF.resistencia` (espejado en
      // `leger.palier`); se acepta cualquiera de los dos. Admite medios
      // niveles (3.5). Valores >21 son la antigua resistencia en metros
      // (retirada) y se ignoran aquí.
      const candidatos = [datos?.realesF?.resistencia, datos?.leger?.palier];
      for (const raw of candidatos) {
        if (raw === null || raw === undefined || raw === '') continue;
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (!esNivelLegerValido(n)) continue;
        return { palier: n };
      }
      return undefined;
    },
    validarDato(respuestas) {
      const p = respuestas?.palier;
      if (typeof p !== 'number' || !Number.isFinite(p)) {
        return { ok: false, errores: ['Resistencia aeróbica (Léger): el nivel debe ser un numero valido.'], advertencias: [], faltantes: [], omitidosPorCondicion: [], respondidos: 0 };
      }
      if (!esNivelLegerValido(p)) {
        return { ok: false, errores: ['Resistencia aeróbica (Léger): el nivel debe estar entre 0 y 21 (admite medios niveles como 3.5).'], advertencias: [], faltantes: [], omitidosPorCondicion: [], respondidos: 0 };
      }
      return { ok: true, errores: [], advertencias: [], faltantes: [], omitidosPorCondicion: [], respondidos: 1 };
    },
    evaluarDato(respuestas) {
      return {
        resultadoEvaluacion: { prueba: 'leger_course_navette_20m', palier: respuestas?.palier ?? null, valor: null, unidad: 'nivel' },
        advertencias: ['Resistencia aeróbica: estimacion de VO2max a partir del nivel y baremos propios pendientes; el nivel se conserva sin calificar.'],
      };
    },
  },
];

function definicionCaptura(variableOrigen) {
  return VARS_FISICAS.find(v => v.id === variableOrigen) ?? null;
}

function crearModuloCapacidad(cap) {
  const def = definicionCaptura(cap.variableOrigen);
  return {
    id: `fisica_${cap.id}`,
    capacidad: cap.id,
    nombre: cap.nombre,
    tipo: TIPO_MODULO.PRUEBA_FISICA,
    destino: DESTINO.COMPATIBILIDAD,
    version: '0.2.0',
    estadoConfiguracion: cap.baremoId === 'physicalpicking_vo2max' ? 'baremo_pendiente' : 'baremo_afisal_integrado',
    fuente: {
      prueba: cap.prueba,
      referencia: cap.referenciaBaremo,
      origen: ORIGEN.BAREMO,
      capturaFrontend: def ? `VARS_FISICAS.${def.id}` : null,
    },
    pendientes: cap.pendientes,
    requiereAutorizacion: cap.requiereAutorizacion ?? null,

    extraer(datos) {
      if (typeof cap.leerDato === 'function') return cap.leerDato(datos);
      if (!cap.variableOrigen) return undefined;
      const raw = datos?.realesF?.[cap.variableOrigen];
      if (raw === '' || raw === null || raw === undefined) return undefined;
      const n = typeof raw === 'number' ? raw : parseFloat(raw);
      if (!Number.isFinite(n)) return { [cap.variableOrigen]: raw };
      const out = { [cap.variableOrigen]: n };
      // Equilibrio bilateral AFISAL: parciales por pierna (trazabilidad del total).
      if (cap.id === 'equilibrio') {
        for (const k of ['equilibrioDer', 'equilibrioIzq']) {
          const p = datos?.realesF?.[k];
          const pn = typeof p === 'number' ? p : parseFloat(p);
          if (Number.isFinite(pn)) out[k] = pn;
        }
      }
      // Dinamometría bilateral: mejor intento por mano (trazabilidad de la suma AFISAL).
      if (cap.id === 'fuerza') {
        for (const k of ['fuerzaDer', 'fuerzaIzq']) {
          const p = datos?.realesF?.[k];
          const pn = typeof p === 'number' ? p : parseFloat(p);
          if (Number.isFinite(pn)) out[k] = pn;
        }
      }
      return out;
    },

    sinDatos() {
      if (cap.id === 'vo2max') {
        return { advertencias: ['Resistencia aeróbica (Léger): sin nivel registrado (prueba maxima no realizada o no autorizada).'], datosFaltantes: ['palier_leger'] };
      }
      return cap.variableOrigen
        ? { advertencias: [], datosFaltantes: [] }
        : { advertencias: [`${cap.nombre}: la captura de la prueba aun no existe en el frontend.`], datosFaltantes: ['captura_no_implementada'] };
    },

    validar(respuestas) {
      if (typeof cap.validarDato === 'function') return cap.validarDato(respuestas);
      const v = respuestas[cap.variableOrigen];
      const errores = [];
      const advertencias = [];
      if (typeof v !== 'number' || !Number.isFinite(v)) errores.push(`${cap.nombre}: debe ser un numero valido.`);
      else if (def && (v < def.minimo || v > def.maximo)) {
        // Mismo criterio que el formulario actual: fuera del rango de
        // referencia de captura es advertencia, no bloqueo.
        advertencias.push(`${cap.nombre}: ${v} ${def.unidad} fuera del rango de captura (${def.minimo}-${def.maximo}).`);
      }
      return { ok: errores.length === 0, errores, advertencias, faltantes: [], omitidosPorCondicion: [], respondidos: 1 };
    },

    evaluar(respuestas) {
      if (typeof cap.evaluarDato === 'function') return cap.evaluarDato(respuestas);
      const advertencias = [];
      const resultadoEvaluacion = { prueba: cap.prueba, valor: respuestas[cap.variableOrigen], unidad: def?.unidad ?? null };
      if (cap.id === 'fuerza') {
        const der = respuestas.fuerzaDer;
        const izq = respuestas.fuerzaIzq;
        if (Number.isFinite(der) && Number.isFinite(izq)) {
          const suma = Math.round((der + izq) * 10) / 10;
          resultadoEvaluacion.detalle = { manoDerecha: der, manoIzquierda: izq, suma };
          if (suma !== respuestas[cap.variableOrigen]) {
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
          if (der + izq !== respuestas[cap.variableOrigen]) {
            advertencias.push('Equilibrio: el total no coincide con la suma de ambas piernas; se califica el total registrado.');
          }
        } else {
          advertencias.push('Equilibrio: sin desglose por pierna (registro sin captura bilateral); se califica el total.');
        }
      }
      return { resultadoEvaluacion, advertencias };
    },

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

export const MODULOS_FISICOS = CAPACIDADES.map(crearModuloCapacidad);

/** Variables que el frontend captura hoy pero que NO forman parte de
 *  la bateria confirmada (se informan como conflicto, no se evaluan). */
export const VARIABLES_CAPTURADAS_FUERA_DE_BATERIA = VARS_FISICAS
  .map(v => v.id)
  .filter(id => !CAPACIDADES.some(c => c.variableOrigen === id));
