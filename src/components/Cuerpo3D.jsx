/**
 * @module components/Cuerpo3D
 * @description Visor 3D del cuerpo que resalta cada capacidad evaluada con el color de su estado, con giro, zoom a la zona elegida y etiquetas con líneas guía.
 *
 * Principios SOLID aplicados:
 *  - S (Responsabilidad única): solo dibuja y gestiona la interacción 3D; no calcula niveles ni colores.
 *  - O (Abierto/Cerrado): se añade una zona agregando entradas a ZONAS_3D, ORDEN, ANCLAS y POSICION.
 *  - D (Inversión de dependencias): recibe colores, niveles y textos ya resueltos (items) desde MapaCorporalBrechas y notifica fallos con onError para que el padre use la silueta 2D.
 * Notas: las zonas son una metáfora visual de las 5 pruebas evaluadas; no son mediciones de músculos, órganos ni lesiones ni un diagnóstico médico.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BASE = (import.meta.env?.BASE_URL ?? '/');
const MODELOS = {
  masculino: `${BASE}models/cuerpo-hombre.glb`,
  femenino: `${BASE}models/cuerpo-mujer.glb`,
};

// Zonas como elipsoides [cx, cy, cz, rx, ry, rz] en fracciones de la estatura
// (pies y=0, cabeza y=1, centrado en x/z, frente hacia +z). Se extienden en
// profundidad para verse también en la vista posterior; medidas sobre los modelos (pose en A).
const ZONAS_3D = {
  fuerza: [
    [-0.185, 0.585, 0, 0.055, 0.095, 0.08], [0.185, 0.585, 0, 0.055, 0.095, 0.08],
    [-0.205, 0.47, 0, 0.05, 0.05, 0.06], [0.205, 0.47, 0, 0.05, 0.05, 0.06],
  ],
  fuerza_explosiva: [
    [-0.07, 0.385, 0, 0.065, 0.11, 0.12], [0.07, 0.385, 0, 0.065, 0.11, 0.12],
  ],
  vo2max: [[0, 0.745, 0, 0.13, 0.1, 0.13]],
  flexibilidad: [[0, 0.565, 0, 0.14, 0.065, 0.125]],
  equilibrio: [
    [-0.062, 0.15, 0, 0.05, 0.11, 0.075], [0.062, 0.15, 0, 0.05, 0.11, 0.075],
    [-0.07, 0.03, 0.02, 0.055, 0.035, 0.1], [0.07, 0.03, 0.02, 0.055, 0.035, 0.1],
  ],
};
const ORDEN = ['fuerza', 'fuerza_explosiva', 'vo2max', 'flexibilidad', 'equilibrio'];
const MAX_BLOBS = 12;

// Punto del cuerpo al que apunta la línea guía de cada etiqueta: [x, y, z frontal, z posterior].
const ANCLAS = {
  fuerza: [0.2, 0.55, 0.05, -0.05],
  fuerza_explosiva: [0.075, 0.4, 0.085, -0.09],
  vo2max: [-0.04, 0.755, 0.1, -0.085],
  flexibilidad: [-0.07, 0.575, 0.085, -0.095],
  equilibrio: [0.065, 0.16, 0.06, -0.06],
};
// Posición fija de cada etiqueta: lado y altura en porcentaje.
const POSICION = {
  vo2max: { lado: 'izq', top: 17 },
  flexibilidad: { lado: 'izq', top: 50 },
  fuerza: { lado: 'der', top: 24 },
  fuerza_explosiva: { lado: 'der', top: 54 },
  equilibrio: { lado: 'der', top: 80 },
};

const GRIS = new THREE.Color('#A9A4C4');

/** Inyecta en el sombreador del material el resplandor por zonas, calculado en espacio del modelo.
 * @param {THREE.Material} mat - material a modificar.
 * @param {Object} uniformes - uniformes compartidos (centros, radios, colores, intensidades). */
