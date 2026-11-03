/**
 * @module components/MapaCorporalBrechas
 * @description Panel interactivo "Tu perfil de rendimiento": silueta, capacidades, radar de niveles y detalle frente a la familia elegida.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): visualización del perfil; no calcula nada propio.
 *  - D (Inversión de dependencias): los datos provienen de evaluacion/informe/detalleCapacidades.js.
 *  - I (Segregación de interfaces): subcomponentes con props mínimas.
 * Notas: niveles y estados según el baremo y la regla del motor; el visor 3D se carga de forma diferida.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { NIVELES } from '../evaluacion/niveles';
import { detalleCapacidades, mayorOportunidad } from '../evaluacion/informe/detalleCapacidades';

// Carga diferida para que three.js no pese en el resto de la aplicación.
const Cuerpo3D = lazy(() => import('./Cuerpo3D'));

const ESTADOS = {
  cumple:   { color: '#22D3EE', etiqueta: 'Cumple',        marca: 'ok' },
  brecha:   { color: '#F59E0B', etiqueta: 'Brecha',        marca: 'alerta' },
  severa:   { color: '#FF5D6C', etiqueta: 'Brecha severa', marca: 'alerta' },
  sin_dato: { color: '#A9A4C4', etiqueta: 'Sin dato',      marca: 'vacio' },
};
const COLOR_NIVEL = { 'Muy bajo': '#FF5D6C', Bajo: '#F59E0B', Medio: '#8B7CF6', Alto: '#22D3EE', 'Muy alto': '#16C784' };
const colorDe = (d) => (d.estado ? ESTADOS[d.estado].color : (COLOR_NIVEL[d.nivel] ?? '#A9A4C4'));

const TRAZOS = {
  fuerza: <path d="M7 11.5V6.8a1.4 1.4 0 0 1 2.8 0V11M9.8 10.5V5.3a1.4 1.4 0 0 1 2.8 0v5.2M12.6 10.5V6.2a1.4 1.4 0 0 1 2.8 0v6M15.4 11.6V9a1.4 1.4 0 0 1 2.8 0v4.6c0 4-2.7 6.9-6.3 6.9-3 0-4.9-1.8-5.9-4.1L4.9 13a1.35 1.35 0 0 1 2.3-1.4L8 12.8" />,
  fuerza_explosiva: <><circle cx="14.5" cy="4" r="2" /><path d="M7.5 21l2.8-5.5 3 2 .9 3.8M10.3 15.5l1.4-6.2 3.6 3.2 3.4-1.2M11.7 9.3 8 10.4l-2.2 3" /></>,
  vo2max: <><path d="M20.4 8.6c0 5-8.4 10.9-8.4 10.9S3.6 13.6 3.6 8.6A4.4 4.4 0 0 1 12 6.4a4.4 4.4 0 0 1 8.4 2.2Z" /><path d="M6.3 12.2h2.9l1.5-2.6 2 5 1.4-2.4h3.6" /></>,
  flexibilidad: <><circle cx="6.5" cy="7.5" r="2" /><path d="M4 20h16M6.8 10.5 10 16h8M10 16l-1.6 4M8.6 12.4 15 11.6l3 1.4" /></>,
  equilibrio: <><circle cx="12" cy="4" r="2" /><path d="M12 7.2v7.3M12 14.5 10.8 21M12 14.5l4.6 2.6-1 3M5.5 10.2l6.5-1.4 6.5 1.4" /></>,
  ok: <path d="m6 12.5 4 4 8-9" />,
  alerta: <><path d="M12 6v7" /><circle cx="12" cy="17.5" r=".6" /></>,
  vacio: <path d="M7 12h10" />,
  girar: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4.5h-4.5" /></>,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  ajustar: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  calendario: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  trofeo: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4.5a3.5 3.5 0 0 0 3.6 4M16 6h3.5a3.5 3.5 0 0 1-3.6 4M12 13v4M8.5 20.5h7M10 17h4" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r=".6" /></>,
  bombillo: <><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" /></>,
  clic: <><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11l3.8.7a2 2 0 0 1 1.6 2.3l-.9 4.6a2.5 2.5 0 0 1-2.5 2H11a3 3 0 0 1-2.4-1.2L5.4 15a1.5 1.5 0 0 1 2.3-2L9 14.5" /><path d="M5 5.5 3.5 4M8 2.5V1M14 4l1.2-1.2" /></>,
  pdf: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M8.5 13.5h7M8.5 17h5" /></>,
};
/** Icono SVG de capacidad (viewBox 24×24).
 * @param {Object} props
 * @param {string} props.nombre - Clave del trazo.
 * @param {number} [props.size] - Tamaño en px.
 * @param {string} [props.className] - Clases adicionales.
 * @returns {JSX.Element} */
