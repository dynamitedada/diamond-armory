import * as THREE from 'three';
import { useRef } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeMaterial, roundedEnds, sweepGeometry, useDisposable, useHighlightPulse, type GearProps } from './util';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const EYE_Y = 0.018;

function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  return g;
}

/** Wraparound shield lens: a curved band around the face with a nose notch. */
function wrapLens(A: number, R: number) {
  const cols = 64;
  const rows = 10;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const top = (a: number) => EYE_Y + 0.03 - 0.012 * (a / A) ** 2;
  const bot = (a: number) => EYE_Y - 0.022 + 0.022 * (a / A) ** 4 + 0.02 * Math.exp(-((a / 0.13) ** 2));
  for (let i = 0; i <= cols; i++) {
    const a = -A + (2 * A * i) / cols;
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      const y = bot(a) + (top(a) - bot(a)) * v;
      const bulge = 1 + 0.035 * Math.sin(v * Math.PI); // slight vertical curvature
      pos.push(R * Math.sin(a) * bulge, y, R * 1.06 * Math.cos(a) * bulge);
      uv.push(i / cols, v);
    }
  }
  const row = rows + 1;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const p = i * row + j;
      idx.push(p, p + row, p + 1, p + row, p + row + 1, p + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const topPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = -A + (2 * A * i) / 24;
    topPts.push(V(R * Math.sin(a) * 1.005, top(a) + 0.002, R * 1.06 * Math.cos(a) * 1.005));
  }
  return { lens: g, topPts };
}

function aviatorOutline(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const x = 0.029 * Math.cos(t);
    let y = Math.sin(t) >= 0 ? 0.017 * Math.sin(t) : 0.027 * Math.sin(t);
    y -= 0.007 * Math.max(0, x / 0.029) * Math.max(0, -Math.sin(t)); // teardrop: outer-bottom drop
    pts.push(new THREE.Vector2(x, y));
  }
  return pts;
}

export function Eyewear({ visual, highlight }: GearProps) {
  const variant = visual.variant ?? 'wraparound';
  const finish = visual.finish ?? (variant === 'aviator' ? 'metal' : 'gloss');
  const group = useRef<THREE.Group>(null);

  const res = useDisposable(() => {
    if (variant === 'eyeblack') {
      const parts: THREE.BufferGeometry[] = [];
      for (const s of [-1, 1]) {
        const lon = s * 24 * Math.PI / 180;
        const lat = -6 * Math.PI / 180;
        const phi = Math.PI / 2 + lon;
        const g = new THREE.SphereGeometry(0.1212, 14, 6, phi - 0.17, 0.34, Math.PI / 2 - lat - 0.055, 0.11);
        // slight downward slant at the outer edge for swagger
        g.rotateZ(-s * 0.04);
        parts.push(g);
      }
      const mat = makeMaterial(visual.primary, visual.finish ?? 'matte', {
        roughness: 0.55,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
      return { kind: 'eyeblack' as const, stripes: merge(parts), mat };
    }

    const frameColor = visual.secondary ?? (variant === 'aviator' ? '#d4af37' : '#111114');
    const frameMat = makeMaterial(frameColor, variant === 'aviator' ? (finish === 'matte' ? 'metal' : finish === 'gloss' ? 'chrome' : finish) : 'gloss');
    const lensMat = makeMaterial(visual.primary, 'chrome', {
      roughness: 0.04,
      metalness: 0.75,
      iridescence: 1,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 520],
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      clearcoat: 1,
    });

    const frames: THREE.BufferGeometry[] = [];
    let lens: THREE.BufferGeometry;
    // Temples (arms) back over the ears
    const templeFrom = (x: number, z: number) => {
      const s = Math.sign(x);
      frames.push(
        sweepGeometry(new THREE.CatmullRomCurve3([V(x, EYE_Y + 0.012, z), V(s * 0.128, EYE_Y + 0.012, z - 0.06), V(s * 0.125, EYE_Y + 0.006, -0.03), V(s * 0.112, EYE_Y - 0.02, -0.07)]), {
          radius: (t) => 0.0034 * roundedEnds(t, 0.02, 0.06),
          side: V(0, 1, 0),
          width: 1.5,
          depth: 0.7,
          segments: 30,
          radial: 10,
        }),
      );
    };

    if (variant === 'wraparound') {
      const A = 1.2;
      const R = 0.124;
      const w = wrapLens(A, R);
      lens = w.lens;
      frames.push(sweepGeometry(new THREE.CatmullRomCurve3(w.topPts), { radius: (t) => 0.0042 * roundedEnds(t, 0.02), side: V(0, 1, 0), width: 1.3, depth: 0.8, segments: 80, radial: 10 }));
      templeFrom(R * Math.sin(A) * 0.99, R * 1.06 * Math.cos(A));
      templeFrom(-R * Math.sin(A) * 0.99, R * 1.06 * Math.cos(A));
    } else {
      // aviator
      const outline = aviatorOutline();
      const lensParts: THREE.BufferGeometry[] = [];
      for (const s of [-1, 1]) {
        const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x * s, p.y)));
        const g = new THREE.ShapeGeometry(shape, 24);
        // bow the lens slightly
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, -1.2 * (p.getX(i) ** 2 + p.getY(i) ** 2));
        g.computeVertexNormals();
        const m = new THREE.Matrix4().makeRotationY(s * 0.28).setPosition(s * 0.034, EYE_Y, 0.121 - 0.004);
        g.applyMatrix4(m);
        lensParts.push(g);
        const rim = new THREE.CatmullRomCurve3(outline.map((q) => V(q.x * s, q.y, -1.2 * (q.x * q.x + q.y * q.y)).applyMatrix4(m)), true);
        frames.push(new THREE.TubeGeometry(rim, 96, 0.0018, 8, true));
        templeFrom(s * 0.064, 0.108);
      }
      lens = merge(lensParts);
      // double bridge
      for (const [y, sag] of [
        [EYE_Y + 0.013, -0.002],
        [EYE_Y + 0.004, 0.004],
      ] as const) {
        frames.push(sweepGeometry(new THREE.CatmullRomCurve3([V(-0.01, y, 0.123), V(0, y + sag, 0.126), V(0.01, y, 0.123)]), { radius: () => 0.0016, segments: 16, radial: 8 }));
      }
    }
    return { kind: 'glasses' as const, lens, frame: merge(frames), lensMat, frameMat };
  }, [variant, finish, visual.primary, visual.secondary, visual.finish]);

  useHighlightPulse(group, highlight);

  return (
    <group ref={group}>
      {res.kind === 'eyeblack' ? (
        <mesh geometry={res.stripes} material={res.mat} />
      ) : (
        <>
          <mesh geometry={res.frame} material={res.frameMat} castShadow />
          <mesh geometry={res.lens} material={res.lensMat} renderOrder={2} />
        </>
      )}
    </group>
  );
}
