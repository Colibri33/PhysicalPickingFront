/**
 * @module utils/rellenoDemo
 * @description Genera un análisis completo con datos coherentes para exposiciones y demostraciones.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la generación de datos de demostración.
 *  - D (Inversión de dependencias): el generador aleatorio `rng` se inyecta (por defecto Math.random) y los catálogos provienen de logic/*.
 * Notas: no guarda nada ni modifica el motor; devuelve un objeto con la forma de `estadoAnalisisInicial()` (utils/analisisRegistro). Los valores salen de rangos
 * plausibles por sexo y de un nivel de condición común (f, 0-1): un participante activo puntúa alto en casi todo y uno sedentario, bajo.
 */

import { estadoAnalisisInicial } from './analisisRegistro.js';
import { calcularIMC, calcularICC } from '../evaluacion/antropometria.js';
import { todasVisibles, pendientes } from '../logic/parq.js';
import { ITEMS_BREQ, SUBESCALAS_BREQ } from '../logic/breq.js';
import { ITEMS_BARRERAS } from '../logic/barreras.js';
import { ITEMS_PSQI_PERTURBACIONES, ITEMS_PSQI_COMPANERO } from '../logic/psqi.js';

const NOMBRES_M = ['Carlos Ramírez', 'José Hernández', 'Luis Martínez', 'Diego Alvarado', 'Mauricio Flores', 'Kevin Portillo'];
const NOMBRES_F = ['María Fernández', 'Ana Castillo', 'Daniela Rivas', 'Gabriela Mejía', 'Sofía Cruz', 'Valeria Menjívar'];
const DEPORTES = ['Fútbol', 'Baloncesto', 'Natación', 'Atletismo', 'Voleibol', 'Ciclismo', 'Gimnasio / pesas'];
const PERFILES = ['deportivo', 'general', 'entrenador'];

/** Genera un análisis demo completo y coherente con el nivel de condición simulado.
 * @param {function(): number} [rng] - generador de números en [0, 1).
 * @param {'masculino'|'femenino'|null} [sexo] - sexo fijo; si es null se elige al azar.
 * @returns {Object} análisis con la misma forma que estadoAnalisisInicial(), listo para setAnalisis. */
