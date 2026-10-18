/* informeMisDatosPdf.js — genera el PDF legible de "Mis datos"
   (derecho de acceso / Habeas Data) a partir del JSON que devuelve
   GET /arco/exportar. Se genera en el propio navegador con jsPDF:
   portada de marca, guía de lectura, datos de cuenta, consentimientos
   y un informe explicado por cada evaluación guardada. */

import { jsPDF } from 'jspdf';
import { alertaAntecedenteLesion } from '../evaluacion/reglas/preparacionSeguridad.js';

/* ── Marca ── */
const MORADO = [91, 63, 224];
const TINTA = [31, 41, 55];
const GRIS = [107, 114, 128];
const LINEA = [229, 231, 235];
const FONDO = [241, 240, 250];
const BARRA_FONDO = [226, 224, 240];

const MARGEN = 16;
const ANCHO = 210 - MARGEN * 2;
const PIE_Y = 288;

const ETIQUETAS_FISICAS = {
  fuerza: 'Fuerza prensil',
  fuerzaExp: 'Fuerza explosiva',
  resistencia: 'Resistencia aeróbica',
  flexibilidad: 'Flexibilidad',
  equilibrio: 'Equilibrio',
};

const ETIQUETAS_CAPACIDAD = {
  fuerza: 'Fuerza',
  fuerza_explosiva: 'Fuerza explosiva',
  vo2max: 'Resistencia aeróbica',
  flexibilidad: 'Flexibilidad',
  equilibrio: 'Equilibrio',
};

