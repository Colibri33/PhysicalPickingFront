/**
 * @module components/FondoAnimado
 * @description Fondo de canvas con partículas flotantes que se repelen del puntero, usado en pantallas de autenticación.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es la animación decorativa de fondo.
 *  - I (Segregación de interfaces): no recibe props.
 * Notas: efecto sutil de partículas con la paleta de la identidad PhysicalPicking.
 */
import { useRef, useEffect } from 'react';

const COLORES = ['#22D3EE', '#8B6BFF', '#5B3FE0', '#7EF0FA', '#2F5CE8'];
const N_PUNTOS = 46;

/** Canvas decorativo animado con requestAnimationFrame; libera listeners y animación al desmontarse.
 * @returns {JSX.Element} canvas oculto a tecnologías de asistencia. */
export default function FondoAnimado() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let w, h, raf;

    /** Ajusta el buffer del canvas a su tamaño de pantalla. */
    function resize() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const puntos = Array.from({ length: N_PUNTOS }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1.4 + Math.random() * 2.3,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
    }));

    /** Avanza y dibuja un fotograma; las partículas cercanas al puntero se desplazan y crecen. */
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const p of puntos) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130) {
          const fuerza = (130 - dist) / 130;
          p.x -= (dx / dist) * fuerza * 2.2;
          p.y -= (dy / dist) * fuerza * 2.2;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (dist < 130 ? ((130 - dist) / 130) * 2 : 0), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    tick();

    /** Registra la posición del puntero relativa al canvas.
     * @param {MouseEvent} e - evento de movimiento. */
    function handleMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    /** Aleja el puntero fuera del canvas para desactivar la repulsión. */
    function handleLeave() {
      mouseRef.current = { x: -9999, y: -9999 };
    }
    const contenedor = canvas.parentElement;
    contenedor.addEventListener('mousemove', handleMove);
    contenedor.addEventListener('mouseleave', handleLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      contenedor.removeEventListener('mousemove', handleMove);
      contenedor.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="fondo-animado" aria-hidden="true" />;
}
