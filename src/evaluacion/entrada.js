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
