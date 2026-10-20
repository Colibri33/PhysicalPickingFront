/* resumenIA.js — arma el resumen que se envía a la IA. Privacidad: NO
   incluye el nombre ni textos libres (descripciones, zonas, etc.); solo
   edad, sexo, perfil, resultados y niveles ya calculados por el motor. */
import { calcularIpaq } from '../logic/ipaq.js';
import { calcularPsqi } from '../logic/psqi.js';
import { calcularBreq } from '../logic/breq.js';
import { calcularBarreras } from '../logic/barreras.js';

export function construirResumenIA(analisis, flujo) {
  const p = analisis.participante ?? {};
  const a = analisis.antropometricas ?? {};
  const caps = flujo?.etapas?.perfilFuncional?.compatibilidad?.capacidades ?? {};
  const rk = flujo?.etapas?.ranking ?? {};
  const plan = flujo?.etapas?.planAdaptacion ?? {};
  const ipaq = calcularIpaq(analisis.ipaq?.respuestas ?? {});
  const psqi = calcularPsqi(analisis.psqi?.respuestas ?? {});
  const breq = calcularBreq(analisis.breq?.respuestas ?? {});
  const bar = calcularBarreras(analisis.barreras?.respuestas ?? {});
  const seg = flujo?.informe?.seguridad ?? {};

  return {
    participante: { edad: Number(p.edad) || null, sexo: p.genero || null, perfil: p.perfil || null, actividad: p.deporte || null },
    antropometria: { imc: a.imc ?? null, icc: a.icc ?? null, grasaVisceral: a.grasaVisc ? Number(a.grasaVisc) : null },
    capacidadesFisicas: Object.fromEntries(Object.entries(caps).map(([k, c]) => [k, { nivel: c.nivel, valor: c.valor, unidad: c.unidad }])),
    estilosYHabitos: {
      ipaq: ipaq ? { categoria: ipaq.categoria, metMinSemana: ipaq.met?.total } : null,
      psqi: psqi ? { puntajeGlobal: psqi.puntajeGlobal, categoria: psqi.categoria } : null,
      motivacionBreq: breq ? { rai: breq.rai, subescalas: breq.subescalas } : null,
      barreras: bar ? { dimensiones: bar.dimensiones, significativas: bar.significativas } : null,
    },
    seguridad: {
      pruebaMaximaAutorizada: seg.pruebaMaxima?.autorizada ?? null,
      alertas: (seg.alertas ?? []).map(x => x.codigo),
    },
    recomendacion: {
      firme: rk.recomendada ? { nombre: rk.recomendada.nombre ?? rk.recomendada.id, porcentaje: rk.recomendada.porcentaje } : null,
      top5: (rk.familias ?? []).slice(0, 5).map(f => ({
        nombre: f.nombre ?? f.id, porcentaje: f.porcentaje, firme: f.firme,
        brechas: (f.brechas ?? []).map(b => ({ capacidad: b.capacidad, demanda: b.demanda, nivel: b.nivel, severa: b.severa })),
      })),
      planAdaptacion: plan.aplica ? { estado: plan.estado ?? null, motivo: plan.motivo ?? null } : null,
    },
    notas: ['Baremo de resistencia aeróbica (Léger) propio y provisional.', 'Las zonas del modelo 3D son brechas frente a un deporte, no diagnóstico médico.'],
  };
}
