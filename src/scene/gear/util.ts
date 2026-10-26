import * as THREE from 'three';
import { useEffect, useMemo, useRef, type DependencyList, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ItemVisual } from '../../data/types';

export type Finish = NonNullable<ItemVisual['finish']>;

export interface GearProps {
  visual: ItemVisual;
  highlight?: boolean;
}

export interface FinishProps {
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenRoughness?: number;
  emissiveIntensity?: number;
  envMapIntensity?: number;
}

/** Map an ItemVisual finish to PBR material parameters (MeshStandard/MeshPhysical compatible). */
export function finishMaterialProps(finish: Finish | undefined = 'matte'): FinishProps {
  switch (finish) {
    case 'gloss':
      return { roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 };
    case 'metal':
      return { roughness: 0.32, metalness: 1, envMapIntensity: 1.2 };
    case 'chrome':
      return { roughness: 0.07, metalness: 1, envMapIntensity: 1.5 };
    case 'wood':
      return { roughness: 0.48, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.25 };
    case 'leather':
      return { roughness: 0.62, metalness: 0, sheen: 0.5, sheenRoughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.6 };
    case 'glow':
      return { roughness: 0.35, metalness: 0, emissiveIntensity: 2.4 };
    case 'matte':
    default:
      return { roughness: 0.82, metalness: 0 };
  }
}

const RIM_COLOR = new THREE.Color('#ffe9b0');

/** Patch a material so it gets a fresnel rim term driven by `userData.rim.uRim`. */
export function addRim<T extends THREE.MeshStandardMaterial>(m: T, color: THREE.ColorRepresentation = RIM_COLOR): T {
  const uniforms = { uRim: { value: 0 }, uRimColor: { value: new THREE.Color(color) } };
  m.userData.rim = uniforms;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = uniforms.uRim;
    shader.uniforms.uRimColor = uniforms.uRimColor;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRim;\nuniform vec3 uRimColor;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          float rimF = 1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
          totalEmissiveRadiance += uRimColor * (pow(rimF, 2.2) * 1.6 + 0.08) * uRim;
        }`,
      );
  };
  m.customProgramCacheKey = () => 'gear-rim-v1';
  return m;
}

/** Create a rim-capable physical material for a color + finish. */
export function makeMaterial(
  color: THREE.ColorRepresentation,
  finish?: Finish,
  extra: THREE.MeshPhysicalMaterialParameters = {},
): THREE.MeshPhysicalMaterial {
  const fp = finishMaterialProps(finish);
  const c = new THREE.Color(color);
  const m = new THREE.MeshPhysicalMaterial({ color: c, ...fp });
  if (finish === 'glow') m.emissive = c.clone();
  if (finish === 'leather') m.sheenColor = c.clone().lerp(new THREE.Color('#ffffff'), 0.35);
  m.setValues(extra);
  return addRim(m);
}

/** Recursively dispose geometries, materials (and their textures) and textures found in a value. */
export function disposeAll(v: unknown, depth = 0): void {
  if (!v || depth > 4) return;
  if (v instanceof THREE.BufferGeometry || v instanceof THREE.Texture) {
    v.dispose();
    return;
  }
  if (v instanceof THREE.Material) {
    for (const val of Object.values(v)) if (val instanceof THREE.Texture) val.dispose();
    v.dispose();
    return;
  }
  if (Array.isArray(v)) {
    for (const x of v) disposeAll(x, depth + 1);
    return;
  }
  if (typeof v === 'object' && (v as object).constructor === Object) {
    for (const x of Object.values(v as Record<string, unknown>)) disposeAll(x, depth + 1);
  }
}

/** useMemo that disposes everything it created when deps change / on unmount. */
export function useDisposable<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  useEffect(() => () => disposeAll(value), [value]);
  return value;
}

/** Soft emissive fresnel rim pulse on every rim-patched material under `ref`. */
export function useHighlightPulse(ref: RefObject<THREE.Object3D | null>, highlight?: boolean) {
  const level = useRef(0);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const target = highlight ? 0.6 + 0.4 * Math.sin(t * 3.4) : 0;
    const prev = level.current;
    let next = prev + (target - prev) * Math.min(1, dt * 6);
    if (!highlight && next < 0.002) next = 0;
    if (next === 0 && prev === 0) return;
    level.current = next;
    ref.current?.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!mat) return;
      for (const m of Array.isArray(mat) ? mat : [mat]) {
        const r = m.userData.rim as { uRim: { value: number } } | undefined;
        if (r) r.uRim.value = next;
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Canvas textures
// ---------------------------------------------------------------------------

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Lengthwise wood grain (grayscale-ish, multiplied with material color). Grain runs along V. */
export function woodTexture(seed = 7): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 1024);
  const r = rng(seed);
  g.fillStyle = '#f4e9da';
  g.fillRect(0, 0, 256, 1024);
  // broad bands
  for (let i = 0; i < 14; i++) {
    const x = r() * 256;
    const w = 6 + r() * 26;
    g.fillStyle = `rgba(150,105,60,${0.08 + r() * 0.12})`;
    g.fillRect(x, 0, w, 1024);
  }
  // fine wavy grain lines
  for (let i = 0; i < 90; i++) {
    const x0 = r() * 256;
    const amp = 1 + r() * 4;
    const freq = 0.002 + r() * 0.006;
    const ph = r() * 6.28;
    g.strokeStyle = `rgba(90,55,25,${0.12 + r() * 0.3})`;
    g.lineWidth = 0.6 + r() * 1.8;
    g.beginPath();
    for (let y = 0; y <= 1024; y += 8) {
      const x = x0 + Math.sin(y * freq + ph) * amp;
      if (y === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // a few knots / flecks
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(70,40,15,${0.15 + r() * 0.2})`;
    g.fillRect(r() * 256, r() * 1024, 1 + r() * 2, 4 + r() * 14);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Spiral grip-tape wrap (white stripes, multiply with color). */