function prepararMaterial(mat, uniformes) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMP = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vMP;
uniform vec3 uC[${MAX_BLOBS}];
uniform vec3 uR[${MAX_BLOBS}];
uniform float uZ[${MAX_BLOBS}];
uniform vec3 uCol[5];
uniform float uInt[5];
vec4 zonaGlow(vec3 p) {
  vec3 acc = vec3(0.0); float a = 0.0;
  for (int i = 0; i < ${MAX_BLOBS}; i++) {
    vec3 q = (p - uC[i]) / uR[i];
    float d = dot(q, q);
    int z = int(uZ[i] + 0.5);
    float f = exp(-d * 2.4) * step(d, 1.7) * uInt[z];
    acc += uCol[z] * f;
    a += f;
  }
  return vec4(acc, a);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec4 zg = zonaGlow(vMP);
diffuseColor.rgb = mix(diffuseColor.rgb, zg.rgb / max(zg.a, 0.001), clamp(zg.a * 0.62, 0.0, 0.78));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += zg.rgb * 0.5;`);
  };
  mat.customProgramCacheKey = () => 'pp-zonas-v1';
}

/** Genera la textura radial del disco del piso.
 * @returns {THREE.CanvasTexture} textura con degradado cian-azul. */
function texturaSuelo() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  grad.addColorStop(0, 'rgba(34,211,238,0.55)');
  grad.addColorStop(0.55, 'rgba(47,92,232,0.16)');
  grad.addColorStop(1, 'rgba(47,92,232,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Visor 3D con modelo GLB por sexo, zonas resaltadas y etiquetas interactivas.
 * @param {Object} props
 * @param {string} props.vista - 'frontal' o 'posterior'.
 * @param {Array<Object>} props.items - capacidades con id, nombre, color, nivel, sinDato, lineas, icono y marca.
 * @param {string} props.sel - id de la zona seleccionada.
 * @param {Function} props.onSel - se invoca con el id de la zona elegida.
 * @param {number} [props.zoom=1] - factor de acercamiento a la zona seleccionada.
 * @param {boolean} [props.compacto=false] - oculta los textos de las etiquetas.
 * @param {string} [props.sexo='masculino'] - modelo a cargar ('masculino' o 'femenino').
 * @param {Function} [props.onError] - se invoca si falla WebGL o la carga del modelo.
 * @param {string} [props.etiqueta] - etiqueta accesible del visor.
 * @returns {JSX.Element} contenedor del visor. */
export default function Cuerpo3D({ vista, items, sel, onSel, zoom = 1, compacto = false, sexo = 'masculino', onError, etiqueta }) {
  const cont = useRef(null);
  const lineasRef = useRef({});
  const insigniasRef = useRef({});
  const estado = useRef({}); // el bucle de dibujo lo lee sin recrear la escena
  const [listo, setListo] = useState(false);

  // Props que el bucle consulta en cada fotograma.
  estado.current.vista = vista;
  estado.current.sel = sel;
  estado.current.zoom = zoom;
  estado.current.items = items;
  estado.current.onSel = onSel;
  estado.current.compacto = compacto;

  useEffect(() => {
    const host = cont.current;
    if (!host) return undefined;
    let vivo = true;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    } catch (e) {
      onError?.(e);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.className = 'rend3d-canvas';
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(27, 1, 0.1, 30);
    scene.add(new THREE.HemisphereLight('#ffffff', '#b6a8ff', 1.15));
    const luzClave = new THREE.DirectionalLight('#fff7ee', 2.1); luzClave.position.set(1.4, 2.2, 3); scene.add(luzClave);
    const luzCian = new THREE.DirectionalLight('#22D3EE', 1.7); luzCian.position.set(-2.4, 1.2, -1.6); scene.add(luzCian);
    const luzVioleta = new THREE.DirectionalLight('#8B7CF6', 1.2); luzVioleta.position.set(2.4, 0.6, -2); scene.add(luzVioleta);
    const luzFrente = new THREE.DirectionalLight('#dfe6ff', 0.7); luzFrente.position.set(-1.2, 0.8, 2.6); scene.add(luzFrente);

    const uC = Array.from({ length: MAX_BLOBS }, () => new THREE.Vector3(9, 9, 9));
    const uR = Array.from({ length: MAX_BLOBS }, () => new THREE.Vector3(0.01, 0.01, 0.01));
    const uZ = new Array(MAX_BLOBS).fill(0);
    let n = 0;
    ORDEN.forEach((id, zi) => ZONAS_3D[id].forEach(([cx, cy, cz, rx, ry, rz]) => {
      uC[n].set(cx, cy, cz); uR[n].set(rx, ry, rz); uZ[n] = zi; n += 1;
    }));
    const uCol = ORDEN.map(() => GRIS.clone());
    const uInt = ORDEN.map(() => 0);
    const uniformes = { uC: { value: uC }, uR: { value: uR }, uZ: { value: uZ }, uCol: { value: uCol }, uInt: { value: uInt } };

    const piso = new THREE.Group();
    const aro = (r, op) => new THREE.Mesh(new THREE.RingGeometry(r, r + 0.004, 96), new THREE.MeshBasicMaterial({ color: '#22D3EE', transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }));
    const a1 = aro(0.42, 0.55); const a2 = aro(0.3, 0.35);
    const disco = new THREE.Mesh(new THREE.CircleGeometry(0.5, 64), new THREE.MeshBasicMaterial({ map: texturaSuelo(), transparent: true, depthWrite: false }));
    [a1, a2, disco].forEach(m => { m.rotation.x = -Math.PI / 2; piso.add(m); });
    piso.position.y = 0.002;
    scene.add(piso);

    const giro = new THREE.Group();
    scene.add(giro);
    let malla = null;

    const cargador = new GLTFLoader();
    cargador.load(
      MODELOS[sexo] ?? MODELOS.masculino,
      (gltf) => {
        if (!vivo) return;
        const raiz = gltf.scene;
        raiz.updateMatrixWorld(true);
        const caja = new THREE.Box3().setFromObject(raiz);
        const alto = caja.max.y - caja.min.y;
        const centro = caja.getCenter(new THREE.Vector3());
        // Se hornea la transformación en la geometría para que las coordenadas del sombreador sean fracciones de estatura.
        const m4 = new THREE.Matrix4().makeScale(1 / alto, 1 / alto, 1 / alto)
          .multiply(new THREE.Matrix4().makeTranslation(-centro.x, -caja.min.y, -centro.z));
        raiz.traverse((o) => {
          if (!o.isMesh) return;
          const g = o.geometry.clone();
          g.applyMatrix4(o.matrixWorld);
          g.applyMatrix4(m4);
          g.computeBoundingBox(); g.computeBoundingSphere();
          const nueva = new THREE.Mesh(g, o.material);
          nueva.material.side = THREE.FrontSide;
          nueva.material.envMapIntensity = 0.6;
          prepararMaterial(nueva.material, uniformes);
          nueva.material.needsUpdate = true;
          giro.add(nueva);
          malla = nueva;
        });
        setListo(true);
      },
      undefined,
      (e) => { if (vivo) onError?.(e); },
    );

    let ancho = 1; let alto = 1;
    const medir = () => {
      const r = host.getBoundingClientRect();
      ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
      renderer.setSize(ancho, alto, false);
      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
      centrosInsignias.valido = false;
    };
    const centrosInsignias = { valido: false, p: {} };
    const ro = new ResizeObserver(medir);
    ro.observe(host);
    medir();

    let objetivoAng = 0; let ang = 0;
    let arrastre = null;
    const ray = new THREE.Raycaster();
    const puntero = new THREE.Vector2();
    const alPuntero = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    // Devuelve la zona más cercana al punto del modelo bajo el puntero, o null.
    const zonaEn = (e) => {
      if (!malla) return null;
      alPuntero(e);
      ray.setFromCamera(puntero, camara);
      const hit = ray.intersectObject(malla, false)[0];
      if (!hit) return null;
      const p = malla.worldToLocal(hit.point.clone());
      let mejor = null; let dMejor = 1.45;
      let k = 0;
      ORDEN.forEach((id) => ZONAS_3D[id].forEach(([cx, cy, cz, rx, ry, rz]) => {
        const d = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry, (p.z - cz) / rz);
        if (d < dMejor) { dMejor = d; mejor = id; }
        k += 1;
      }));
      return mejor;
    };
    const bajar = (e) => { arrastre = { x: e.clientX, mov: 0 }; renderer.domElement.setPointerCapture?.(e.pointerId); };
    const mover = (e) => {
      if (arrastre) {
        const dx = e.clientX - arrastre.x;
        arrastre.mov += Math.abs(dx); arrastre.x = e.clientX;
        objetivoAng += dx * 0.012;
      } else {
        renderer.domElement.style.cursor = zonaEn(e) ? 'pointer' : 'grab';
      }
    };
    const subir = (e) => {
      if (arrastre && arrastre.mov < 5) {
        const id = zonaEn(e);
        if (id) estado.current.onSel?.(id);
      }
      arrastre = null;
    };
    const el = renderer.domElement;
    el.style.cursor = 'grab'; el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', bajar);
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', subir);
    el.addEventListener('pointercancel', () => { arrastre = null; });

    let visible = true;
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }) : null;
    io?.observe(host);
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const reloj = new THREE.Clock();
    let camDist = 2.5; let camY = 0.5; let objY = 0.5;
    let raf = 0;
    let vistaPrevia = null;
    const v3 = new THREE.Vector3();

    // Fotograma: pausa si está fuera de vista o la pestaña oculta.
    const cuadro = () => {
      raf = requestAnimationFrame(cuadro);
      if (!visible || document.hidden) return;
      const t = reloj.getElapsedTime();
      const e = estado.current;

      if (e.vista !== vistaPrevia) {
        // Gira por el camino corto hacia la vista pedida.
        const meta = e.vista === 'posterior' ? Math.PI : 0;
        const base = Math.round((objetivoAng - meta) / (2 * Math.PI)) * 2 * Math.PI;
        objetivoAng = meta + base;
        vistaPrevia = e.vista;
      }
      ang += (objetivoAng - ang) * (reducido ? 1 : 0.12);
      giro.rotation.y = ang;
      a1.rotation.z = reducido ? 0 : t * 0.25;
      a2.rotation.z = reducido ? 0 : -t * 0.35;

      ORDEN.forEach((id, zi) => {
        const it = e.items?.find(x => x.id === id);
        if (it) uCol[zi].set(it.color);
        const apagado = !it || it.sinDato;
        const elegido = e.sel === id;
        uInt[zi] = apagado ? 0.28 : elegido ? 1.25 + (reducido ? 0 : Math.sin(t * 3.2) * 0.22) : 0.82;
      });

      // Con zoom, la cámara se acerca a la altura de la zona elegida.
      const z = Math.max(1, e.zoom);
      const frente = Math.cos(ang) >= 0; // aproximado: cara hacia la cámara
      const ancla = ANCLAS[e.sel];
      const foco = z > 1 && ancla ? Math.min(1, (z - 1) / 0.9) : 0;
      const distObj = (ancho / alto < 0.72 ? 2.7 : 2.5) / z;
      const yObj = 0.5 + ((ancla ? ancla[1] : 0.5) - 0.5) * foco;
      camDist += (distObj - camDist) * 0.12;
      camY += (yObj - camY) * 0.12;
      objY = camY;
      camara.position.set(0, objY, camDist);
      camara.lookAt(0, objY, 0);
      void frente;

      renderer.render(scene, camara);

      // Proyecta los anclajes 3D a pantalla para las líneas guía; los centros de insignias se miden solo tras invalidarse.
      if (!centrosInsignias.valido) {
        const hr = host.getBoundingClientRect();
        ORDEN.forEach((id) => {
          const b = insigniasRef.current[id];
          if (!b) return;
          const r = b.getBoundingClientRect();
          centrosInsignias.p[id] = [r.left - hr.left + r.width / 2, r.top - hr.top + r.height / 2];
        });
        centrosInsignias.valido = true;
      }
      const atras = Math.cos(ang) < 0;
      ORDEN.forEach((id) => {
        const ln = lineasRef.current[id];
        if (!ln) return;
        const a = ANCLAS[id];
        v3.set(atras ? -a[0] : a[0], a[1], atras ? a[3] : a[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).project(camara);
        const ax = (v3.x * 0.5 + 0.5) * ancho;
        const ay = (-v3.y * 0.5 + 0.5) * alto;
        const c = centrosInsignias.p[id];
        if (!c) return;
        const oculto = e.zoom > 1 && id !== e.sel;
        ln.line.setAttribute('x1', c[0]); ln.line.setAttribute('y1', c[1]);
        ln.line.setAttribute('x2', ax); ln.line.setAttribute('y2', ay);
        ln.punto.setAttribute('cx', ax); ln.punto.setAttribute('cy', ay);
        const vis = oculto || ax < 0 || ax > ancho || ay < 0 || ay > alto ? 'hidden' : 'visible';
        ln.line.style.visibility = vis; ln.punto.style.visibility = vis;
      });
    };
    cuadro();

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io?.disconnect();
      el.removeEventListener('pointerdown', bajar);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', subir);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const m = o.material;
        if (m) { [].concat(m).forEach((mm) => { Object.values(mm).forEach((v) => { if (v?.isTexture) v.dispose(); }); mm.dispose(); }); }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // La escena se crea una vez por sexo; el resto de datos llega por `estado`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sexo]);

  // Efecto sin acción: la invalidación de posiciones de insignias la realiza el ResizeObserver del bucle.
  useEffect(() => { /* sin acción */ }, [compacto, items]);

  return (
    <div className={`rend3d${compacto ? ' rend3d--compacto' : ''}${listo ? ' rend3d--listo' : ''}`} ref={cont} role="group" aria-label={etiqueta}>
      {!listo && <div className="rend3d-carga" aria-live="polite"><span className="rend3d-spin" />Cargando modelo 3D…</div>}
      <svg className="rend3d-lineas" aria-hidden="true">
        {items.map(it => (
          <g key={it.id} className={sel === it.id ? 'rend3d-lin rend3d-lin--sel' : 'rend3d-lin'}>
            <line ref={el => { (lineasRef.current[it.id] ??= {}).line = el; }} stroke={it.color} strokeWidth="1.6" strokeDasharray={sel === it.id ? '0' : '4 3'} />
            <circle ref={el => { (lineasRef.current[it.id] ??= {}).punto = el; }} r="3.6" fill={it.color} />
          </g>
        ))}
      </svg>
      {items.map(it => {
        const p = POSICION[it.id];
        const oculto = zoom > 1 && it.id !== sel;
        return (
          <button key={it.id} type="button"
            className={`rend3d-callout rend3d-callout--${p.lado}${sel === it.id ? ' rend3d-callout--sel' : ''}`}
            style={{ top: `${p.top}%`, '--cap': it.color, visibility: oculto ? 'hidden' : 'visible' }}
            onClick={() => onSel(it.id)} aria-label={`Ver ${it.nombre}: ${it.nivel ?? 'sin dato'}`} aria-pressed={sel === it.id}>
            <span className="rend3d-badge" ref={el => { insigniasRef.current[it.id] = el; }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{it.icono}</svg>
              {it.marca && (
                <i className="rend3d-marca">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke={it.color} strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">{it.marca}</svg>
                </i>
              )}
            </span>
            {!compacto && (
              <span className="rend3d-txt">
                {it.lineas.map((l, i) => <span key={i}>{l}</span>)}
                <b style={{ color: it.color }}>{it.nivel ?? 'Sin dato'}</b>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
