/* evaluacion/entrada.js
   Etapa 1: datos ingresados. Adapta el estado del asistente (UI) al
   objeto de entrada del flujo. Es el UNICO punto acoplado a la forma
   del estado de React; el resto del flujo no conoce la UI.
   Sincroniza los cuestionarios de captura superior (complementarias,
   ipaq/psqi, como ya hacen parq/breq/barreras en el historial) hacia
   `cuestionarios.*` para que los módulos del flujo los evalúen, y el
   nivel de resistencia aeróbica (Léger) hacia `leger`. La batería
   captura el nivel en `realesF.resistencia` (espejado en `leger.palier`
   desde StepFisicas); se acepta cualquiera de los dos (admiten medios
   niveles como 3.5). Valores >21 en `realesF.resistencia` son la antigua
   resistencia en metros (retirada) y se ignoran para el flujo. */
import { esNivelLegerValido } from '../logic/modelo.js';
import { CONDICIONES } from '../logic/parq.js';

/* Convierte el formato plano de respuestas de StepParq
   { g1:'si'|'no', ..., c1:'si'|'no', c1a:'si'|'no', ... }
   al formato anidado booleano que espera MODULO_PARQ del flujo:
   { p1..p7: boolean, seguimiento: { c1..c10: { aplica: boolean, respuestas: {...} } } } */
function mapearParqAFlujo(flat = {}) {
  const respuestas = {};
  for (let i = 1; i <= 7; i++) {
    const v = flat[`g${i}`];
    if (v === 'si' || v === 'no') respuestas[`p${i}`] = v === 'si';
  }
  const seguimiento = {};
  for (const c of CONDICIONES) {
    const v = flat[c.id];
    // Sin responder: no se inventa "no aplica"; el modulo lo reporta como faltante
    // cuando hay algun Si en las generales.
    if (v !== 'si' && v !== 'no') continue;
    // Solo un "Si" abre las subpreguntas; un "No" significa que la condicion no aplica.
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

export function datosEntradaDesdeAnalisis(analisis) {
  const cuestionarios = { ...(analisis?.cuestionarios ?? {}) };
  // Los pasos de UI guardan en `analisis.ipaq/psqi`; el flujo lee
  // `cuestionarios.ipaq/psqi`. Misma forma { i1.. } / { p1.. }, copia directa.
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