export function gripTexture(): THREE.CanvasTexture {
  const [c, g] = makeCanvas(128, 512);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 512);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 3;
  for (let y = -256; y < 768; y += 22) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y + 64);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Energy streak texture for emissive maps. */
export function energyTexture(seed = 3): THREE.CanvasTexture {
  const [c, g] = makeCanvas(128, 512);
  const r = rng(seed);
  g.fillStyle = '#5a5a5a';
  g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 26; i++) {
    const x = r() * 128;
    const grad = g.createLinearGradient(x - 6, 0, x + 6, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, `rgba(255,255,255,${0.4 + r() * 0.6})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    const y = r() * 512;
    g.fillRect(x - 6, y, 12, 60 + r() * 300);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export interface LabelOpts {
  color?: string;
  width?: number;
  height?: number;
  /** Rotate the text 90deg so it reads along canvas Y (bottom → top). */
  vertical?: boolean;
  font?: string;
  outline?: string;
  oval?: boolean;
}

/** Transparent text label texture. */
export function labelTexture(text: string, opts: LabelOpts = {}): THREE.CanvasTexture {
  const { color = '#ffffff', width = 512, height = 128, vertical = false, outline, oval = false } = opts;
  const [cw, ch] = vertical ? [height, width] : [width, height];
  const [c, g] = makeCanvas(cw, ch);
  g.clearRect(0, 0, cw, ch);
  g.save();
  if (vertical) {
    g.translate(cw / 2, ch / 2);
    g.rotate(-Math.PI / 2);
    g.translate(-width / 2, -height / 2);
  }
  let size = height * 0.62;
  const family = opts.font ?? '"Bebas Neue", Impact, "Arial Black", sans-serif';
  g.font = `italic 900 ${size}px ${family}`;
  const maxW = width * (oval ? 0.72 : 0.9);
  const m = g.measureText(text);
  if (m.width > maxW) {
    size *= maxW / m.width;
    g.font = `italic 900 ${size}px ${family}`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (oval) {
    g.strokeStyle = color;
    g.lineWidth = height * 0.05;
    g.beginPath();
    g.ellipse(width / 2, height / 2, width * 0.46, height * 0.4, 0, 0, Math.PI * 2);
    g.stroke();
  }
  if (outline) {
    g.strokeStyle = outline;
    g.lineWidth = size * 0.12;
    g.lineJoin = 'round';
    g.strokeText(text, width / 2, height / 2 + size * 0.04);
  }
  g.fillStyle = color;
  g.fillText(text, width / 2, height / 2 + size * 0.04);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Radius profile with rounded (hemispherical-ish) ends; t in [0,1]. */
export function roundedEnds(t: number, capStart: number, capEnd = capStart) {
  let f = 1;
  if (t < capStart) {
    const u = 1 - t / capStart;
    f = Math.sqrt(Math.max(0, 1 - u * u));
  }
  if (t > 1 - capEnd) {
    const u = (t - (1 - capEnd)) / capEnd;
    f = Math.min(f, Math.sqrt(Math.max(0, 1 - u * u)));
  }
  return f;
}

export interface SweepOpts {
  radius: (t: number) => number;
  segments?: number;
  radial?: number;
  /** Cross-section scale along the `side` direction. */
  width?: number;
  /** Cross-section scale along the other direction. */
  depth?: number;
  /** Reference "side" vector; the cross-section's width axis is this projected perpendicular to the tangent. */
  side?: THREE.Vector3;
}

/** Sweep an elliptical, variable-radius cross section along a curve (rounded fingers, straps, plates). */
export function sweepGeometry(curve: THREE.Curve<THREE.Vector3>, o: SweepOpts): THREE.BufferGeometry {
  const segs = o.segments ?? 48;
  const radial = o.radial ?? 16;
  const w = o.width ?? 1;
  const d = o.depth ?? 1;
  const ref = (o.side ?? new THREE.Vector3(1, 0, 0)).clone().normalize();
  const len = curve.getLength();
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const P = new THREE.Vector3();
  const T = new THREE.Vector3();
  const S = new THREE.Vector3();
  const U = new THREE.Vector3();
  const N = new THREE.Vector3();
  const e = 1e-3;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T).normalize();
    S.copy(ref).addScaledVector(T, -T.dot(ref));
    if (S.lengthSq() < 1e-8) S.set(0, 0, 1).addScaledVector(T, -T.z);
    S.normalize();
    U.crossVectors(T, S).normalize();
    const r = o.radius(t);
    const slope = (o.radius(Math.min(1, t + e)) - o.radius(Math.max(0, t - e))) / ((Math.min(1, t + e) - Math.max(0, t - e)) * len);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      pos.push(
        P.x + (S.x * ca * w + U.x * sa * d) * r,
        P.y + (S.y * ca * w + U.y * sa * d) * r,
        P.z + (S.z * ca * w + U.z * sa * d) * r,
      );
      N.set(0, 0, 0).addScaledVector(S, ca / w).addScaledVector(U, sa / d).normalize();
      if (r < 1e-5) N.copy(T).multiplyScalar(i === 0 ? -1 : 1);
      else N.addScaledVector(T, -Math.max(-6, Math.min(6, slope))).normalize();
      nor.push(N.x, N.y, N.z);
      uv.push(j / radial, t);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      const b = a + row;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Ellipsoidal shell with a per-longitude bottom edge. lon = 0 → +Z, lon = +90° → +X. Angles in radians. */
export function shellGeometry(
  radii: [number, number, number],
  bottomLat: (lon: number) => number,
  lonSegs = 96,
  latSegs = 36,
): THREE.BufferGeometry {
  const [a, b, c] = radii;
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const n = new THREE.Vector3();
  for (let i = 0; i <= lonSegs; i++) {
    const lon = (i / lonSegs) * Math.PI * 2 - Math.PI;
    const bl = bottomLat(lon);
    for (let j = 0; j <= latSegs; j++) {
      const v = j / latSegs;
      const lat = Math.PI / 2 + (bl - Math.PI / 2) * v;
      const x = a * Math.cos(lat) * Math.sin(lon);
      const y = b * Math.sin(lat);
      const z = c * Math.cos(lat) * Math.cos(lon);
      pos.push(x, y, z);
      n.set(x / (a * a), y / (b * b), z / (c * c)).normalize();
      nor.push(n.x, n.y, n.z);
      uv.push(i / lonSegs, 1 - v);
    }
  }
  const row = latSegs + 1;
  for (let i = 0; i < lonSegs; i++) {
    for (let j = 0; j < latSegs; j++) {
      const p = i * row + j;
      const q = p + row;
      idx.push(p, p + 1, q, q, p + 1, q + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Point on the ellipsoid used by shellGeometry. */
export function shellPoint(radii: [number, number, number], lon: number, lat: number, scale = 1) {
  const [a, b, c] = radii;
  return new THREE.Vector3(
    a * Math.cos(lat) * Math.sin(lon) * scale,
    b * Math.sin(lat) * scale,
    c * Math.cos(lat) * Math.cos(lon) * scale,
  );
}

/** Closed curve tracing a shell's bottom edge. */
export function shellEdgeCurve(radii: [number, number, number], bottomLat: (lon: number) => number, scale = 1, n = 128) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const lon = (i / n) * Math.PI * 2 - Math.PI;
    pts.push(shellPoint(radii, lon, bottomLat(lon), scale));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}

/**
 * Cap/helmet bill. Inner edge follows a circle of radius `innerR` (centered on the origin, XZ plane),
 * spanning ±halfAngle around +Z; projects `reach` beyond. Lies in the XZ plane, thickness downward.
 */
export function brimGeometry(innerR: number, reach: number, halfAngle: number, droop: number, thickness = 0.006) {
  const shape = new THREE.Shape();
  const N = 32;
  const Wx = innerR * Math.sin(halfAngle);
  const y0 = innerR * Math.cos(halfAngle);
  // outer edge: right end → front → left end
  for (let k = 0; k <= N; k++) {
    const ang = Math.PI / 2 - (k / N) * Math.PI;
    const x = Wx * Math.sin(ang);
    const y = y0 + reach * Math.cos(ang);
    if (k === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  // inner arc back: left → right
  for (let k = 0; k <= N; k++) {
    const a = -halfAngle + (k / N) * 2 * halfAngle;
    shape.lineTo(innerR * Math.sin(a), innerR * Math.cos(a));
  }
  const bevel = Math.min(0.0025, thickness * 0.4);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 24,
  });
  g.rotateX(Math.PI / 2); // shape y → +Z, extrude → -Y
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const fx = x / Wx;
    const fz = Math.max(0, (z - y0 * 0.6) / (reach + y0 * 0.4));
    p.setY(i, p.getY(i) - droop * fx * fx * (0.4 + 0.6 * fz));
  }
  return g;
}