function Icono({ nombre, size = 20, className = '' }) {
  return (
    <svg className={`rend-ico ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  );
}

// Geometría de la silueta: viewBox 460 × 600, eje en x = 230.
const W = 460;
const H = 600;
const ZONAS = {
  frontal: {
    fuerza:           { anc: [304, 232], g: [[160, 224, 14, 36, 8], [300, 224, 14, 36, -8], [150, 276, 12, 15, 0], [310, 276, 12, 15, 0]] },
    fuerza_explosiva: { anc: [262, 350], g: [[208, 350, 22, 46, 3], [252, 350, 22, 46, -3]] },
    vo2max:           { anc: [214, 138], g: [[230, 140, 46, 28, 0]] },
    flexibilidad:     { anc: [198, 266], g: [[230, 262, 48, 16, 0], [212, 318, 18, 14, 0], [248, 318, 18, 14, 0]] },
    equilibrio:       { anc: [264, 500], g: [[200, 482, 14, 30, 2], [260, 482, 14, 30, -2], [194, 532, 20, 9, 0], [266, 532, 20, 9, 0]] },
  },
  posterior: {
    fuerza:           { anc: [304, 232], g: [[160, 224, 14, 36, 8], [300, 224, 14, 36, -8], [150, 276, 12, 15, 0], [310, 276, 12, 15, 0]] },
    fuerza_explosiva: { anc: [262, 288], g: [[212, 284, 22, 20, 0], [248, 284, 22, 20, 0]] },
    vo2max:           { anc: [214, 158], g: [[230, 160, 46, 36, 0]] },
    flexibilidad:     { anc: [200, 356], g: [[230, 224, 18, 32, 0], [207, 352, 18, 42, 3], [253, 352, 18, 42, -3]] },
    equilibrio:       { anc: [266, 470], g: [[201, 452, 15, 32, 2], [259, 452, 15, 32, -2], [194, 532, 20, 9, 0], [266, 532, 20, 9, 0]] },
  },
};
const CALLOUT = {
  vo2max:           { lado: 'izq', y: 118 },
  flexibilidad:     { lado: 'izq', y: 300 },
  fuerza:           { lado: 'der', y: 150 },
  fuerza_explosiva: { lado: 'der', y: 336 },
  equilibrio:       { lado: 'der', y: 480 },
};
const LINEAS_NOMBRE = {
  fuerza: ['Fuerza', 'prensil'], fuerza_explosiva: ['Fuerza', 'explosiva'], vo2max: ['Resistencia', 'aeróbica'],
  flexibilidad: ['Flexibilidad'], equilibrio: ['Equilibrio'],
};

/** Dibuja la silueta del cuerpo para la vista indicada.
 * @param {Object} props
 * @param {string} props.vista - 'frontal' o 'posterior'.
 * @returns {JSX.Element} */
function Silueta({ vista }) {
  const def = 'rgba(44,27,107,.22)';
  return (
    <g className="rend-silueta">
      <ellipse cx="230" cy="50" rx="23" ry="29" fill="url(#rendPiel)" />
      <path d="M219 74 L241 74 L244 98 L216 98 Z" fill="url(#rendPiel)" />
      <path d="M186 104 C204 96 256 96 274 104 C288 110 292 124 288 140 L276 196 C272 216 268 234 266 254 L194 254 C192 234 188 216 184 196 L172 140 C168 124 172 110 186 104 Z" fill="url(#rendPiel)" />
      <g stroke="url(#rendPiel)" strokeLinecap="round" fill="none">
        <path d="M181 118 L165 196" strokeWidth="26" />
        <path d="M279 118 L295 196" strokeWidth="26" />
        <path d="M165 196 L155 262" strokeWidth="20" />
        <path d="M295 196 L305 262" strokeWidth="20" />
        <path d="M208 300 L202 402" strokeWidth="36" />
        <path d="M252 300 L258 402" strokeWidth="36" />
        <path d="M202 402 L198 522" strokeWidth="24" />
        <path d="M258 402 L262 522" strokeWidth="24" />
      </g>
      <ellipse cx="150" cy="276" rx="10" ry="14" transform="rotate(10 150 276)" fill="url(#rendPiel)" />
      <ellipse cx="310" cy="276" rx="10" ry="14" transform="rotate(-10 310 276)" fill="url(#rendPiel)" />
      <ellipse cx="194" cy="532" rx="18" ry="8" fill="url(#rendPiel)" />
      <ellipse cx="266" cy="532" rx="18" ry="8" fill="url(#rendPiel)" />
      <path d="M192 250 L268 250 C276 268 280 286 281 306 L236 312 L230 294 L224 312 L179 306 C180 286 184 268 192 250 Z" fill="url(#rendShort)" />

      <g fill="url(#rendMusculo)" stroke={def} strokeWidth="1">
        <ellipse cx="184" cy="124" rx="16" ry="20" transform="rotate(25 184 124)" />
        <ellipse cx="276" cy="124" rx="16" ry="20" transform="rotate(-25 276 124)" />
        <ellipse cx="171" cy="164" rx="11" ry="22" transform="rotate(12 171 164)" />
        <ellipse cx="289" cy="164" rx="11" ry="22" transform="rotate(-12 289 164)" />
        <ellipse cx="160" cy="222" rx="9" ry="24" transform="rotate(8 160 222)" />
        <ellipse cx="300" cy="222" rx="9" ry="24" transform="rotate(-8 300 222)" />
        {vista === 'frontal' ? (
          <>
            <path d="M206 122 C218 116 228 118 229 124 L229 152 C220 158 206 156 198 148 C194 138 198 126 206 122 Z" />
            <path d="M254 122 C242 116 232 118 231 124 L231 152 C240 158 254 156 262 148 C266 138 262 126 254 122 Z" />
            {[164, 184, 204].map(y => (
              <g key={y}>
                <rect x="215" y={y} width="14" height="16" rx="5" />
                <rect x="231" y={y} width="14" height="16" rx="5" />
              </g>
            ))}
            <rect x="217" y="224" width="26" height="22" rx="9" />
            <path d="M200 170 C206 190 208 214 212 240 L206 242 C198 220 194 196 194 172 Z" />
            <path d="M260 170 C254 190 252 214 248 240 L254 242 C262 220 266 196 266 172 Z" />
            <ellipse cx="208" cy="348" rx="17" ry="40" transform="rotate(3 208 348)" />
            <ellipse cx="252" cy="348" rx="17" ry="40" transform="rotate(-3 252 348)" />
            <ellipse cx="216" cy="386" rx="9" ry="14" />
            <ellipse cx="244" cy="386" rx="9" ry="14" />
            <ellipse cx="202" cy="406" rx="10" ry="8" />
            <ellipse cx="258" cy="406" rx="10" ry="8" />
            <ellipse cx="199" cy="458" rx="9" ry="36" transform="rotate(2 199 458)" />
            <ellipse cx="261" cy="458" rx="9" ry="36" transform="rotate(-2 261 458)" />
          </>
        ) : (
          <>
            <path d="M230 98 L264 110 C256 132 244 150 230 166 C216 150 204 132 196 110 Z" />
            <path d="M196 128 C206 150 214 180 220 214 L206 220 C196 196 188 160 186 132 Z" />
            <path d="M264 128 C254 150 246 180 240 214 L254 220 C264 196 272 160 274 132 Z" />
            <ellipse cx="222" cy="222" rx="7" ry="24" />
            <ellipse cx="238" cy="222" rx="7" ry="24" />
            <ellipse cx="207" cy="350" rx="15" ry="40" transform="rotate(3 207 350)" />
            <ellipse cx="253" cy="350" rx="15" ry="40" transform="rotate(-3 253 350)" />
            <ellipse cx="201" cy="446" rx="13" ry="30" transform="rotate(2 201 446)" />
            <ellipse cx="259" cy="446" rx="13" ry="30" transform="rotate(-2 259 446)" />
          </>
        )}
      </g>
      {vista === 'posterior' && (
        <g stroke="rgba(255,255,255,.35)" strokeWidth="1.2" fill="none">
          <path d="M230 108 L230 250" />
          <path d="M230 262 L230 296 M200 290 C212 302 224 302 230 296 C236 302 248 302 260 290" />
        </g>
      )}
      <ellipse cx="206" cy="150" rx="70" ry="120" fill="url(#rendBrillo)" pointerEvents="none" />
    </g>
  );
}

/** Lienzo SVG del cuerpo con zonas seleccionables, zoom y etiquetas.
 * @param {Object} props
 * @param {string} props.vista - Vista activa.
 * @param {Array} props.detalles - Detalle por capacidad.
 * @param {string} props.sel - Capacidad seleccionada.
 * @param {Function} props.onSel - Selecciona una capacidad.
 * @param {number} props.zoom - Factor de zoom.
 * @param {boolean} props.compacto - Oculta textos laterales.
 * @returns {JSX.Element} */
function Cuerpo({ vista, detalles, sel, onSel, zoom, compacto }) {
  const zonas = ZONAS[vista];
  const foco = zoom > 1 && sel ? { x: zonas[sel].anc[0], y: zonas[sel].anc[1] } : { x: W / 2, y: H / 2 };
  const tx = W / 2 - zoom * foco.x;
  const ty = H / 2 - zoom * foco.y;
  const proyectar = ([x, y]) => [tx + zoom * x, ty + zoom * y];

  return (
    <svg className="rend-cuerpo-svg" viewBox={compacto ? `92 0 ${W - 184} ${H}` : `0 0 ${W} ${H}`} role="group"
      aria-label={`Silueta, vista ${vista}. ${detalles.map(d => `${d.nombre}: ${d.nivel ?? 'sin dato'}${d.estado ? `, ${ESTADOS[d.estado].etiqueta}` : ''}`).join('. ')}`}>
      <defs>
        <linearGradient id="rendPiel" gradientUnits="userSpaceOnUse" x1="150" y1="30" x2="320" y2="560">
          <stop offset="0" stopColor="#E6E1FF" />
          <stop offset=".45" stopColor="#A99DFF" />
          <stop offset="1" stopColor="#5468EA" />
        </linearGradient>
        <linearGradient id="rendMusculo" gradientUnits="userSpaceOnUse" x1="150" y1="40" x2="310" y2="540">
          <stop offset="0" stopColor="#F4F1FF" />
          <stop offset=".5" stopColor="#B8ADFF" />
          <stop offset="1" stopColor="#6E80F4" />
        </linearGradient>
        <linearGradient id="rendShort" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B2896" />
          <stop offset="1" stopColor="#1B1150" />
        </linearGradient>
        <radialGradient id="rendBrillo">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".38" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {detalles.map(d => (
          <radialGradient key={d.id} id={`rendGlow-${d.id}`}>
            <stop offset="0" stopColor={colorDe(d)} stopOpacity=".95" />
            <stop offset=".55" stopColor={colorDe(d)} stopOpacity=".55" />
            <stop offset="1" stopColor={colorDe(d)} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      <g className="rend-zoom" style={{ transform: `translate(${tx}px, ${ty}px) scale(${zoom})` }}>
        <g className="rend-piso" aria-hidden="true">
          <ellipse cx="230" cy="540" rx="128" ry="20" />
          <ellipse cx="230" cy="540" rx="96" ry="13" />
          <path d="M120 528 C112 520 118 512 138 506 M131 500l9 6-10 4" />
          <path d="M340 552 C348 560 342 568 322 574 M329 580l-9-6 10-4" />
        </g>
        <g key={vista} className="rend-giro">
          <Silueta vista={vista} />
          {detalles.map(d => (
            <g key={d.id} className={`rend-zona${sel === d.id ? ' rend-zona--sel' : ''}`}
              role="button" tabIndex={0} aria-label={`Ver ${d.nombre}`}
              onClick={() => onSel(d.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSel(d.id); } }}>
              {zonas[d.id].g.map(([cx, cy, rx, ry, rot], i) => (
                <g key={i} transform={`rotate(${rot} ${cx} ${cy})`}>
                  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#rendGlow-${d.id})`} className="rend-glow" />
                </g>
              ))}
            </g>
          ))}
        </g>
      </g>

      {detalles.map(d => {
        // Con zoom solo se etiqueta la zona elegida.
        if (zoom > 1 && d.id !== sel) return null;
        const c = CALLOUT[d.id];
        const izq = c.lado === 'izq';
        const ix = izq ? 128 : 332;
        const [ax, ay] = proyectar(zonas[d.id].anc);
        const anclaVisible = ax > 0 && ax < W && ay > 0 && ay < H;
        const color = colorDe(d);
        const lineas = LINEAS_NOMBRE[d.id];
        const marca = d.estado ? ESTADOS[d.estado].marca : null;
        return (
          <g key={d.id} className={`rend-callout${sel === d.id ? ' rend-callout--sel' : ''}`}
            onClick={() => onSel(d.id)} style={{ cursor: 'pointer' }}>
            {anclaVisible && (
              <>
                <line x1={izq ? ix + 17 : ix - 17} y1={c.y} x2={ax} y2={ay} stroke={color} strokeWidth="1.6" strokeDasharray={sel === d.id ? '0' : '4 3'} />
                <circle cx={ax} cy={ay} r="3.5" fill={color} />
              </>
            )}
            {sel === d.id && <circle cx={ix} cy={c.y} r="17" fill="none" stroke={color} className="rend-pulso" />}
            <circle cx={ix} cy={c.y} r="16" fill={color} />
            <svg x={ix - 10} y={c.y - 10} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {TRAZOS[d.id]}
            </svg>
            {marca && (
              <g>
                <circle cx={ix + 12} cy={c.y - 12} r="7" fill="#fff" stroke={color} strokeWidth="1.5" />
                <svg x={ix + 7} y={c.y - 17} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round">
                  {TRAZOS[marca]}
                </svg>
              </g>
            )}
            {!compacto && <text className="rend-callout-txt" textAnchor={izq ? 'end' : 'start'} x={izq ? ix - 24 : ix + 24} y={c.y - (lineas.length === 2 ? 9 : 2)}>
              {lineas.map((l, i) => <tspan key={i} x={izq ? ix - 24 : ix + 24} dy={i === 0 ? 0 : 14}>{l}</tspan>)}
              <tspan x={izq ? ix - 24 : ix + 24} dy="15" className="rend-callout-nivel" fill={color}>{d.nivel ?? 'Sin dato'}</tspan>
            </text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Radar de niveles; escala ordinal, solo posición y sin porcentajes.
 * @param {Object} props
 * @param {Array} props.detalles - Detalle por capacidad.
 * @param {string} props.sel - Capacidad seleccionada.
 * @param {Function} props.onSel - Selecciona una capacidad.
 * @param {boolean} props.conFamilia - Indica si hay familia de referencia.
 * @param {string} props.familiaNombre - Nombre de la familia.
 * @returns {JSX.Element} */
function Radar({ detalles, sel, onSel, conFamilia, familiaNombre }) {
  const cx = 180; const cy = 142; const R = 84;
  const ang = (i) => ((-90 + i * 72) * Math.PI) / 180;
  const pt = (i, k) => [cx + (R * (k + 1)) / 5 * Math.cos(ang(i)), cy + (R * (k + 1)) / 5 * Math.sin(ang(i))];
  const poli = (pares) => pares.map(p => p.join(',')).join(' ');
  const tuyos = detalles.map((d, i) => (d.nivelIndex >= 0 ? pt(i, d.nivelIndex) : null)).filter(Boolean);
  const exig = conFamilia ? detalles.map((d, i) => pt(i, Math.max(d.objetivoIndex, 0))) : null;
  return (
    <svg className="rend-radar-svg" viewBox="0 0 360 300" role="img"
      aria-label={`Radar de niveles: ${detalles.map(d => `${d.nombre} ${d.nivel ?? 'sin dato'}`).join(', ')}`}>
      {NIVELES.map((n, k) => (
        <polygon key={n} points={poli([0, 1, 2, 3, 4].map(i => pt(i, k)))} className="rend-radar-anillo" />
      ))}
      {[0, 1, 2, 3, 4].map(i => <line key={i} x1={cx} y1={cy} x2={pt(i, 4)[0]} y2={pt(i, 4)[1]} className="rend-radar-eje" />)}
      {NIVELES.map((n, k) => {
        const a = (-54 * Math.PI) / 180;
        const r = (R * (k + 1)) / 5;
        return <text key={n} x={cx + r * Math.cos(a) + 3} y={cy + r * Math.sin(a) - 2} className="rend-radar-nivel">{n}</text>;
      })}
      {exig && <polygon points={poli(exig)} className="rend-radar-exig" />}
      {tuyos.length >= 3 && <polygon points={poli(tuyos)} className="rend-radar-tuyo" />}
      {detalles.map((d, i) => {
        const [lx, ly] = [cx + (R + 26) * Math.cos(ang(i)), cy + (R + 22) * Math.sin(ang(i))];
        const anchor = Math.abs(Math.cos(ang(i))) < 0.2 ? 'middle' : Math.cos(ang(i)) > 0 ? 'start' : 'end';
        const color = colorDe(d);
        return (
          <g key={d.id} onClick={() => onSel(d.id)} style={{ cursor: 'pointer' }}>
            {d.nivelIndex >= 0 && (
              <circle cx={pt(i, d.nivelIndex)[0]} cy={pt(i, d.nivelIndex)[1]} r={sel === d.id ? 7 : 5} fill={color} stroke="#fff" strokeWidth="2" />
            )}
            <text x={lx} y={ly - (LINEAS_NOMBRE[d.id].length === 2 ? 14 : 6)} textAnchor={anchor} className={`rend-radar-lbl${sel === d.id ? ' rend-radar-lbl--sel' : ''}`}>
              {LINEAS_NOMBRE[d.id].map((l, k) => <tspan key={k} x={lx} dy={k === 0 ? 0 : 12}>{l}</tspan>)}
            </text>
            <text x={lx} y={ly + 9} textAnchor={anchor} className="rend-radar-val" fill={color}>{d.nivel ?? 'Sin dato'}</text>
          </g>
        );
      })}
      <g className="rend-radar-leyenda" transform="translate(10 290)">
        <line x1="0" y1="0" x2="16" y2="0" className="rend-radar-tuyo-l" /><text x="20" y="4">Tu nivel</text>
        {conFamilia && <><line x1="92" y1="0" x2="108" y2="0" className="rend-radar-exig-l" /><text x="112" y="4">Exige {familiaNombre}</text></>}
      </g>
    </svg>
  );
}

/** Escala de cinco niveles con la posición del evaluado y la exigida.
 * @param {Object} props
 * @param {Object} props.d - Detalle de la capacidad.
 * @param {boolean} props.conFamilia - Indica si hay familia de referencia.
 * @returns {JSX.Element} */
function EscalaNiveles({ d, conFamilia }) {
  return (
    <div className="rend-escala" aria-hidden="true">
      {NIVELES.map((n, k) => (
        <div key={n} className={`rend-escala-seg${k <= d.nivelIndex ? ' rend-escala-seg--lleno' : ''}${k === d.objetivoIndex ? ' rend-escala-seg--meta' : ''}`}
          style={{ '--seg': COLOR_NIVEL[n] }}>
          {k === d.nivelIndex && <span className="rend-escala-tu">Tú</span>}
          {k === d.objetivoIndex && <span className="rend-escala-meta">{conFamilia ? 'Exige' : 'Siguiente'}</span>}
          <span className="rend-escala-nombre">{n}</span>
        </div>
      ))}
    </div>
  );
}

/** Panel con el detalle de la capacidad seleccionada.
 * @param {Object} props
 * @param {Object} props.d - Detalle de la capacidad.
 * @param {boolean} props.conFamilia - Indica si hay familia de referencia.
 * @param {string} props.familiaNombre - Nombre de la familia.
 * @returns {JSX.Element} */
function Detalle({ d, conFamilia, familiaNombre }) {
  const color = colorDe(d);
  let significado;
  if (d.nivel == null) {
    significado = `No hay dato de esta prueba${d.noAutorizado ? ': el PAR-Q+ no autorizó automáticamente la prueba máxima' : ''}.`;
  } else if (conFamilia) {
    const base = `${familiaNombre} exige nivel ${d.nivelObjetivo} o superior en ${d.nombre.toLowerCase()}${d.exigenciaAlta ? ' (exigencia alta)' : ''}.`;
    significado = d.estado === 'cumple' ? `${base} Tu nivel ${d.nivel} cumple el requisito.`
      : d.estado === 'severa' ? `${base} Tu nivel ${d.nivel} es una brecha severa: por eso esta familia no puede ser recomendación firme.`
        : `${base} Tu nivel ${d.nivel} está por debajo: es una brecha.`;
    if (d.relevanteMitchell) significado += ' Es una capacidad clave para esta familia según la clasificación de Mitchell.';
  } else {
    significado = d.nivelObjetivo
      ? `Tu nivel es ${d.nivel} según el baremo. Para pasar a ${d.nivelObjetivo} la referencia es ${d.umbral?.texto ?? '—'}.`
      : `Tu nivel es ${d.nivel}: el más alto del baremo.`;
  }
  const verPauta = d.pauta && d.nivel != null && (d.estado === 'brecha' || d.estado === 'severa' || (!conFamilia && d.nivelIndex <= 1));

  return (
    <div className="rend-detalle-card" style={{ '--cap': color }}>
      <div className="rend-detalle-head">
        <span className="rend-detalle-ico"><Icono nombre={d.id} size={24} /></span>
        <div className="rend-detalle-nombre">
          <h5>{d.nombre}</h5>
          <span>{d.zona}</span>
        </div>
        <span className="rend-chip">{d.estado ? ESTADOS[d.estado].etiqueta : (d.nivel ?? 'Sin dato')}</span>
      </div>

      <div className="rend-detalle-valor">
        <strong>{d.valorTexto}</strong>
        {d.nivel && <span className="rend-nivel-pill" style={{ '--seg': COLOR_NIVEL[d.nivel] }}>Nivel {d.nivel}</span>}
      </div>
      {d.id === 'vo2max' && d.palier != null && <p className="rend-detalle-nota">Léger: nivel {String(d.palier).replace('.', ',')} alcanzado.</p>}
      {d.nivelIndex >= 0 && <EscalaNiveles d={d} conFamilia={conFamilia} />}

      <div className="rend-stats">
        <div><span>Tu resultado</span><strong>{d.valorTexto}</strong></div>
        <div>
          <span>Referencia</span>
          <strong>{d.umbral?.texto ?? '—'}</strong>
          {d.nivelObjetivo && <small>nivel {d.nivelObjetivo}{d.legerNecesario ? ` · ≈ nivel ${d.legerNecesario} del Léger` : ''}</small>}
        </div>
        <div>
          <span>Diferencia</span>
          <strong className={d.diferencia ? (d.diferencia.cumple ? 'rend-ok' : 'rend-mal') : ''}>{d.diferencia?.texto ?? '—'}</strong>
        </div>
      </div>

      <div className="rend-caja">
        <p className="rend-caja-tit"><Icono nombre="info" size={18} /> ¿Qué significa?</p>
        <p>{significado}</p>
        <p className="rend-caja-fuente">{d.mide} Baremo: {d.baremo}{d.grupoBaremo ? `, ${d.grupoBaremo}` : ''}.</p>
      </div>

      {verPauta && (
        <details className="rend-caja rend-caja--pauta" open>
          <summary><Icono nombre="bombillo" size={18} /> Orientación general</summary>
          <p>{d.pauta.texto}</p>
          <p className="rend-caja-fuente">{d.pauta.referencia}</p>
        </details>
      )}
    </div>
  );
}

/** Formatea una fecha ISO para mostrar.
 * @param {string} iso - Fecha ISO.
 * @returns {string} fecha legible o "—" si es inválida. */
function fechaLegible(iso) {
  const f = iso ? new Date(iso) : null;
  if (!f || Number.isNaN(f.getTime())) return '—';
  return f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Panel del perfil de rendimiento con silueta, radar y detalle.
 * @param {Object} props
 * @param {Object} props.flujo - Salida de ejecutarFlujoEvaluacion().
 * @param {string} [props.familiaId] - Familia seleccionada.
 * @param {Function} [props.onFamiliaChange] - Si existe, la selección es controlada.
 * @param {Function} [props.onDescargarPdf] - Descarga el informe.
 * @param {string} [props.sexo] - Sexo para la silueta.
 * @returns {JSX.Element} */
export default function MapaCorporalBrechas({ flujo, familiaId = '', onFamiliaChange, onDescargarPdf, sexo = 'masculino' }) {
  const [familiaInterna, setFamiliaInterna] = useState(familiaId);
  const seleccionFamilia = onFamiliaChange ? familiaId : familiaInterna;
  const cambiarFamilia = (id) => (onFamiliaChange ? onFamiliaChange(id) : setFamiliaInterna(id));

  const ranking = flujo?.etapas?.ranking?.familias ?? [];
  const familia = ranking.find(f => f.id === seleccionFamilia) ?? null;
  const conFamilia = Boolean(familia);
  const detalles = useMemo(() => detalleCapacidades(flujo, familia?.id ?? null), [flujo, familia?.id]);
  const oportunidad = mayorOportunidad(detalles);

  const [sel, setSel] = useState(() => oportunidad?.id ?? 'fuerza');
  const [vista, setVista] = useState('frontal');
  const [zoom, setZoom] = useState(1);
  const [fallo3d, setFallo3d] = useState(false);
  const d = detalles.find(x => x.id === sel) ?? detalles[0];

  // En pantallas angostas el lienzo se recorta a la silueta.
  const areaRef = useRef(null);
  const [compacto, setCompacto] = useState(false);
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setCompacto(e.contentRect.width < 360));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const items3d = useMemo(() => detalles.map(x => ({
    id: x.id, nombre: x.nombre, color: colorDe(x), lineas: LINEAS_NOMBRE[x.id], nivel: x.nivel, sinDato: x.nivel == null,
    icono: TRAZOS[x.id], marca: x.estado ? TRAZOS[ESTADOS[x.estado].marca] : null,
  })), [detalles]);

  const evaluadas = detalles.filter(x => x.nivelIndex >= 0).length;
  const cumplidas = detalles.filter(x => x.estado === 'cumple').length;
  const pct = conFamilia ? (familia.porcentaje ?? null) : null;
  const circ = 2 * Math.PI * 26;

  return (
    <section className="rend" aria-label="Tu perfil de rendimiento">
      <header className="rend-head">
        <div className="rend-head-txt">
          <p className="rend-kicker">Evaluación física</p>
          <h3 className="rend-titulo">Tu perfil de <span>rendimiento</span></h3>
          <p className="rend-sub">Tus 5 capacidades físicas, las brechas detectadas y su comparación con la exigencia de cada familia deportiva.</p>
        </div>
        <div className="rend-kpi">
          <svg className="rend-donut" viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <linearGradient id="rendDonut" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#5B3FE0" /><stop offset=".6" stopColor="#2F5CE8" /><stop offset="1" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="26" className="rend-donut-fondo" />
            <circle cx="32" cy="32" r="26" className="rend-donut-valor"
              strokeDasharray={`${((pct ?? (evaluadas / 5) * 100) / 100) * circ} ${circ}`} />
            <text x="32" y="37" textAnchor="middle" className="rend-donut-txt">{pct != null ? `${pct}%` : `${evaluadas}/5`}</text>
          </svg>
          <div className="rend-kpi-txt">
            <strong>{conFamilia ? 'Compatibilidad' : 'Capacidades evaluadas'}</strong>
            <span>{conFamilia ? `${cumplidas} de ${evaluadas} requisitos cumplidos` : 'Elige una familia para comparar'}</span>
            <label className="rend-select">
              <span className="sr-only">Comparar con</span>
              <select value={seleccionFamilia} onChange={e => cambiarFamilia(e.target.value)}>
                <option value="">Solo mi perfil</option>
                {ranking.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nombre ?? f.id}{f.porcentaje != null ? ` · ${f.porcentaje}%` : ''}{f.firme === false ? ' · no recomendable' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="rend-fecha">
          <Icono nombre="calendario" size={22} />
          <div><span>Fecha de evaluación</span><strong>{fechaLegible(flujo?.generadoEn)}</strong></div>
        </div>
      </header>

      <div className="rend-grid">
        <div className="rend-card rend-cuerpo">
          <div className="rend-barra">
          <div className="rend-vistas" role="tablist" aria-label="Vista del cuerpo">
            {['frontal', 'posterior'].map(v => (
              <button key={v} type="button" role="tab" aria-selected={vista === v}
                className={vista === v ? 'activa' : ''} onClick={() => setVista(v)}>
                Vista {v}
              </button>
            ))}
          </div>
            <div className="rend-controles">
              <button type="button" onClick={() => setVista(v => (v === 'frontal' ? 'posterior' : 'frontal'))} aria-label="Girar el cuerpo"><Icono nombre="girar" size={18} /></button>
              <button type="button" onClick={() => setZoom(z => Math.min(2.2, Math.round((z + 0.4) * 10) / 10))} aria-label="Acercar a la zona elegida"><Icono nombre="mas" size={18} /></button>
              <button type="button" onClick={() => setZoom(z => Math.max(1, Math.round((z - 0.4) * 10) / 10))} aria-label="Alejar"><Icono nombre="menos" size={18} /></button>
              <button type="button" onClick={() => setZoom(1)} aria-label="Ver cuerpo completo"><Icono nombre="ajustar" size={18} /></button>
            </div>
          </div>
          <div className="rend-cuerpo-area" ref={areaRef}>
            {fallo3d ? (
              <Cuerpo vista={vista} detalles={detalles} sel={sel} onSel={setSel} zoom={zoom} compacto={compacto} />
            ) : (
              <Suspense fallback={<div className="rend3d"><div className="rend3d-carga"><span className="rend3d-spin" />Cargando modelo 3D…</div></div>}>
                <Cuerpo3D vista={vista} items={items3d} sel={sel} onSel={setSel} zoom={zoom} compacto={compacto}
                  sexo={sexo === 'femenino' ? 'femenino' : 'masculino'} onError={() => setFallo3d(true)}
                  etiqueta={`Cuerpo en 3D, vista ${vista}. ${detalles.map(x => `${x.nombre}: ${x.nivel ?? 'sin dato'}${x.estado ? `, ${ESTADOS[x.estado].etiqueta}` : ''}`).join('. ')}`} />
              </Suspense>
            )}
          </div>
          <p className="rend-pista"><Icono nombre="clic" size={18} /> Toca una zona del cuerpo para ver el detalle de la capacidad. Arrastra para girarlo.</p>
          <p className="rend-aviso">Las zonas iluminadas son una referencia visual de cada prueba evaluada, no una medición directa de músculos ni un diagnóstico médico.</p>
          <div className="rend-leyenda">
            {(conFamilia ? Object.values(ESTADOS) : Object.entries(COLOR_NIVEL).map(([etiqueta, color]) => ({ etiqueta, color })))
              .map(e => <span key={e.etiqueta}><i style={{ background: e.color }} />{e.etiqueta}</span>)}
          </div>
        </div>

        <div className="rend-col">
          <div className="rend-card">
            <h4 className="rend-card-tit">Las 5 capacidades</h4>
            <ul className="rend-lista">
              {detalles.map(x => (
                <li key={x.id}>
                  <button type="button" className={`rend-fila${sel === x.id ? ' rend-fila--sel' : ''}`}
                    style={{ '--cap': colorDe(x) }} onClick={() => setSel(x.id)} aria-pressed={sel === x.id}>
                    <span className="rend-fila-num">{x.num}</span>
                    <span className="rend-fila-ico"><Icono nombre={x.id} size={20} /></span>
                    <span className="rend-fila-txt"><strong>{x.nombre}</strong><small>{x.zona}</small></span>
                    <span className="rend-fila-der">
                      {x.estado && <span className="rend-chip">{ESTADOS[x.estado].etiqueta}</span>}
                      <span className="rend-fila-nivel">{x.nivel ?? '—'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rend-card">
            <h4 className="rend-card-tit">Radar de capacidades</h4>
            <Radar detalles={detalles} sel={sel} onSel={setSel} conFamilia={conFamilia} familiaNombre={familia?.nombre ?? ''} />
          </div>
        </div>

        <div className="rend-card rend-detalle">
          {d && <Detalle d={d} conFamilia={conFamilia} familiaNombre={familia?.nombre ?? ''} />}
        </div>
      </div>

      <footer className="rend-pie">
        {oportunidad && (
          <button type="button" className="rend-oportunidad" onClick={() => setSel(oportunidad.id)}>
            <span className="rend-oportunidad-ico"><Icono nombre="trofeo" size={26} /></span>
            <span>
              <small>Tu mayor oportunidad de mejora</small>
              <strong>{oportunidad.nombre}</strong>
              <em>
                Nivel {oportunidad.nivel}
                {conFamilia
                  ? `; ${familia.nombre} exige ${oportunidad.nivelObjetivo}.${oportunidad.diferencia && !oportunidad.diferencia.cumple ? ` ${oportunidad.diferencia.texto}.` : ''}`
                  : oportunidad.nivelObjetivo ? `; para pasar a ${oportunidad.nivelObjetivo}: ${oportunidad.umbral?.texto ?? '—'}.` : '.'}
              </em>
            </span>
          </button>
        )}
        {onDescargarPdf && (
          <button type="button" className="rend-pdf" onClick={onDescargarPdf}>
            <Icono nombre="pdf" size={22} /> Descargar informe PDF
          </button>
        )}
      </footer>
    </section>
  );
}
