/**
 * @module utils/informeMisDatosPdf
 * @description Genera en el navegador, con jsPDF, el PDF de "Mis datos" (derecho de acceso, Habeas Data): datos de la cuenta e informe final de cada participante evaluado.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es el contenido y el diseño del PDF de Mis datos.
 *  - D (Inversión de dependencias): depende del JSON de GET /arco/exportar y de recursos gráficos ya resueltos (logo, robot, tipografías, imagen 3D); no accede a red ni DOM.
 * Notas: no vuelca respuestas de cuestionarios; solo resultados finales. La identidad visual sigue la marca PhysicalPicking.
 */

import { jsPDF } from 'jspdf';
import { alertaAntecedenteLesion } from '../evaluacion/reglas/preparacionSeguridad.js';

const MORADO = [91, 63, 224];
const MORADO_OSC = [44, 27, 107];
const AZUL = [47, 92, 232];
const CIAN = [34, 211, 238];
const TINTA = [28, 18, 51];
const GRIS = [91, 86, 120];
const TARJETA = [243, 241, 253];
const PISTA = [226, 222, 245];
const AMBAR = [245, 158, 11];

const MARGEN = 16;
const ANCHO = 210 - MARGEN * 2;
const LIMITE_Y = 258;      // el robot de la esquina ocupa la franja inferior derecha
const NIVEL_INDICE = { 'Muy bajo': 1, Bajo: 2, Medio: 3, Alto: 4, 'Muy alto': 5 };

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

/** Formatea una fecha ISO en formato local legible.
 * @param {string} iso - fecha en formato ISO 8601.
 * @returns {string} fecha formateada, "—" si falta o el original si no es válida. */
