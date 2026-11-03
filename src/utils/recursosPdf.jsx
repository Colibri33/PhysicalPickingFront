/**
 * @module utils/recursosPdf
 * @description Prepara en el navegador los recursos gráficos del PDF de Mis datos: logo, robot, tipografías de marca y una imagen del modelo 3D por participante.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): única razón de cambio es cómo se obtienen y codifican los recursos del PDF.
 *  - D (Inversión de dependencias): el generador del PDF recibe los recursos ya resueltos; este módulo es el único que toca DOM, fetch y WebGL.
 * Notas: si un recurso falla (red, WebGL), se omite y el PDF se genera igualmente sin él.
 */

import { createRoot } from 'react-dom/client';
import { ejecutarFlujoEvaluacion, datosEntradaDesdeAnalisis } from '../evaluacion';
import { detalleCapacidades } from '../evaluacion/informe/detalleCapacidades';
import { analisisDesdeRegistro } from './analisisRegistro';

const BASE = (import.meta.env?.BASE_URL ?? '/');

const COLOR_ESTADO = { cumple: '#22D3EE', brecha: '#F59E0B', severa: '#FF5D6C', sin_dato: '#A9A4C4' };
const COLOR_NIVEL = { 'Muy bajo': '#FF5D6C', Bajo: '#F59E0B', Medio: '#8B7CF6', Alto: '#22D3EE', 'Muy alto': '#16C784' };

/** Descarga un archivo público y lo devuelve en base64 (sin prefijo data:).
 * @param {string} ruta - ruta relativa dentro de /public.
 * @returns {Promise<string|null>} base64 o null si falla. */
async function aBase64(ruta) {
  try {
    const resp = await fetch(`${BASE}${ruta}`);
    if (!resp.ok) return null;
    const buf = new Uint8Array(await resp.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(bin);
  } catch {
    return null;
  }
}

/** Espera a que el navegador pinte `n` fotogramas.
 * @param {number} n - cantidad de fotogramas.
 * @returns {Promise<void>} */
function fotogramas(n) {
  return new Promise((resolver) => {
    const paso = (k) => (k <= 0 ? resolver() : requestAnimationFrame(() => paso(k - 1)));
    paso(n);
  });
}

/** Renderiza el modelo 3D fuera de pantalla y lo captura como imagen JPEG.
 * @param {string} sexo - 'masculino' o 'femenino'.
 * @param {Array<Object>} items - capacidades con id, color, nivel y sinDato.
 * @returns {Promise<string|null>} data URL JPEG, o null si WebGL o el modelo fallan. */
async function capturarCuerpo3D(sexo, items) {
  const { default: Cuerpo3D } = await import('../components/Cuerpo3D');
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;width:420px;height:640px;opacity:0;pointer-events:none;z-index:-1;';
  document.body.appendChild(host);
  const raiz = createRoot(host);
  let fallo = false;
  raiz.render(<Cuerpo3D vista="frontal" items={items} sel="" onSel={() => {}} compacto sexo={sexo} onError={() => { fallo = true; }} etiqueta="Captura del modelo 3D" />);
  try {
    const limite = Date.now() + 20000;
    while (!fallo && !host.querySelector('.rend3d--listo') && Date.now() < limite) {
      // El visor se dimensiona con su contenedor: se fija el tamaño para evitar que crezca con su propio lienzo.
      const visor = host.querySelector('.rend3d');
      if (visor) { visor.style.width = '420px'; visor.style.height = '640px'; visor.style.maxHeight = '640px'; }
      await fotogramas(6);
    }
    if (fallo || !host.querySelector('.rend3d--listo')) return null;
    await fotogramas(8);
    const lienzo = host.querySelector('canvas');
    if (!lienzo) return null;
    // Se compone sobre el color de la tarjeta del PDF y se comprime en JPEG: evita transparencias y reduce el peso del archivo.
    const plano = document.createElement('canvas');
    plano.width = lienzo.width; plano.height = lienzo.height;
    const g = plano.getContext('2d');
    g.fillStyle = '#F3F1FD';
    g.fillRect(0, 0, plano.width, plano.height);
    g.drawImage(lienzo, 0, 0);
    return plano.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  } finally {
    raiz.unmount();
    host.remove();
  }
}

/** Calcula, para un registro guardado, las capacidades con su nivel y color y la imagen del modelo 3D.
 * @param {Object} registro - resultado del historial.
 * @returns {Promise<{capacidades: Array<Object>, imagen: string|null}>} */
async function recursosDeRegistro(registro) {
  try {
    const flujo = ejecutarFlujoEvaluacion(datosEntradaDesdeAnalisis(analisisDesdeRegistro(registro)));
    const recomendada = flujo.etapas?.ranking?.recomendada ?? null;
    const detalles = detalleCapacidades(flujo, recomendada?.id ?? null);
    const capacidades = detalles.map(d => ({
      id: d.id,
      nombre: d.nombre,
      nivel: d.nivel ?? null,
      color: d.estado ? COLOR_ESTADO[d.estado] : (COLOR_NIVEL[d.nivel] ?? COLOR_ESTADO.sin_dato),
    }));
    const items = capacidades.map(c => ({ ...c, sinDato: c.nivel == null, lineas: [], icono: null, marca: null }));
    const sexo = registro.participante?.genero === 'femenino' ? 'femenino' : 'masculino';
    return { capacidades, imagen: await capturarCuerpo3D(sexo, items) };
  } catch {
    return { capacidades: [], imagen: null };
  }
}

/** Reúne todos los recursos que necesita generarPdfMisDatos.
 * @param {Object} datos - JSON de /arco/exportar.
 * @returns {Promise<{logo: string|null, robot: string|null, fuentes: Object, cuerpos: Array<Object>}>} */
export async function cargarRecursosPdf(datos) {
  const [logo, robot, poppins, poppinsNegrita, fredoka] = await Promise.all([
    aBase64('brand/logo-pdf.png'),
    aBase64('brand/robot.png'),
    aBase64('fonts/Poppins-Regular.ttf'),
    aBase64('fonts/Poppins-SemiBold.ttf'),
    aBase64('fonts/Fredoka-SemiBold.ttf'),
  ]);
  const cuerpos = [];
  // En serie: cada captura crea su propio contexto WebGL.
  for (const r of (datos?.resultados ?? []).filter(x => x && !x.error)) cuerpos.push(await recursosDeRegistro(r));
  return { logo, robot, fuentes: { poppins, poppinsNegrita, fredoka }, cuerpos };
}
