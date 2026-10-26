import * as THREE from 'three';
import { useRef } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeMaterial, roundedEnds, smoothstep, sweepGeometry, useDisposable, useHighlightPulse, type GearProps } from './util';

export interface CleatProps extends GearProps {
  side: 'l' | 'r';
}

const Z0 = -0.078; // heel
const Z1 = 0.215; // toe
const SOLE_TOP = -0.07;
const SOLE_T = 0.013;

const zAt = (u: number) => Z0 + (Z1 - Z0) * u;
const halfW = (u: number) => (0.032 + 0.013 * smoothstep(0.3, 0.72, u) - 0.004 * smoothstep(0.85, 1, u)) * roundedEnds(u, 0.07, 0.17);
const xC = (u: number) => 0.006 * smoothstep(0.4, 0.9, u); // medial (+X) bias for the big toe (right foot)
const upperH = (u: number) => (0.034 + 0.034 * (1 - smoothstep(0.3, 0.92, u))) * (0.45 + 0.55 * roundedEnds(u, 0.04, 0.12));

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  return g;
}

/** Loft the upper from superellipse cross-sections (right foot). */
function upperGeometry() {
  const rings = 70;
  const N = 40;
  const n = 3.2;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const u = i / rings;
    const w = Math.max(halfW(u) - 0.0015, 0.0004);
    const h = upperH(u);
    const z = zAt(u);
    const yb = SOLE_TOP - 0.004;
    for (let j = 0; j < N; j++) {
      const a = (j / N) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const x = xC(u) + w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      // flat bottom, rounded crown
      const sy = s >= 0 ? Math.pow(s, 2 / 2.2) : -Math.pow(-s, 2 / n);
      pos.push(x, yb + h / 2 + (h / 2) * sy, z);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < N; j++) {
      const a = i * N + j;
      const b = i * N + ((j + 1) % N);
      idx.push(a, b, a + N, b, b + N, a + N);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function footprintShape(margin: number) {
  const s = new THREE.Shape();
  const K = 60;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= K; i++) {
    const u = i / K;
    pts.push(new THREE.Vector2(xC(u) + halfW(u) + margin * roundedEnds(u, 0.05), zAt(u) + (i === K ? margin : 0)));
  }
  for (let i = K; i >= 0; i--) {
    const u = i / K;
    pts.push(new THREE.Vector2(xC(u) - halfW(u) - margin * roundedEnds(u, 0.05), zAt(u) - (i === 0 ? margin : 0)));
  }
  s.setFromPoints(pts);
  return s;
}

export function Cleats({ visual, highlight, side }: CleatProps) {
  const variant = visual.variant ?? 'low';
  const finish = visual.finish ?? 'gloss';
  const secondary = visual.secondary ?? '#f2f2f2';
  const group = useRef<THREE.Group>(null);

  const res = useDisposable(() => {
    const upper = upperGeometry();
    const upperMat = makeMaterial(visual.primary, finish);

    // Sole plate
    const sole = new THREE.ExtrudeGeometry(footprintShape(0.003), {
      depth: SOLE_T - 0.004,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 3,
      curveSegments: 4,
    });
    sole.rotateX(Math.PI / 2);
    sole.translate(0, SOLE_TOP - 0.002, 0);
    const soleMat = makeMaterial(secondary, 'gloss', { roughness: 0.4 });
    // Midsole accent line (white-ish contrast)
    const mid = new THREE.ExtrudeGeometry(footprintShape(0.0035), { depth: 0.003, bevelEnabled: false, curveSegments: 4 });
    mid.rotateX(Math.PI / 2);
    mid.translate(0, SOLE_TOP + 0.001, 0);
    const midMat = makeMaterial('#f4f4f4', 'matte');

    // Spikes
    const spikes: THREE.BufferGeometry[] = [];
    const bottom = SOLE_TOP - SOLE_T;
    const spots: [number, number][] = [
      [0.1, -0.6], [0.1, 0.6], [0.2, 0], [0.5, -0.65], [0.5, 0.65], [0.66, -0.75], [0.66, 0.75], [0.66, 0], [0.82, -0.6], [0.82, 0.6], [0.95, 0],
    ];
    for (const [u, f] of spots) {
      const c = new THREE.CylinderGeometry(0.006, 0.003, 0.016, 12, 1);
      c.translate(xC(u) + f * halfW(u), bottom - 0.007, zAt(u));
      spikes.push(c);
    }
    const spikeGeo = merge(spikes);
    const spikeMat = makeMaterial(secondary, 'metal', { roughness: 0.35 });

    // Accents (secondary): side stripes, heel tab, laces, collar
    const acc: THREE.BufferGeometry[] = [];
    const dark: THREE.BufferGeometry[] = [];
    for (const sgn of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) {
        const u = 0.1 + 0.52 * (k / 10);
        const y = SOLE_TOP + 0.012 + upperH(u) * (0.55 - 0.25 * Math.sin((k / 10) * Math.PI)) * (0.4 + 0.6 * (k / 10));
        pts.push(V(xC(u) + sgn * (halfW(u) - 0.0005), y, zAt(u)));
      }
      acc.push(
        sweepGeometry(new THREE.CatmullRomCurve3(pts), {
          radius: (t) => (0.003 + 0.007 * Math.sin(t * Math.PI * 0.85)) * roundedEnds(t, 0.08, 0.2),
          side: V(0, 1, 0),
          width: 1,
          depth: 0.22,
          segments: 40,
          radial: 12,
        }),
      );
    }
    const heel = new THREE.BoxGeometry(0.022, 0.05, 0.008, 1, 1, 1);
    heel.translate(0, SOLE_TOP + 0.03, Z0 + 0.001);
    acc.push(heel);
    // tongue + laces
    const topAt = (u: number) => SOLE_TOP - 0.004 + upperH(u);
    const tongue: THREE.Vector3[] = [];
    for (let k = 0; k <= 6; k++) {
      const u = 0.36 + 0.4 * (k / 6);
      tongue.push(V(xC(u), topAt(u) + 0.001, zAt(u)));
    }
    const tongueGeo = sweepGeometry(new THREE.CatmullRomCurve3(tongue), {
      radius: (t) => 0.016 * roundedEnds(t, 0.15, 0.25),
      side: V(1, 0, 0),
      width: 1,
      depth: 0.22,
      segments: 30,
      radial: 14,
    });
    for (let k = 0; k < 5; k++) {
      const u = 0.42 + 0.075 * k;
      const y = topAt(u) + 0.004;
      const lace = sweepGeometry(new THREE.CatmullRomCurve3([V(xC(u) - 0.015, y - 0.004, zAt(u)), V(xC(u), y + 0.0005, zAt(u) + 0.002), V(xC(u) + 0.015, y - 0.004, zAt(u))]), {
        radius: (t) => 0.0022 * roundedEnds(t, 0.15),
        side: V(0, 0, 1),
        width: 1.6,
        depth: 0.7,
        segments: 10,
        radial: 6,
      });
      acc.push(lace);
    }
    // Collar opening
    const collarZ = zAt(0.2);
    const collarPts: THREE.Vector3[] = [];
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      const z = collarZ + Math.sin(a) * 0.052;
      const u = (z - Z0) / (Z1 - Z0);
      collarPts.push(V(xC(u) + Math.cos(a) * 0.026, topAt(Math.max(0.02, u)) + 0.003, z));
    }
    const collar = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(collarPts, true), 80, 0.0055, 10, true);
    const hole = new THREE.CircleGeometry(1, 32);
    hole.rotateX(-Math.PI / 2);
    hole.scale(0.025, 1, 0.05);
    hole.translate(xC(0.2), topAt(0.2) + 0.0035, collarZ);
    dark.push(hole);

    // Mid / high cuff around the ankle
    let cuff: THREE.BufferGeometry | null = null;
    if (variant === 'mid' || variant === 'high') {
      const top = variant === 'high' ? 0.075 : 0.03;
      const prof: THREE.Vector2[] = [];
      const y0 = topAt(0.2) - 0.02;
      for (let k = 0; k <= 12; k++) {
        const y = y0 + (top - y0) * (k / 12);
        prof.push(new THREE.Vector2(0.05 - 0.008 * Math.sin((k / 12) * Math.PI * 0.8), y));
      }
      // rolled top lip
      for (let k = 1; k <= 6; k++) {
        const a = (k / 6) * Math.PI;
        prof.push(new THREE.Vector2(0.046 - 0.005 + Math.cos(a) * 0.005 * -1 + 0.005, top + Math.sin(a) * 0.006));
      }
      cuff = new THREE.LatheGeometry(prof, 48);
      cuff.scale(0.72, 1, 1);
      cuff.translate(xC(0.2), 0, collarZ + 0.004);
      const strapY = variant === 'high' ? 0.03 : 0.008;
      const strap = new THREE.CylinderGeometry(0.0505, 0.0505, 0.016, 32, 1, true, -0.9, 1.8);
      strap.scale(0.74, 1, 1.02);
      strap.translate(xC(0.2), strapY, collarZ + 0.004);
      acc.push(strap);
    }

    return {
      upper,
      upperMat,
      sole,
      soleMat,
      mid,
      midMat,
      spikeGeo,
      spikeMat,
      accents: merge(acc),
      accentMat: makeMaterial(secondary, finish === 'matte' ? 'matte' : 'gloss'),
      tongue: tongueGeo,
      collar,
      collarMat: makeMaterial(new THREE.Color(visual.primary).multiplyScalar(0.55), 'matte'),
      dark: merge(dark),
      darkMat: makeMaterial('#0d0d10', 'matte'),
      cuff,
      cuffMat: makeMaterial(visual.primary, finish, { side: THREE.DoubleSide }),
    };
  }, [variant, finish, visual.primary, secondary]);

  useHighlightPulse(group, highlight);

  return (
    <group ref={group} scale={[side === 'l' ? -1 : 1, 1, 1]}>
      <mesh geometry={res.upper} material={res.upperMat} castShadow receiveShadow />
      <mesh geometry={res.sole} material={res.soleMat} castShadow receiveShadow />
      <mesh geometry={res.mid} material={res.midMat} />
      <mesh geometry={res.spikeGeo} material={res.spikeMat} castShadow />
      <mesh geometry={res.accents} material={res.accentMat} castShadow />
      <mesh geometry={res.tongue} material={res.upperMat} castShadow />
      <mesh geometry={res.collar} material={res.collarMat} castShadow />
      <mesh geometry={res.dark} material={res.darkMat} />
      {res.cuff && <mesh geometry={res.cuff} material={res.cuffMat} castShadow />}
    </group>
  );
}
