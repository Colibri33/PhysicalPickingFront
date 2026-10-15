/* informeMisDatosPdf.js — genera el PDF legible de "Mis datos"
   (derecho de acceso / Habeas Data) a partir del JSON que devuelve
   GET /arco/exportar. Se genera en el propio navegador con jsPDF,
   para que la persona pueda leerlo sin conocimientos técnicos. */

import { jsPDF } from 'jspdf';

const MARGEN = 15;
const ANCHO_UTIL = 210 - MARGEN * 2;

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

/* Resume un registro a lo esencial y legible (sin volcar JSON crudo). */
export function resumirRegistro(registro = {}) {
  const p = registro.participante || {};
  const familias = registro.evaluacion?.etapas?.ranking?.familias
    ?? registro.rankingDeportes?.map(r => ({
      nombre: r.nombre ?? r.id,
      porcentaje: r.afinidad ?? r.porcentaje ?? null,
    }))
    ?? [];
  return {
    nombre: texto(p.nombre),
    edad: p.edad ?? '—',
    genero: texto(p.genero),
    perfil: texto(p.perfil),
    actividad: texto(p.deporte),
    fecha: texto(registro.fecha ?? registro.creadoEn),
    recomendacion: texto(registro.interpretacion?.recomendacion, ''),
    familias: familias.slice(0, 5).map(f => ({
      nombre: texto(f.nombre ?? f.id),
      porcentaje: f.porcentaje ?? f.afinidad ?? null,
    })),
  };
}

function pintarEncabezado(doc) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PhysicalPicking — Mis datos personales', MARGEN, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Derecho de acceso (Habeas Data · Ley 1581 de 2012)', MARGEN, 25);
  doc.setTextColor(0);
  doc.line(MARGEN, 28, 210 - MARGEN, 28);
  return 35;
}

function pintarPie(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(`Página ${i} de ${total}`, 210 - MARGEN, 290, { align: 'right' });
    doc.setTextColor(0);
  }
}

/* Escribe un bloque de líneas con salto de página automático. */
function escribirLineas(doc, lineas, y) {
  for (const linea of lineas) {
    if (y > 278) { doc.addPage(); y = 18; }
    doc.text(linea.texto, MARGEN + (linea.sangria || 0), y);
    y += linea.salvo ?? 5;
  }
  return y;
}

function tituloSeccion(doc, titulo, y) {
  if (y > 270) { doc.addPage(); y = 18; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  y = escribirLineas(doc, [{ texto: titulo, salvo: 7 }], y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  return y;
}

export function generarPdfMisDatos(datos = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let y = pintarEncabezado(doc);
  y = escribirLineas(doc, [
    { texto: `Documento generado: ${formatearFechaISO(datos.generadoEn)}`, salvo: 8 },
  ], y);

  /* ── 1. Cuenta ── */
  y = tituloSeccion(doc, '1. Datos de la cuenta', y);
  const perfil = datos.perfil || {};
  y = escribirLineas(doc, [
    { texto: `Nombre: ${texto(perfil.nombre ?? perfil.full_name)}` },
    { texto: `Correo: ${texto(perfil.email ?? perfil.correo)}` },
    { texto: `Registrado: ${formatearFechaISO(perfil.created_at ?? perfil.creado_en)}`, salvo: 8 },
  ], y);

  /* ── 2. Consentimientos ── */
  y = tituloSeccion(doc, '2. Consentimientos (Habeas Data)', y);
  const cons = Array.isArray(datos.consentimientos) ? datos.consentimientos : [];
  if (cons.length === 0) {
    y = escribirLineas(doc, [{ texto: 'Sin consentimientos registrados.', salvo: 8 }], y);
  } else {
    for (const c of cons) {
      const lineas = doc.splitTextToSize(
        `• ${formatearFechaISO(c.created_at ?? c.creado_en)} — tratamiento: ${c.acepto_tratamiento ?? c.aceptoTratamiento ?? '—'}, ` +
        `datos sensibles: ${c.acepto_datos_sensibles ?? c.aceptoDatosSensibles ?? '—'}, ` +
        `versión política: ${texto(c.politica_version ?? c.politicaVersion)}`,
        ANCHO_UTIL,
      );
      for (const l of lineas) {
        if (y > 278) { doc.addPage(); y = 18; }
        doc.text(l, MARGEN, y);
        y += 5;
      }
      y += 2;
    }
    y += 3;
  }

  /* ── 3. Resultados ── */
  const resultados = Array.isArray(datos.resultados) ? datos.resultados : [];
  y = tituloSeccion(doc, `3. Historial de evaluaciones (${resultados.length})`, y);
  if (resultados.length === 0) {
    y = escribirLineas(doc, [{ texto: 'Sin evaluaciones guardadas.' }], y);
  }
  resultados.forEach((r, i) => {
    const s = resumirRegistro(r);
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold');
    y = escribirLineas(doc, [{ texto: `${i + 1}. ${s.nombre} — ${s.edad} años — ${s.fecha}`, salvo: 6 }], y);
    doc.setFont('helvetica', 'normal');
    y = escribirLineas(doc, [
      { texto: `Género: ${s.genero} · Perfil: ${s.perfil} · Actividad: ${s.actividad}` },
    ], y);
    if (s.familias.length > 0) {
      y = escribirLineas(doc, [{ texto: 'Compatibilidad por familia:' }], y);
      for (const f of s.familias) {
        const pct = f.porcentaje === null || f.porcentaje === undefined ? '—' : `${f.porcentaje}%`;
        y = escribirLineas(doc, [{ texto: `• ${f.nombre}: ${pct}`, sangria: 4 }], y);
      }
    }
    if (s.recomendacion) {
      const lineas = doc.splitTextToSize(`Recomendación: ${s.recomendacion}`, ANCHO_UTIL);
      for (const l of lineas) {
        if (y > 278) { doc.addPage(); y = 18; }
        doc.text(l, MARGEN, y);
        y += 5;
      }
    }
    y += 4;
  });

  pintarPie(doc);
  return doc.output('blob');
}