export function generarAnalisisDemo(rng = Math.random, sexo = null) {
  const ent = (a, b) => Math.round(a + rng() * (b - a));
  const dec = (a, b, d = 1) => Number((a + rng() * (b - a)).toFixed(d));
  const elegir = arr => arr[Math.floor(rng() * arr.length)];
  const acota = (x, a, b) => Math.min(b, Math.max(a, x));
  /* Variación pequeña alrededor de una base para mantener la coherencia entre pruebas. */
  const ruido = amp => (rng() - 0.5) * 2 * amp;

  const hombre = sexo ? sexo === 'masculino' : rng() < 0.5;
  const f = acota(0.2 + rng() * 0.7, 0, 1);            // nivel de condición (0-1)
  const perfil = f > 0.6 ? 'deportivo' : elegir(PERFILES);
  const edad = ent(18, 30);

  const participante = {
    nombre: elegir(hombre ? NOMBRES_M : NOMBRES_F),
    edad: String(edad),
    genero: hombre ? 'masculino' : 'femenino',
    perfil,
    deporte: elegir(DEPORTES),
  };

  /* PAR-Q+: todo "No" (apto), lo que autoriza la prueba máxima de Léger. */
  const parqRespuestas = {};
  for (let i = 0; i < 5 && pendientes(parqRespuestas).length > 0; i++) {
    for (const p of todasVisibles(parqRespuestas)) if (!parqRespuestas[p.id]) parqRespuestas[p.id] = 'no';
  }

  const complementarias = { respuestas: {
    lesion_2anios: false, cirugia_musculoesqueletica: false, dolor_articular: false,
    limitacion_pruebas: false,
    practica_deporte: true,
    experiencias: [{
      deporte: participante.deporte,
      anios: ent(1, Math.max(1, Math.min(12, edad - 12))),
      tipo: f > 0.7 ? 'federado_competitivo' : f > 0.45 ? 'formativo_club' : 'recreativo',
      modalidad: elegir(['individual', 'colectivo']),
      habilidad: elegir(['abierta', 'cerrada']),
    }],
    practica_actual: f > 0.35,
  } };

  const talla = hombre ? ent(165, 187) : ent(153, 173);
  const imcObjetivo = 20.5 + (1 - f) * 4.5 + ruido(0.8);         // mayor condición, IMC menor dentro del rango normal
  const peso = Number((imcObjetivo * (talla / 100) ** 2).toFixed(1));
  const cintura = Math.round((hombre ? 70 : 63) + (imcObjetivo - 20) * 2.2 + ruido(2));
  const cadera = Math.round((hombre ? 94 : 95) + (imcObjetivo - 20) * 1.6 + ruido(2));
  const antropometricas = {
    peso: String(peso), talla: String(talla), cintura: String(cintura), cadera: String(cadera),
    grasaVisc: String(ent(1, Math.round(3 + (1 - f) * 6))),
    imc: calcularIMC(peso, talla).valor,
    icc: calcularICC(cintura, cadera).valor,
  };

  const dVig = ent(0, Math.round(1 + f * 4));
  const dMod = ent(0, Math.round(1 + f * 4));
  const dCam = ent(2, 7);
  const ipaq = { respuestas: {
    i1: dVig, ...(dVig > 0 ? { i2: ent(20, 60) } : {}),
    i3: dMod, ...(dMod > 0 ? { i4: ent(20, 60) } : {}),
    i5: dCam, i6: ent(15, 50),
    i7: ent(240, 600),
  } };

  const hh = n => String(n).padStart(2, '0');
  const acostarse = ent(22 * 60, 24 * 60 + 40) % (24 * 60);
  const levantarse = ent(5 * 60 + 30, 7 * 60 + 30);
  const psqiR = {
    p1: `${hh(Math.floor(acostarse / 60))}:${hh(acostarse % 60)}`,
    p2: ent(5, 35),
    p3: `${hh(Math.floor(levantarse / 60))}:${hh(levantarse % 60)}`,
    p4: dec(5.5, 8.5),
  };
  const baja = () => (rng() < 0.7 ? 0 : ent(1, 2));            // perturbaciones poco frecuentes
  for (const it of ITEMS_PSQI_PERTURBACIONES) psqiR[it.id] = it.id === 'p5j' ? 0 : baja();
  psqiR.p6 = rng() < 0.8 ? 0 : 1;
  psqiR.p7 = rng() < 0.8 ? 0 : 1;
  psqiR.p8 = baja();
  psqiR.p9 = ent(0, 1);
  psqiR.p10 = 0;                                                  // duerme solo: sin ítems de compañero
  void ITEMS_PSQI_COMPANERO;
  const psqi = { respuestas: psqiR };

  /* BREQ-3 (0-4): la motivación autónoma crece con el nivel de condición. */
  const subDe = {};
  for (const [sub, ids] of Object.entries(SUBESCALAS_BREQ)) for (const n of ids) subDe[String(n)] = sub;
  const base = { desmotivacion: 0.3, externa: 0.8, introyectada: 1.5, identificada: 2.2 + f * 1.2, integrada: 1.8 + f * 1.8, intrinseca: 2 + f * 1.9 };
  const breqR = {};
  for (const it of ITEMS_BREQ) breqR[it.id] = acota(Math.round(base[subDe[String(it.id)]] + ruido(0.8)), 0, 4);
  const breq = { respuestas: breqR };

  /* BBAQ-21 (0-3): menos barreras a mayor nivel de condición. */
  const barR = {};
  for (const it of ITEMS_BARRERAS) barR[it.id] = acota(Math.round((1 - f) * 1.6 + ruido(0.9)), 0, 3);
  const barreras = { respuestas: barR };

  /* Batería física: valores por sexo, escalados por el nivel de condición. */
  const mano = hombre ? 27 + f * 22 : 16 + f * 13;
  const fuerzaDer = Math.round(mano + ruido(2));
  const fuerzaIzq = Math.round(mano - 2 + ruido(2));
  const eqDer = acota(Math.round((1 - f) * 7 + ruido(1.5)), 0, 30);
  const eqIzq = acota(Math.round((1 - f) * 7 + ruido(1.5)), 0, 30);
  const palier = acota(Math.round((hombre ? 4 : 3) + f * (hombre ? 11 : 8) + ruido(1)), 1, 21);
  const realesF = {
    fuerzaDer: String(fuerzaDer), fuerzaIzq: String(fuerzaIzq), fuerza: String(fuerzaDer + fuerzaIzq),
    fuerzaExp: String(Math.round((hombre ? 30 : 22) + f * (hombre ? 24 : 16) + ruido(3))),
    flexibilidad: String(Math.round(-4 + f * 22 + ruido(3))),
    equilibrioDer: String(eqDer), equilibrioIzq: String(eqIzq), equilibrio: String(eqDer + eqIzq),
    resistencia: String(palier),
  };
  const leger = { palier: String(palier) };

  return {
    ...estadoAnalisisInicial(),
    participante,
    parq: { respuestas: parqRespuestas, detalles: {} },
    complementarias, breq, barreras, ipaq, psqi,
    leger, realesF, antropometricas,
  };
}
