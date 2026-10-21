/**
 * @module evaluacion/entrada
 * @description Etapa 1: adapta el estado del asistente (UI) al objeto de entrada del flujo de evaluación.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la forma del estado de la UI que alimenta el flujo.
 *  - D (Inversión de dependencias): aísla el acoplamiento con el estado de React; el resto del flujo no conoce la UI.
 * Notas: copia los cuestionarios de captura (complementarias, ipaq, psqi, parq, breq, barreras) hacia `cuestionarios.*` y el nivel de Léger hacia
 * `leger`. El nivel se acepta en `realesF.resistencia` o `leger.palier` (admite medios niveles, p. ej. 3.5); valores > 21 en `realesF.resistencia`
 * son la antigua resistencia en metros (retirada) y se ignoran.
 */
import { esNivelLegerValido } from '../logic/modelo.js';
import { CONDICIONES } from '../logic/parq.js';

/** Convierte las respuestas planas de StepParq { g1..g7, c1..c10, subpreguntas: 'si'|'no' } al formato anidado booleano de MODULO_PARQ.
 * @param {Object} [flat] - respuestas planas.
 * @returns {Object} { p1..p7, seguimiento: { cN: { aplica, respuestas } } }. */
function mapearParqAFlujo(flat = {}) {
  const respuestas = {};
  for (let i = 1; i <= 7; i++) {
    const v = flat[`g${i}`];
    if (v === 'si' || v === 'no') respuestas[`p${i}`] = v === 'si';
  }
  const seguimiento = {};
  for (const c of CONDICIONES) {
    const v = flat[c.id];
    // Sin responder no se infiere "no aplica": el módulo lo reporta como faltante si hay algún Sí en las generales.
    if (v !== 'si' && v !== 'no') continue;
    // Solo un "Sí" abre las subpreguntas; un "No" indica que la condición no aplica.
    const aplica = v === 'si';
    const resp = {};
    if (aplica) {
      for (const h of (c.hijas ?? [])) {
        const hv = flat[h.id];
        if (hv === 'si' || hv === 'no') resp[h.id] = hv === 'si';
      }
    }
    seguimiento[c.id] = { aplica, respuestas: resp };
  }
  const out = { ...respuestas };
  out.seguimiento = seguimiento;
  return out;
}

/** Adapta el estado del asistente al objeto de entrada del flujo.
 * @param {Object} analisis - estado de análisis de la UI.
 * @returns {{participante: Object, realesF: Object, antropometricas: Object, cuestionarios: Object, leger: {palier: number}|null}} datos de entrada. */
export function datosEntradaDesdeAnalisis(analisis) {
  const cuestionarios = { ...(analisis?.cuestionarios ?? {}) };
  // La UI guarda en `analisis.ipaq/psqi`; el flujo lee `cuestionarios.ipaq/psqi` con la misma forma.
  if (analisis?.ipaq?.respuestas && Object.keys(analisis.ipaq.respuestas).length > 0) {
    cuestionarios.ipaq = { ...(cuestionarios.ipaq ?? {}), ...analisis.ipaq.respuestas };
  }
  if (analisis?.psqi?.respuestas && Object.keys(analisis.psqi.respuestas).length > 0) {
    cuestionarios.psqi = { ...(cuestionarios.psqi ?? {}), ...analisis.psqi.respuestas };
  }
  if (analisis?.complementarias?.respuestas && Object.keys(analisis.complementarias.respuestas).length > 0) {
    cuestionarios.complementarias = { ...(cuestionarios.complementarias ?? {}), ...analisis.complementarias.respuestas };
  }
  if (analisis?.parq?.respuestas && Object.keys(analisis.parq.respuestas).length > 0) {
    cuestionarios.parq = mapearParqAFlujo(analisis.parq.respuestas);
  }
  if (analisis?.breq?.respuestas && Object.keys(analisis.breq.respuestas).length > 0) {
    cuestionarios.breq3 = { ...(cuestionarios.breq3 ?? {}), ...analisis.breq.respuestas };
  }
  if (analisis?.barreras?.respuestas && Object.keys(analisis.barreras.respuestas).length > 0) {
    cuestionarios.bbaq21 = { ...(cuestionarios.bbaq21 ?? {}), ...analisis.barreras.respuestas };
  }
  const legerRaw = analisis?.leger?.palier;
  const realesRaw = analisis?.realesF?.resistencia;
  const aPalier = (raw) => {
    if (raw === '' || raw == null) return null;
    const n = Number(raw);
    return esNivelLegerValido(n) ? n : null;
  };
  const legerPalier = aPalier(legerRaw) ?? aPalier(realesRaw);
  return {
    participante: { ...(analisis?.participante ?? {}) },
    realesF: { ...(analisis?.realesF ?? {}) },
    antropometricas: { ...(analisis?.antropometricas ?? {}) },
    cuestionarios,
    leger: Number.isFinite(legerPalier) ? { palier: legerPalier } : null,
  };
}