export function formatearFechaISO(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Convierte un valor a texto, usando un reemplazo si está vacío.
 * @param {*} valor - valor a convertir.
 * @param {string} [reemplazo] - texto a usar cuando el valor es nulo o vacío.
 * @returns {string} texto resultante. */
function texto(valor, reemplazo = '—') {
  if (valor === null || valor === undefined || valor === '') return reemplazo;
  return String(valor);
}

/** Convierte un booleano a "sí" o "no".
 * @param {*} valor - valor a convertir.
 * @returns {string} "sí", "no" o el texto del valor. */
function siNo(valor) {
  if (valor === true) return 'sí';
  if (valor === false) return 'no';
  return texto(valor);
}

/** Extrae el total de una entrada del consolidado (objeto o número).
 * @param {Object|number|null} c - entrada del consolidado.
 * @returns {number|null} total o null. */
function totalConsolidado(c) {
  if (c === null || c === undefined) return null;
  if (typeof c === 'object') return c.total ?? null;
  return c;
}

/** Resume un registro guardado a lo esencial y legible, sin volcar JSON crudo.
 * @param {Object} [registro] - registro del historial.
 * @returns {Object} resumen con participante, seguridad, variables, familias, cuestionarios, interpretación y plan. */
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
      // R-SEG-04: en registros previos a la regla, la alerta se deriva de los antecedentes guardados.
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
    // La recomendación proviene del DecisionEngine; el texto del modelo heredado solo se usa en registros sin ranking del motor.
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

/** Mezcla linealmente dos colores RGB.
 * @param {number[]} a - color inicial.
 * @param {number[]} b - color final.
 * @param {number} t - posición entre 0 y 1.
 * @returns {number[]} color RGB resultante. */
function mezclar(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

/** Lienzo de página: mantiene el documento, la posición vertical y las tipografías de marca.
 * Concentra las primitivas de dibujo para que el contenido del informe no dependa de jsPDF. */
class Lienzo {
  /** @param {Object} doc - documento jsPDF.
   * @param {Object} recursos - logo, robot, fuentes y cuerpos 3D (todos opcionales). */
  constructor(doc, recursos) {
    this.doc = doc;
    this.r = recursos || {};
    this.propia = this.registrarFuentes();
    this.y = 0;
  }

  /** Registra las tipografías de marca si llegaron; si no, se usa Helvetica.
   * @returns {boolean} true si se registraron. */
  registrarFuentes() {
    const f = this.r.fuentes;
    if (!f?.poppins || !f?.poppinsNegrita || !f?.fredoka) return false;
    try {
      this.doc.addFileToVFS('Poppins-Regular.ttf', f.poppins);
      this.doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
      this.doc.addFileToVFS('Poppins-SemiBold.ttf', f.poppinsNegrita);
      this.doc.addFont('Poppins-SemiBold.ttf', 'Poppins', 'bold');
      this.doc.addFileToVFS('Fredoka-SemiBold.ttf', f.fredoka);
      this.doc.addFont('Fredoka-SemiBold.ttf', 'Fredoka', 'normal');
      return true;
    } catch {
      return false;
    }
  }

  /** Selecciona tipografía, tamaño y color.
   * @param {'normal'|'negrita'|'titulo'} estilo - estilo tipográfico.
   * @param {number} tamano - tamaño en puntos.
   * @param {number[]} [color] - color RGB del texto. */
  fuente(estilo, tamano, color = TINTA) {
    const d = this.doc;
    if (this.propia) d.setFont(estilo === 'titulo' ? 'Fredoka' : 'Poppins', estilo === 'negrita' ? 'bold' : 'normal');
    else d.setFont('helvetica', estilo === 'normal' ? 'normal' : 'bold');
    d.setFontSize(tamano);
    d.setTextColor(...color);
  }

  /** Dibuja una imagen codificada si existe.
   * @param {string|null} dato - data URL o base64 PNG.
   * @param {number} x - posición horizontal en mm.
   * @param {number} y - posición vertical en mm.
   * @param {number} w - ancho en mm.
   * @param {number} h - alto en mm.
   * @param {string} [alias] - identificador para reutilizar la imagen sin duplicarla en el archivo. */
  imagen(dato, x, y, w, h, alias) {
    if (!dato) return;
    const url = dato.startsWith('data:') ? dato : `data:image/png;base64,${dato}`;
    const formato = url.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    try { this.doc.addImage(url, formato, x, y, w, h, alias); } catch { /* la imagen es opcional */ }
  }

  /** Franja superior con el degradado de marca (morado, azul, cian). */
  franjaMarca() {
    const pasos = 70;
    const w = 210 / pasos;
    for (let i = 0; i < pasos; i++) {
      const t = i / (pasos - 1);
      const c = t < 0.55 ? mezclar(MORADO, AZUL, t / 0.55) : mezclar(AZUL, CIAN, (t - 0.55) / 0.45);
      this.doc.setFillColor(...c);
      this.doc.rect(i * w, 0, w + 0.2, 5, 'F');
    }
  }

  /** Abre una página nueva con franja de marca y logo reducido.
   * @param {string} etiqueta - texto del encabezado derecho. */
  paginaNueva(etiqueta) {
    this.doc.addPage();
    this.franjaMarca();
    this.imagen(this.r.logo, MARGEN, 9, 24, 13, 'logo');
    this.fuente('normal', 8.5, GRIS);
    this.doc.text(etiqueta, 210 - MARGEN, 16, { align: 'right' });
    this.y = 30;
  }

  /** Salta de página si lo que sigue no cabe.
   * @param {number} necesario - alto requerido en mm.
   * @param {string} etiqueta - encabezado de la página nueva. */
  asegurar(necesario, etiqueta) {
    if (this.y + necesario > LIMITE_Y) this.paginaNueva(etiqueta);
  }

  /** Escribe un título de sección con una marca de color a su izquierda.
   * @param {string} titulo - texto del título. */
  seccion(titulo) {
    this.asegurar(16, this.etiqueta);
    this.doc.setFillColor(...MORADO);
    this.doc.roundedRect(MARGEN, this.y - 4.6, 1.8, 6.2, 0.9, 0.9, 'F');
    this.fuente('titulo', 13, MORADO_OSC);
    this.doc.text(titulo, MARGEN + 4.5, this.y);
    this.y += 7;
  }

  /** Escribe un párrafo con salto de página automático.
   * @param {string} contenido - texto.
   * @param {Object} [o] - opciones: x, ancho, tamano, estilo, color, interlineado.
   * @returns {void} */
  parrafo(contenido, { x = MARGEN, ancho = ANCHO, tamano = 9.5, estilo = 'normal', color = TINTA, interlineado = 4.9 } = {}) {
    this.fuente(estilo, tamano, color);
    for (const l of this.doc.splitTextToSize(String(contenido), ancho)) {
      this.asegurar(interlineado + 1, this.etiqueta);
      this.doc.text(l, x, this.y);
      this.y += interlineado;
    }
  }

  /** Mide cuántas líneas ocupa un texto.
   * @param {string} contenido - texto.
   * @param {number} ancho - ancho disponible en mm.
   * @param {number} tamano - tamaño en puntos.
   * @returns {number} cantidad de líneas. */
  lineas(contenido, ancho, tamano = 9.5) {
    this.fuente('normal', tamano);
    return this.doc.splitTextToSize(String(contenido), ancho).length;
  }

  /** Tarjeta de fondo suave.
   * @param {number} x - posición horizontal en mm.
   * @param {number} y - posición vertical en mm.
   * @param {number} w - ancho en mm.
   * @param {number} h - alto en mm.
   * @param {number[]} [color] - color de relleno. */
  tarjeta(x, y, w, h, color = TARJETA) {
    this.doc.setFillColor(...color);
    this.doc.roundedRect(x, y, w, h, 3, 3, 'F');
  }

  /** Barra de progreso redondeada.
   * @param {number} x - posición horizontal en mm.
   * @param {number} y - posición vertical en mm.
   * @param {number} w - ancho en mm.
   * @param {number} fraccion - valor entre 0 y 1.
   * @param {number[]} color - color de relleno. */
  barra(x, y, w, fraccion, color) {
    this.doc.setFillColor(...PISTA);
    this.doc.roundedRect(x, y, w, 2.8, 1.4, 1.4, 'F');
    const f = Math.max(0, Math.min(1, fraccion));
    if (f > 0) {
      this.doc.setFillColor(...color);
      this.doc.roundedRect(x, y, Math.max(2.8, w * f), 2.8, 1.4, 1.4, 'F');
    }
  }

  /** Etiqueta redondeada de color con texto blanco, alineada a la derecha de x.
   * @param {string} contenido - texto de la etiqueta.
   * @param {number} xDerecha - borde derecho en mm.
   * @param {number} y - línea base en mm.
   * @param {number[]} color - color de fondo. */
  chip(contenido, xDerecha, y, color) {
    this.fuente('negrita', 8, [255, 255, 255]);
    const w = this.doc.getTextWidth(contenido) + 6;
    this.doc.setFillColor(...color);
    this.doc.roundedRect(xDerecha - w, y - 4.2, w, 6, 3, 3, 'F');
    this.doc.text(contenido, xDerecha - w / 2, y, { align: 'center' });
  }

  /** Dibuja en todas las páginas el pie de marca y el robot de la esquina inferior derecha. */
  pintarPies() {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      this.imagen(this.r.robot, 210 - 8 - 33, 297 - 3 - 37, 33, 37, 'robot');
      this.fuente('normal', 7.5, GRIS);
      this.doc.text('PhysicalPicking · Documento personal e intransferible. Uso informativo: no es un diagnóstico clínico.', MARGEN, 289);
      this.doc.text(`Página ${i} de ${total}`, MARGEN, 293.5);
    }
  }
}

/** Pinta la cabecera de la primera página: franja, logo, título y fecha.
 * @param {Lienzo} L - lienzo de página.
 * @param {number} totalParticipantes - participantes incluidos.
 * @param {string} generadoEn - fecha de generación ya formateada. */
function cabeceraPortada(L, totalParticipantes, generadoEn) {
  L.franjaMarca();
  L.imagen(L.r.logo, MARGEN, 11, 52, 28, 'logo');
  L.fuente('titulo', 21, MORADO_OSC);
  L.doc.text('Mis datos personales', 210 - MARGEN, 24, { align: 'right' });
  L.fuente('normal', 9, GRIS);
  L.doc.text('Informe de tus evaluaciones', 210 - MARGEN, 30, { align: 'right' });
  L.doc.text(`Generado el ${generadoEn} · ${totalParticipantes} ${totalParticipantes === 1 ? 'participante' : 'participantes'}`, 210 - MARGEN, 35, { align: 'right' });
  L.y = 50;
}

/** Tarjeta con los datos de la cuenta y la autorización de tratamiento.
 * @param {Lienzo} L - lienzo de página.
 * @param {Object} datos - JSON de exportación. */
function bloqueCuenta(L, datos) {
  const perfil = datos.perfil || {};
  const cons = Array.isArray(datos.consentimientos) ? datos.consentimientos : [];
  const filas = [
    ['Nombre', texto(perfil.nombre ?? perfil.full_name)],
    ['Correo', texto(perfil.email ?? perfil.correo)],
    ['Cuenta creada', formatearFechaISO(perfil.created_at ?? perfil.creado_en)],
  ];
  if (cons.length > 0) {
    const c = cons[0];
    filas.push(['Autorización de datos',
      `${formatearFechaISO(c.created_at ?? c.creado_en)} · política ${texto(c.version_politica ?? c.politica_version ?? c.politicaVersion)}`]);
  }
  L.seccion('Tu cuenta');
  const alto = filas.length * 8 + 6;
  L.tarjeta(MARGEN, L.y - 2, ANCHO, alto);
  let y = L.y + 5;
  filas.forEach(([k, v]) => {
    L.fuente('normal', 8.5, GRIS);
    L.doc.text(k, MARGEN + 6, y);
    L.fuente('negrita', 9.5, TINTA);
    L.doc.text(String(v), MARGEN + 52, y);
    y += 8;
  });
  L.y += alto + 4;
  L.parrafo('Este documento reúne los datos de tu cuenta y el informe final de cada participante que evaluaste, '
    + 'sin las respuestas completas de los cuestionarios. Los porcentajes de compatibilidad indican qué tanto '
    + 'se ajusta el perfil físico a las exigencias de cada familia deportiva.', { tamano: 8.8, color: GRIS });
}

/** Banner con los datos del participante.
 * @param {Lienzo} L - lienzo de página.
 * @param {Object} s - resumen del registro.
 * @param {number} n - número de participante. */
function bannerParticipante(L, s, n) {
  const h = 24;
  L.doc.setFillColor(...MORADO_OSC);
  L.doc.roundedRect(MARGEN, L.y, ANCHO, h, 4, 4, 'F');
  L.doc.setFillColor(...CIAN);
  L.doc.roundedRect(MARGEN + 5, L.y + 5, 1.8, h - 10, 0.9, 0.9, 'F');
  L.fuente('titulo', 15, [255, 255, 255]);
  L.doc.text(`${n}. ${s.nombre}`, MARGEN + 11, L.y + 10.5);
  L.fuente('normal', 9, [214, 208, 245]);
  const partes = [`${s.edad} años`, s.genero, s.perfil !== '—' ? `perfil ${s.perfil}` : null, s.actividad !== '—' ? s.actividad : null].filter(Boolean);
  L.doc.text(partes.join('  ·  '), MARGEN + 11, L.y + 17.5);
  L.fuente('normal', 8.5, [214, 208, 245]);
  L.doc.text(s.fecha, MARGEN + ANCHO - 6, L.y + 10.5, { align: 'right' });
  L.y += h + 7;
}

/** Perfil físico: modelo 3D a la izquierda y capacidades con su nivel a la derecha.
 * @param {Lienzo} L - lienzo de página.
 * @param {Object} s - resumen del registro.
 * @param {Object} [cuerpo] - recursos del participante (imagen 3D y capacidades). */
function bloquePerfilFisico(L, s, cuerpo) {
  const caps = cuerpo?.capacidades?.length
    ? cuerpo.capacidades.map(c => ({ nombre: c.nombre, etiqueta: c.nivel ?? 'Sin dato', fraccion: (NIVEL_INDICE[c.nivel] ?? 0) / 5, color: hexARgb(c.color) }))
    : s.variables.map(v => ({ nombre: v.nombre, etiqueta: `${Math.round(Number(v.total) || 0)}%`, fraccion: (Number(v.total) || 0) / 100, color: MORADO }));
  if (caps.length === 0 && !cuerpo?.imagen) return;

  const conImagen = Boolean(cuerpo?.imagen);
  const altoBloque = conImagen ? 84 : Math.max(24, caps.length * 13 + 14);
  L.asegurar(altoBloque + 12, L.etiqueta);
  L.seccion('Perfil físico');
  const top = L.y - 2;
  L.tarjeta(MARGEN, top, ANCHO, altoBloque);

  let xDatos = MARGEN + 8;
  let anchoDatos = ANCHO - 16;
  if (conImagen) {
    const h = altoBloque - 4; const w = h * (420 / 640);
    L.imagen(cuerpo.imagen, MARGEN + 4, top + 2, w, h);
    xDatos = MARGEN + 62;
    anchoDatos = ANCHO - 70;
  }
  let y = top + (conImagen ? 12 : 10);
  caps.forEach(c => {
    L.fuente('negrita', 9.5, TINTA);
    L.doc.text(c.nombre, xDatos, y);
    L.chip(c.etiqueta, xDatos + anchoDatos, y, c.color);
    L.barra(xDatos, y + 3, anchoDatos, c.fraccion, c.color);
    y += conImagen ? 14.5 : 13;
  });
  L.y = top + altoBloque + 7;
}

/** Convierte un color hexadecimal en RGB.
 * @param {string} hex - color #RRGGBB.
 * @returns {number[]} color RGB. */
function hexARgb(hex) {
  const h = String(hex || '#A9A4C4').replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

/** Recomendación deportiva: familia destacada y ranking breve.
 * @param {Lienzo} L - lienzo de página.
 * @param {Object} s - resumen del registro. */
function bloqueRecomendacion(L, s) {
  if (s.familias.length === 0 && !s.recomendacion) return;
  L.asegurar(46, L.etiqueta);
  L.seccion('Recomendación deportiva');
  const firme = s.familias.find(f => f.firme !== false);
  if (firme) {
    L.doc.setFillColor(...MORADO);
    L.doc.roundedRect(MARGEN, L.y - 2, ANCHO, 17, 3.5, 3.5, 'F');
    L.fuente('normal', 8, [214, 208, 245]);
    L.doc.text('Mayor compatibilidad', MARGEN + 6, L.y + 4);
    L.fuente('titulo', 14, [255, 255, 255]);
    L.doc.text(firme.nombre, MARGEN + 6, L.y + 11);
    if (firme.porcentaje != null) {
      L.fuente('titulo', 18, [255, 255, 255]);
      L.doc.text(`${firme.porcentaje}%`, MARGEN + ANCHO - 6, L.y + 10.5, { align: 'right' });
    }
    L.y += 22;
  } else if (s.familias.length > 0) {
    L.parrafo('Con el perfil actual ninguna familia deportiva puede presentarse como recomendación firme.', { estilo: 'negrita' });
    L.y += 2;
  }
  s.familias.slice(0, 4).forEach((f, i) => {
    L.asegurar(11, L.etiqueta);
    L.fuente('normal', 9, TINTA);
    L.doc.text(`${f.nombre}${f.firme === false ? ' (no recomendable)' : ''}`, MARGEN, L.y);
    L.fuente('negrita', 9, TINTA);
    L.doc.text(f.porcentaje == null ? '—' : `${f.porcentaje}%`, MARGEN + ANCHO, L.y, { align: 'right' });
    L.barra(MARGEN, L.y + 2, ANCHO, (Number(f.porcentaje) || 0) / 100, i === 0 && f.firme !== false ? MORADO : AZUL);
    L.y += 9.5;
  });
  L.y += 3;
}

/** Precauciones de seguridad (solo si existen alertas).
 * @param {Lienzo} L - lienzo de página.
 * @param {Object} s - resumen del registro. */
function bloquePrecauciones(L, s) {
  const mensajes = [];
  if (s.parq === 'consultar') mensajes.push('Se recomienda consultar a un profesional de la salud antes de realizar actividad física de esfuerzo.');
  (s.alertasSeguridad || []).slice(0, 3).forEach(a => mensajes.push(String(a.mensaje ?? a)));
  if (mensajes.length === 0) return;
  const ancho = ANCHO - 14;
  const alto = mensajes.reduce((t, m) => t + L.lineas(m, ancho, 9) * 4.5 + 2, 0) + 6;
  L.asegurar(alto + 14, L.etiqueta);
  L.seccion('Precauciones');
  L.tarjeta(MARGEN, L.y - 2, ANCHO, alto, [255, 246, 230]);
  L.doc.setFillColor(...AMBAR);
  L.doc.roundedRect(MARGEN, L.y - 2, 2.2, alto, 1.1, 1.1, 'F');
  let y = L.y + 3.5;
  mensajes.forEach(m => {
    L.fuente('normal', 9, TINTA);
    L.doc.splitTextToSize(m, ancho).forEach(l => { L.doc.text(l, MARGEN + 7, y); y += 4.5; });
    y += 2;
  });
  L.y += alto + 4;
}

/** Interpretación y plan de adaptación.
 * @param {Lienzo} L - lienzo de página.
 * @param {Object} s - resumen del registro. */
function bloqueInterpretacion(L, s) {
  if (s.interpretacion) {
    L.asegurar(24, L.etiqueta);
    L.seccion('Interpretación');
    L.parrafo(s.interpretacion, { tamano: 9.3 });
    L.y += 3;
  }
  const pl = s.planAdaptacion;
  if (pl?.estado === 3) {
    L.asegurar(26, L.etiqueta);
    L.seccion('Plan de adaptación');
    L.parrafo(pl.nombre, { estilo: 'negrita' });
    if (pl.motivo) L.parrafo(pl.motivo, { tamano: 9 });
    if ((pl.prioridades || []).length > 0) {
      L.parrafo(`Capacidades a priorizar: ${pl.prioridades.map(p => `${ETIQUETAS_CAPACIDAD[p.capacidad] ?? p.capacidad} (${p.nivel})`).join(', ')}.`, { tamano: 9 });
    }
    L.y += 3;
  } else if (pl?.tipo === 'datos_insuficientes') {
    L.parrafo(`${pl.motivo} Faltan: ${(pl.faltantes || []).map(c => ETIQUETAS_CAPACIDAD[c] ?? c).join(', ')}.`, { tamano: 9 });
    L.y += 3;
  }
}

/** Genera el PDF de Mis datos: cuenta e informe final de cada participante.
 * @param {Object} [datos] - JSON de /arco/exportar (perfil, consentimientos, resultados, generadoEn).
 * @param {Object} [recursos] - logo, robot, fuentes y cuerpos (imagen 3D y capacidades por participante); todos opcionales.
 * @returns {Blob} documento PDF. */
export function generarPdfMisDatos(datos = {}, recursos = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = new Lienzo(doc, recursos);
  const todos = Array.isArray(datos.resultados) ? datos.resultados : [];
  // Los registros que el servidor no pudo descifrar llegan como { id, error }: no tienen datos que mostrar.
  const resultados = todos.filter(r => r && !r.error);
  const ilegibles = todos.length - resultados.length;
  const generadoEn = formatearFechaISO(datos.generadoEn || new Date().toISOString());
  L.etiqueta = 'Mis datos personales';

  cabeceraPortada(L, resultados.length, generadoEn);
  bloqueCuenta(L, datos);
  if (ilegibles > 0) {
    L.y += 2;
    L.parrafo(`${ilegibles} ${ilegibles === 1 ? 'registro antiguo no pudo' : 'registros antiguos no pudieron'} recuperarse y no se incluye${ilegibles === 1 ? '' : 'n'} en este documento.`, { tamano: 8.8, color: GRIS });
  }

  if (resultados.length === 0) {
    L.y += 6;
    L.parrafo('Aún no tienes participantes evaluados. Cuando completes una evaluación, su informe final aparecerá aquí.');
  }

  resultados.forEach((r, i) => {
    const s = resumirRegistro(r);
    L.etiqueta = `Participante ${i + 1} · ${s.nombre}`;
    L.paginaNueva(L.etiqueta);
    bannerParticipante(L, s, i + 1);
    bloquePerfilFisico(L, s, recursos.cuerpos?.[i]);
    bloqueRecomendacion(L, s);
    bloquePrecauciones(L, s);
    bloqueInterpretacion(L, s);
  });

  L.pintarPies();
  return doc.output('blob');
}
