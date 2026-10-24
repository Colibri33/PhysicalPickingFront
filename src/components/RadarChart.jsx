/**
 * @module components/RadarChart
 * @description Gráfico de radar en SVG puro, sin dependencias externas.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): solo traduce porcentajes por variable a geometría SVG.
 *  - I (Segregación de interfaces): contrato mínimo de datos y variables.
 */

/** Dibuja guías, ejes, polígono de datos, puntos y etiquetas de valor.
 * @param {Object} props
 * @param {Object<string, number>} props.datos - porcentaje (0-100) indexado por id de variable.
 * @param {Array<{id: string, nombre: string, color: string}>} props.variables - variables en orden de ejes.
 * @param {Object<string, string>} [props.textos] - texto por id de variable que reemplaza al porcentaje en la etiqueta del eje.
 * @returns {JSX.Element} gráfico SVG. */
export default function RadarChart({ datos, variables, textos }) {
  const cx = 150, cy = 155, r = 105;
  const n  = variables.length;
  const angulo = i => (Math.PI * 2 * i / n) - Math.PI / 2;
  const punto  = (i, radio) => ({
    x: cx + radio * Math.cos(angulo(i)),
    y: cy + radio * Math.sin(angulo(i)),
  });

  const guias = [20, 40, 60, 80, 100].map(pct => {
    const rad = r * pct / 100;
    const pts = variables.map((_, i) => `${punto(i, rad).x},${punto(i, rad).y}`).join(' ');
    return (
      <polygon
        key={pct}
        points={pts}
        fill="none"
        stroke="#e1e4ea"
        strokeWidth="1"
        strokeDasharray={pct < 100 ? '3 3' : undefined}
      />
    );
  });

  const ejes = variables.map((_, i) => {
    const p = punto(i, r);
    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e1e4ea" strokeWidth="1" />;
  });

  const ptsDatos = variables.map((v, i) => {
    const rad = r * (datos[v.id] ?? 0) / 100;
    const p   = punto(i, rad);
    return `${p.x},${p.y}`;
  }).join(' ');

  const puntos = variables.map((v, i) => {
    const rad = r * (datos[v.id] ?? 0) / 100;
    const p   = punto(i, rad);
    return (
      <circle key={v.id} cx={p.x} cy={p.y} r="4.5"
        fill={v.color} stroke="#fff" strokeWidth="2" />
    );
  });

  const etiquetas = variables.map((v, i) => {
    const p = punto(i, r + 18);
    return (
      <text key={v.id} x={p.x} y={p.y}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fill="#454c5e" fontFamily="monospace">
        {textos?.[v.id] ?? `${datos[v.id] ?? 0}%`}
      </text>
    );
  });

  return (
    <svg viewBox="0 0 300 310" style={{ width: '100%', maxWidth: 320 }}>
      {guias}
      {ejes}
      <polygon
        points={ptsDatos}
        fill="rgba(37,85,212,0.12)"
        stroke="#5B3FE0"
        strokeWidth="2"
      />
      {puntos}
      {etiquetas}
    </svg>
  );
}