export function formatearFechaISO(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function texto(valor, reemplazo = '—') {
  if (valor === null || valor === undefined || valor === '') return reemplazo;
  return String(valor);
}

function siNo(valor) {
  if (valor === true) return 'sí';
  if (valor === false) return 'no';
  return texto(valor);
}

function totalConsolidado(c) {
  if (c === null || c === undefined) return null;
  if (typeof c === 'object') return c.total ?? null;
  return c;
}

/* Resume un registro a lo esencial y legible (sin volcar JSON crudo). */
export function resumirRegistro(registro = {}) {
  const p = registro.participante || {};
  const familias = registro.evaluacion?.etapas?.ranking?.familias
    ?? registro.rankingDeportes?.map(r => ({
      id: r.id ?? r.nombre,
      nombre: r.nombre ?? r.id,
      porcentaje: r.afinidad ?? r.porcentaje ?? null,
      firme: r.firme,
      carencias: r.carencias ?? [],
      brechas: r.brechas ?? [],
      cobertura: r.cobertura ?? null,
    }))
    ?? [];
  const cons = registro.consolidado || {};
  const variables = Object.entries(cons)
    .map(([id, c]) => ({ id, nombre: ETIQUETAS_FISICAS[id] ?? id, total: totalConsolidado(c) }))
    .filter(v => v.total !== null && v.total !== undefined);
  const ipaq = registro.ipaq?.resultado;
  const psqi = registro.psqi?.resultado;
  const breq = registro.breq?.resultado;
  const barreras = registro.barreras?.resultado;
  return {
    nombre: texto(p.nombre),
    edad: p.edad ?? '—',
    genero: texto(p.genero),
    perfil: texto(p.perfil),
    actividad: texto(p.deporte),
    fecha: texto(registro.fecha ?? registro.creadoEn),
    parq: registro.parq?.resultado ?? null,
    pruebaMaxima: registro.evaluacion?.informe?.seguridad?.pruebaMaxima ?? null,
    alertasSeguridad: (() => {
      // R-SEG-04: en registros anteriores a la regla se deriva de los antecedentes guardados.
      const alertas = registro.evaluacion?.informe?.seguridad?.alertas ?? [];
      if (alertas.some(a => a.codigo === 'ANTECEDENTE_LESION')) return alertas;
      const lesion = alertaAntecedenteLesion(registro.complementarias?.resultado?.antecedentes);
      return lesion ? [...alertas, lesion] : alertas;
    })(),
    ipaq: ipaq?.categoria ? `Nivel ${ipaq.categoria} — ${ipaq.met?.total ?? '—'} MET-min/semana` : null,
    psqi: typeof psqi?.puntajeGlobal === 'number' ? `Puntaje ${psqi.puntajeGlobal}/21 — ${psqi.categoria ?? ''}`.trim() : null,
    breq: typeof breq?.rai === 'number' ? `Índice de autonomía (RAI): ${breq.rai}` : null,
    barreras: Array.isArray(barreras?.significativas) && barreras.significativas.length > 0
      ? `Barreras relevantes: ${barreras.significativas.join(', ')}` : null,
    interpretacion: texto(registro.interpretacion?.parrafo, ''),
    // Con el flujo nuevo la recomendación sale del DecisionEngine; el texto
    // del modelo heredado solo se usa en registros sin ranking del motor.
    recomendacion: registro.evaluacion?.etapas?.ranking?.familias && 'recomendada' in registro.evaluacion.etapas.ranking
      ? texto(registro.evaluacion.etapas.ranking.recomendada
        ? `${registro.evaluacion.etapas.ranking.recomendada.nombre ?? registro.evaluacion.etapas.ranking.recomendada.id} (${registro.evaluacion.etapas.ranking.recomendada.porcentaje ?? '—'}% de compatibilidad).`
        : '', '')
      : texto(registro.interpretacion?.recomendacion, ''),
    planAdaptacion: registro.evaluacion?.etapas?.planAdaptacion?.aplica ? registro.evaluacion.etapas.planAdaptacion : null,
    variables,
    familias: familias.slice(0, 5).map(f => ({
      id: f.id,
      nombre: texto(f.nombre ?? f.id),
      porcentaje: f.porcentaje ?? f.afinidad ?? null,
      firme: f.firme,
      cobertura: f.cobertura ?? null,
      carencias: (f.carencias ?? []).map(c => `${ETIQUETAS_CAPACIDAD[c.capacidad] ?? c.capacidad} (demanda ${c.demanda})`),
      brechas: (f.brechas ?? [])
        .filter(b => b.relevanteMitchell)
        .map(b => `${ETIQUETAS_CAPACIDAD[b.capacidad] ?? b.capacidad}: nivel ${b.nivel}, demanda ${b.demanda}`),
    })),
  };
}

/* ═══ Motor de paginado ═══ */

function nuevaPaginaSiFalta(doc, y, necesario = 20) {
  if (y + necesario > PIE_Y - 6) { doc.addPage(); return 20; }
  return y;
}

function parrafo(doc, textoStr, y, { sangria = 0, tamano = 10, negrita = false, color = TINTA, justificado = false, interlineado = 5.2 } = {}) {
  doc.setFont('helvetica', negrita ? 'bold' : 'normal');
  doc.setFontSize(tamano);
  doc.setTextColor(...color);
  const lineas = doc.splitTextToSize(textoStr, ANCHO - sangria);
  for (const l of lineas) {
    y = nuevaPaginaSiFalta(doc, y);
    doc.text(l, MARGEN + sangria, y, justificado ? { align: 'justify', maxWidth: ANCHO - sangria } : {});
    y += interlineado;
  }
  doc.setTextColor(...TINTA);
  return y;
}

function seccion(doc, titulo, y) {
  y = nuevaPaginaSiFalta(doc, y, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...TINTA);
  doc.text(titulo, MARGEN, y);
  y += 2.5;
  doc.setDrawColor(...MORADO);
  doc.setLineWidth(0.9);
  doc.line(MARGEN, y, MARGEN + 46, y);
  return y + 6;
}

function tabla(doc, filas, y) {
  // filas: [[etiqueta, valor]] con zebra suave
  filas.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const etiqueta = `${k}:  `;
    const etiqW = doc.getTextWidth(etiqueta);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(String(v), ANCHO - 4 - etiqW);
    y = nuevaPaginaSiFalta(doc, y, lineas.length * 5.2 + 4);
    if (i % 2 === 0) {
      doc.setFillColor(...FONDO);
      doc.rect(MARGEN, y - 4.2, ANCHO, lineas.length * 5.2 + 3, 'F');
    }
    doc.setTextColor(...TINTA);
    doc.setFont('helvetica', 'bold');
    doc.text(etiqueta, MARGEN + 2, y);
    doc.setFont('helvetica', 'normal');
    lineas.forEach((l, j) => {
      doc.text(l, MARGEN + 2 + (j === 0 ? etiqW : 0), y);
      if (j < lineas.length - 1) y += 5.2;
    });
    y += 7;
  });
  return y + 2;
}

function barra(doc, etiqueta, porcentaje, y, color = MORADO) {
  y = nuevaPaginaSiFalta(doc, y, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TINTA);
  doc.text(etiqueta, MARGEN, y);
  const pctTxt = porcentaje === null || porcentaje === undefined ? '—' : `${porcentaje}%`;
  doc.setFont('helvetica', 'bold');
  doc.text(pctTxt, MARGEN + ANCHO, y, { align: 'right' });
  y += 2.2;
  const pistaX = MARGEN;
  const pistaW = ANCHO;
  doc.setFillColor(...BARRA_FONDO);
  doc.roundedRect(pistaX, y, pistaW, 3.4, 1.2, 1.2, 'F');
  const pct = Math.max(0, Math.min(100, Number(porcentaje) || 0));
  if (pct > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(pistaX, y, (pistaW * pct) / 100, 3.4, 1.2, 1.2, 'F');
  }
  return y + 8.5;
}

function pintarPortada(doc, totalEvaluaciones, generadoEn) {
  doc.setFillColor(...MORADO);
  doc.rect(0, 0, 210, 44, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text('PHYSICALPICKING', MARGEN, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Mis datos personales · Derecho de acceso (Habeas Data, Ley 1581 de 2012)', MARGEN, 27);
  doc.setFontSize(9.5);
  doc.text(`Documento generado: ${generadoEn}  ·  Evaluaciones incluidas: ${totalEvaluaciones}`, MARGEN, 35);
  doc.setTextColor(...TINTA);
  return 52;
}

function pintarPie(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text('Documento personal e intransferible · Uso informativo: no es un diagnóstico clínico.', MARGEN, PIE_Y + 6);
    doc.text(`Página ${i} de ${total}`, 210 - MARGEN, PIE_Y + 6, { align: 'right' });
    doc.setTextColor(...TINTA);
  }
}

/* ═══ Documento ═══ */

export function generarPdfMisDatos(datos = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const resultados = Array.isArray(datos.resultados) ? datos.resultados : [];
  const generadoEn = formatearFechaISO(datos.generadoEn || new Date().toISOString());

  let y = pintarPortada(doc, resultados.length, generadoEn);

  /* Guía de lectura */
  y = seccion(doc, 'Cómo leer este documento', y);
  y = parrafo(doc,
    'Este documento reúne toda la información que PhysicalPicking conserva sobre tu cuenta, en lenguaje claro. ' +
    'La sección 1 describe tu cuenta, la 2 tus autorizaciones de tratamiento de datos y la 3 detalla cada ' +
    'evaluación guardada: quién fue evaluado, su perfil físico, la compatibilidad con cada familia deportiva, ' +
    'las condiciones de seguridad y los resultados de los cuestionarios. Los porcentajes indican requisitos ' +
    'cumplidos según la exigencia de cada familia: a mayor porcentaje, mayor afinidad con tu perfil actual.',
    y, { justificado: true });
  y += 3;

  /* 1. Cuenta */
  y = seccion(doc, '1. Datos de la cuenta', y);
  const perfil = datos.perfil || {};
  y = tabla(doc, [
    ['Nombre', texto(perfil.nombre ?? perfil.full_name)],
    ['Correo', texto(perfil.email ?? perfil.correo)],
    ['Cuenta creada', formatearFechaISO(perfil.created_at ?? perfil.creado_en)],
  ], y);

  /* 2. Consentimientos */
  y = seccion(doc, '2. Autorizaciones de tratamiento (Habeas Data)', y);
  const cons = Array.isArray(datos.consentimientos) ? datos.consentimientos : [];
  if (cons.length === 0) {
    y = parrafo(doc, 'Sin autorizaciones registradas.', y);
  } else {
    y = parrafo(doc, 'Cada fila indica cuándo autorizaste el tratamiento y bajo qué versión de la política:', y);
    cons.forEach(c => {
      y = parrafo(doc,
        `• ${formatearFechaISO(c.created_at ?? c.creado_en)} — Tratamiento de datos: ${siNo(c.acepto_tratamiento ?? c.aceptoTratamiento)} · ` +
        `Datos sensibles: ${siNo(c.acepto_datos_sensibles ?? c.aceptoDatosSensibles)} · Versión de política: ${texto(c.politica_version ?? c.politicaVersion)}.`,
        y, { tamano: 9.5 });
    });
  }
  y += 3;

  /* 3+. Evaluaciones */
  y = seccion(doc, `3. Historial de evaluaciones (${resultados.length})`, y);
  if (resultados.length === 0) {
    y = parrafo(doc, 'Aún no tienes evaluaciones guardadas. Cuando completes una, su informe explicado aparecerá aquí.', y);
  }

  resultados.forEach((r, i) => {
    const s = resumirRegistro(r);
    y = nuevaPaginaSiFalta(doc, y, 24);
    doc.setFillColor(...FONDO);
    doc.roundedRect(MARGEN, y - 5, ANCHO, 10.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...MORADO);
    doc.text(`Evaluación ${i + 1} — ${s.nombre}, ${s.edad} años · ${s.fecha}`, MARGEN + 3, y + 2);
    doc.setTextColor(...TINTA);
    y += 11;

    y = tabla(doc, [
      ['Género', s.genero],
      ['Tipo de perfil', s.perfil],
      ['Actividad / deporte', s.actividad],
    ], y);

    /* Seguridad primero: es lo que condiciona la actividad física */
    y = parrafo(doc, 'Seguridad (PAR-Q+):', y, { negrita: true, tamano: 10.5 });
    if (s.parq === 'apto') {
      y = parrafo(doc, 'Cuestionario de aptitud: sin señales que exijan consulta médica previa. ' +
        (s.pruebaMaxima
          ? `Prueba máxima de resistencia (Léger): ${s.pruebaMaxima.autorizada ? 'autorizada' : 'no autorizada automáticamente'}. ${s.pruebaMaxima.motivo || ''}`.trim()
          : 'Sigue las indicaciones del evaluador para pruebas de esfuerzo máximo.'), y, { tamano: 9.5, justificado: true });
    } else if (s.parq === 'consultar') {
      y = parrafo(doc, 'Cuestionario de aptitud: se recomienda consultar a un profesional de la salud antes de realizar actividad física de esfuerzo.', y, { tamano: 9.5 });
    } else {
      y = parrafo(doc, 'Cuestionario de aptitud: sin información registrada en esta evaluación.', y, { tamano: 9.5 });
    }
    (s.alertasSeguridad || []).forEach(a => {
      y = parrafo(doc, `• ${a.mensaje ?? a}`, y, { tamano: 9.5, sangria: 4 });
    });
    y += 2;

    /* Perfil físico con barras */
    if (s.variables.length > 0) {
      y = parrafo(doc, 'Perfil físico (porcentaje sobre tu referencia personal):', y, { negrita: true, tamano: 10.5 });
      s.variables.forEach(v => { y = barra(doc, v.nombre, v.total, y); });
      const vals = s.variables.map(v => Number(v.total)).filter(n => !Number.isNaN(n));
      if (vals.length > 0) {
        const prom = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        y = parrafo(doc, `Promedio general: ${prom}%. Es tu fotografía funcional del momento: sirve para comparar avances, no para clasificarte.`, y, { tamano: 9.5 });
      }
      y += 2;
    }

    /* Compatibilidad */
    if (s.familias.length > 0) {
      y = parrafo(doc, 'Compatibilidad por familia deportiva:', y, { negrita: true, tamano: 10.5 });
      y = parrafo(doc, 'Porcentaje de requisitos cumplidos. Una familia no es recomendable si le falta el dato de su demanda principal o si tienes una brecha severa en ella (nivel Bajo o Muy bajo donde exige Alta o Muy alta).', y, { tamano: 9, color: GRIS });
      s.familias.forEach((f, fi) => {
        y = barra(doc, `#${fi + 1} ${f.nombre}${f.firme === false ? ' (no recomendable)' : ''}`, f.porcentaje, y,
          fi === 0 ? MORADO : [47, 92, 232]);
        (f.carencias || []).forEach(c => { y = parrafo(doc, `Sin evaluar: ${c}.`, y, { tamano: 8.5, color: GRIS, sangria: 4 }); });
        (f.brechas || []).forEach(b => { y = parrafo(doc, `Brecha relevante: ${b}.`, y, { tamano: 8.5, color: GRIS, sangria: 4 }); });
      });
      y += 2;
    }

    /* Cuestionarios */
    const cuest = [s.ipaq && `Actividad física (IPAQ): ${s.ipaq}.`, s.psqi && `Calidad de sueño (PSQI): ${s.psqi}.`,
      s.breq && `Motivación (BREQ-3): ${s.breq}.`, s.barreras && `Barreras (BBAQ-21): ${s.barreras}.`].filter(Boolean);
    if (cuest.length > 0) {
      y = parrafo(doc, 'Cuestionarios:', y, { negrita: true, tamano: 10.5 });
      cuest.forEach(c => { y = parrafo(doc, `• ${c}`, y, { tamano: 9.5 }); });
      y += 2;
    }

    /* Interpretación y recomendación */
    if (s.interpretacion) {
      y = parrafo(doc, 'Interpretación:', y, { negrita: true, tamano: 10.5 });
      y = parrafo(doc, s.interpretacion, y, { tamano: 9.5, justificado: true });
      y += 2;
    }
    if (s.recomendacion) {
      y = parrafo(doc, `Recomendación: ${s.recomendacion}`, y, { tamano: 9.5 });
      y += 2;
    }
    if (s.planAdaptacion?.estado === 3) {
      const pl = s.planAdaptacion;
      y = parrafo(doc, `Estado ${pl.estado}: ${pl.nombre}`, y, { negrita: true, tamano: 10.5 });
      y = parrafo(doc, pl.motivo, y, { tamano: 9.5 });
      if ((pl.prioridades || []).length > 0) {
        y = parrafo(doc, `Capacidades a priorizar: ${pl.prioridades.map(p => `${ETIQUETAS_CAPACIDAD[p.capacidad] ?? p.capacidad} (${p.nivel})`).join(', ')}.`, y, { tamano: 9.5 });
      }
      [...(pl.pautasGenerales || []), ...(pl.pautasComponentes || [])].forEach(p => {
        y = parrafo(doc, `• ${p.titulo}: ${p.texto} (${p.referencia})`, y, { tamano: 9 });
      });
      y += 2;
    } else if (s.planAdaptacion?.tipo === 'datos_insuficientes') {
      y = parrafo(doc, `${s.planAdaptacion.motivo} Faltan: ${(s.planAdaptacion.faltantes || []).map(c => ETIQUETAS_CAPACIDAD[c] ?? c).join(', ')}.`, y, { tamano: 9.5 });
      y += 2;
    }
    y = parrafo(doc, 'Esta orientación describe tendencias de tu perfil actual y no reemplaza el criterio de un profesional en ciencias del deporte.', y, { tamano: 8.5, color: GRIS });
    y += 5;
  });

  pintarPie(doc);
  return doc.output('blob');
}
