import * as THREE from 'three';
import { useRef } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeMaterial, roundedEnds, sweepGeometry, useDisposable, useHighlightPulse, type GearProps } from './util';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const curve = (...p: THREE.Vector3[]) => new THREE.CatmullRomCurve3(p, false, 'centripetal');

function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  return g;
}

/** Small lace "stitch" loops sitting along a curve, alternating over/under. */
function laceStitches(c: THREE.Curve<THREE.Vector3>, count: number, size: number, normalHint: THREE.Vector3) {
  const parts: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = c.getPointAt(t);
    c.getTangentAt(t, T);
    N.copy(normalHint).addScaledVector(T, -T.dot(normalHint)).normalize();
    B.crossVectors(T, N);
    const tor = new THREE.TorusGeometry(size, size * 0.32, 6, 14);
    tor.scale(1, 0.55, 1);
    // torus lies in XY → orient: X along T, Y along N
    m.makeBasis(T, N, B).setPosition(p);
    tor.applyMatrix4(m);
    parts.push(tor);
  }
  return merge(parts);
}

/**
 * Palm "bowl": back half is a plain ellipsoid, the front (+Z) half is pushed in to form a concave pocket.
 * Vertex colors darken the pocket center.
 */
function bowlGeometry(rx: number, ry: number, back: number, rimLift: number, cx = 0, cy = 0) {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const p = g.attributes.position;
  const col: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    let nz: number;
    let shade = 1;
    if (z > 0) {
      // rolled lip near the rim, then dipping into a concave pocket toward the center
      nz = z < 0.35 ? rimLift * Math.sin((z / 0.35) * (Math.PI / 2)) : rimLift * (1 - 1.15 * smooth((z - 0.35) / 0.65));
      shade = 1 - 0.36 * smooth(Math.max(0, (z - 0.3) / 0.7));
    } else nz = z * back;
    p.setXYZ(i, x * rx + cx, y * ry + cy, nz);
    col.push(shade, shade, shade);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
const smooth = (x: number) => x * x * (3 - 2 * x);

interface FingerDef {
  base: THREE.Vector3;
  len: number;
  r: number;
  splay: number; // x drift at tip
  curl: number; // +z at tip
}

export function Glove({ visual, highlight }: GearProps) {
  const variant = visual.variant ?? 'infield';
  const finish = visual.finish ?? 'leather';
  const lace = visual.secondary ?? '#3a2312';
  const group = useRef<THREE.Group>(null);

  const res = useDisposable(() => {
    const leather = makeMaterial(visual.primary, finish);
    const pocket = makeMaterial(visual.primary, finish, { vertexColors: true });
    const laceMat = makeMaterial(lace, 'leather', { roughness: 0.55 });
    const binding = makeMaterial(new THREE.Color(lace).lerp(new THREE.Color(visual.primary), 0.25), 'leather');
    const patchMat = makeMaterial('#f2f2f2', 'gloss');

    const shells: THREE.BufferGeometry[] = []; // leather
    const laces: THREE.BufferGeometry[] = [];
    const binds: THREE.BufferGeometry[] = [];
    const pockets: THREE.BufferGeometry[] = [];
    const patches: THREE.BufferGeometry[] = [];

    const mitt = variant === 'catcher' || variant === 'first-base';

    if (!mitt) {
      const outfield = variant === 'outfield';
      const L = outfield ? 0.19 : 0.145;
      // Palm / back: a bowled ellipsoid
      pockets.push(bowlGeometry(0.097, outfield ? 0.118 : 0.108, 0.028, 0.017, 0.004, 0.002));
      {
        const ry = outfield ? 0.118 : 0.108;
        const ring: THREE.Vector3[] = [];
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          ring.push(V(0.004 + Math.cos(a) * 0.097 * 0.955, 0.002 + Math.sin(a) * ry * 0.955, 0.013));
        }
        const rc = new THREE.CatmullRomCurve3(ring, true);
        binds.push(new THREE.TubeGeometry(rc, 128, 0.0045, 8, true));
        laces.push(laceStitches(rc, 26, 0.0062, V(0, 0, 1)));
      }
      // Heel roll at the hand opening
      const heelCurve = curve(V(-0.08, -0.085, 0.004), V(-0.04, -0.104, 0.03), V(0.01, -0.11, 0.036), V(0.06, -0.1, 0.026), V(0.088, -0.078, 0.0));
      shells.push(sweepGeometry(heelCurve, { radius: (t) => 0.019 * roundedEnds(t, 0.08), side: V(0, 0, 1), width: 1.1, depth: 1, segments: 40, radial: 18 }));
      binds.push(sweepGeometry(curve(V(-0.082, -0.1, -0.012), V(-0.03, -0.122, -0.006), V(0.03, -0.124, -0.008), V(0.088, -0.096, -0.018)), {
        radius: (t) => 0.007 * roundedEnds(t, 0.06), segments: 36, radial: 10,
      }));
      // Logo patch on the heel roll
      const patch = new THREE.CylinderGeometry(0.011, 0.011, 0.004, 28);
      patch.rotateX(Math.PI / 2);
      patch.scale(1.5, 0.75, 1);
      patch.translate(0.01, -0.106, 0.054);
      patches.push(patch);

      // Fingers (thumb at -X, pinky at +X), palm facing +Z, curling toward +Z
      const fingers: FingerDef[] = [
        { base: V(-0.046, 0.07, 0.0), len: L * 0.98, r: 0.0225, splay: -0.022, curl: 0.03 }, // index
        { base: V(-0.01, 0.078, 0.0), len: L * 1.06, r: 0.023, splay: -0.006, curl: 0.034 },
        { base: V(0.026, 0.075, 0.0), len: L * 1.0, r: 0.0225, splay: 0.012, curl: 0.032 },
        { base: V(0.061, 0.06, 0.0), len: L * 0.86, r: 0.0235, splay: 0.03, curl: 0.026 }, // pinky
      ];
      const tips: THREE.Vector3[] = [];
      fingers.forEach((f, i) => {
        const b = f.base;
        const c = curve(
          V(b.x * 0.8, b.y - 0.085, -0.02),
          V(b.x * 0.92, b.y - 0.02, -0.012),
          V(b.x + f.splay * 0.35, b.y + f.len * 0.4, b.z + f.curl * 0.15),
          V(b.x + f.splay * 0.75, b.y + f.len * 0.78, b.z + f.curl * 0.55),
          V(b.x + f.splay, b.y + f.len, b.z + f.curl),
        );
        shells.push(sweepGeometry(c, { radius: (t) => f.r * (1 - 0.12 * t) * roundedEnds(t, 0.04, 0.12), width: 0.98, depth: 0.85, segments: 48, radial: 20 }));
        // welt/binding line up the back seam of each finger
        const top = c.getPointAt(0.97);
        tips.push(top);
        // lace laced along finger sides
        if (i < 3) {
          const nb = fingers[i + 1];
          const mid = curve(
            V((b.x + nb.base.x) / 2, b.y + 0.005, -0.004),
            V((b.x + nb.base.x) / 2 + (f.splay + nb.splay) * 0.25, b.y + (f.len + nb.len) * 0.3, (f.curl + nb.curl) * 0.08),
            V((b.x + nb.base.x) / 2 + (f.splay + nb.splay) * 0.42, b.y + (f.len + nb.len) * 0.42, (f.curl + nb.curl) * 0.2),
          );
          laces.push(laceStitches(mid, 6, 0.0085, V(0, 0, 1)));
        }
      });
      // Lace tying finger tips together
      const tipCurve = curve(...tips.map((p) => p.clone().add(V(0, 0.004, -0.004))));
      laces.push(sweepGeometry(tipCurve, { radius: () => 0.0042, segments: 60, radial: 8 }));
      laces.push(laceStitches(tipCurve, 9, 0.009, V(0, 1, 0)));
      // knot tails
      laces.push(sweepGeometry(curve(V(0.087, 0.2 * (L / 0.145) * 0.85, 0.02), V(0.1, 0.17, 0.04), V(0.11, 0.13, 0.05)), { radius: (t) => 0.0035 * roundedEnds(t, 0.05), segments: 16, radial: 6 }));

      // Thumb
      const thumb = curve(V(-0.07, -0.05, 0.004), V(-0.098, 0.0, 0.012), V(-0.112, 0.055, 0.024), V(-0.108, 0.1, 0.036));
      shells.push(sweepGeometry(thumb, { radius: (t) => 0.024 * (1 - 0.15 * t) * roundedEnds(t, 0.05, 0.14), width: 0.95, depth: 0.78, segments: 40, radial: 20 }));
      binds.push(sweepGeometry(curve(V(-0.09, -0.06, -0.012), V(-0.118, 0.0, -0.004), V(-0.13, 0.06, 0.012), V(-0.122, 0.108, 0.03)), {
        radius: (t) => 0.0055 * roundedEnds(t, 0.05), segments: 30, radial: 8,
      }));

      // Web between thumb and index: H/basket web of leather strips + laces
      const webTop = outfield ? 0.2 : 0.17;
      const left = (y: number) => thumb.getPointAt(Math.min(1, Math.max(0, (y + 0.05) / 0.155)));
      const right = (y: number) => V(-0.055 - 0.02 * ((y - 0.07) / 0.1), y, 0.008 + 0.02 * ((y - 0.07) / 0.1));
      const rows = outfield ? 4 : 3;
      for (let k = 0; k < rows; k++) {
        const y = 0.06 + ((webTop - 0.06) * (k + 0.5)) / rows;
        const a = left(Math.min(y, 0.1)).add(V(0.008, 0, 0));
        a.y = y;
        const b = right(y);
        const mid = a.clone().lerp(b, 0.5).add(V(0, 0, 0.012));
        shells.push(sweepGeometry(curve(a, mid, b), { radius: (t) => 0.0085 * roundedEnds(t, 0.1), width: 0.6, depth: 1.25, side: V(0, 0, 1), segments: 20, radial: 12 }));
      }
      // vertical web posts
      for (const fx of [0.3, 0.7]) {
        const pts = [] as THREE.Vector3[];
        for (let k = 0; k <= 4; k++) {
          const y = 0.06 + ((webTop - 0.06) * k) / 4;
          const a = left(Math.min(y, 0.1)).add(V(0.008, 0, 0));
          a.y = y;
          pts.push(a.lerp(right(y), fx).add(V(0, 0, 0.016)));
        }
        laces.push(sweepGeometry(curve(...pts), { radius: () => 0.0035, segments: 30, radial: 8 }));
        laces.push(laceStitches(curve(...pts), rows + 1, 0.007, V(0, 0, 1)));
      }
    } else {
      const catcher = variant === 'catcher';
      const rx = catcher ? 0.135 : 0.105;
      const ry = catcher ? 0.14 : 0.165;
      const cy = catcher ? 0.045 : 0.06;
      pockets.push(bowlGeometry(rx, ry, 0.05, 0.03, 0, cy));
      // Thick padded rim roll
      const rim: THREE.Vector3[] = [];
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        rim.push(V(Math.cos(a) * rx * 0.97, cy + Math.sin(a) * ry * 0.97, 0.012 + 0.012 * Math.max(0, Math.sin(a))));
      }
      const rimCurve = new THREE.CatmullRomCurve3(rim, true);
      shells.push(new THREE.TubeGeometry(rimCurve, 128, catcher ? 0.03 : 0.022, 18, true));
      binds.push(new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(rim.map((p) => V(p.x * 1.08, cy + (p.y - cy) * 1.07, p.z - 0.012)), true),
        128, 0.006, 8, true,
      ));
      laces.push(laceStitches(new THREE.CatmullRomCurve3(rim.map((p) => V(p.x * 1.0, p.y, p.z + (catcher ? 0.028 : 0.021))), true), catcher ? 34 : 30, 0.009, V(0, 0, 1)));
      // Deep pocket
      // Web at top-left (thumb side) + thumb pad
      const webC = V(-rx * 0.45, cy + ry * 0.62, 0.03);
      for (let k = 0; k < 3; k++) {
        const y = webC.y - 0.03 + k * 0.03;
        shells.push(sweepGeometry(curve(V(-rx * 0.85, y - 0.01, 0.02), V(-rx * 0.48, y + 0.004, 0.04), V(-rx * 0.1, y + 0.02, 0.03)), {
          radius: (t) => 0.009 * roundedEnds(t, 0.1), width: 0.6, depth: 1.2, side: V(0, 0, 1), segments: 20, radial: 12,
        }));
      }
      laces.push(laceStitches(curve(V(-rx * 0.66, webC.y - 0.05, 0.05), V(-rx * 0.46, webC.y + 0.05, 0.05)), 5, 0.008, V(0, 0, 1)));
      const thumb = curve(V(-rx * 0.6, cy - ry * 0.5, 0.02), V(-rx * 1.02, cy - 0.01, 0.022), V(-rx * 0.98, cy + ry * 0.45, 0.03));
      shells.push(sweepGeometry(thumb, { radius: (t) => 0.024 * roundedEnds(t, 0.08, 0.15), width: 0.9, depth: 0.85, segments: 32, radial: 16 }));
      // Lace lines up the face (finger stalls hint)
      for (const fx of catcher ? [0.25, 0.55] : [0.3, 0.62]) {
        const c = curve(V(rx * fx, cy - ry * 0.15, 0.035), V(rx * fx + 0.01, cy + ry * 0.45, 0.04), V(rx * fx + 0.006, cy + ry * 0.85, 0.03));
        laces.push(laceStitches(c, 5, 0.0075, V(0, 0, 1)));
      }
      const patch = new THREE.CylinderGeometry(0.02, 0.02, 0.004, 28);
      patch.rotateX(Math.PI / 2);
      patch.scale(1.5, 0.75, 1);
      patch.translate(rx * 0.15, cy - ry * 0.9, 0.05);
      patches.push(patch);
    }

    return {
      leather: merge(shells),
      laces: laces.length ? merge(laces) : null,
      binding: binds.length ? merge(binds) : null,
      pocket: merge(pockets),
      patch: merge(patches),
      leatherMat: leather,
      pocketMat: pocket,
      laceMat,
      bindMat: binding,
      patchMat,
    };
  }, [variant, finish, visual.primary, lace]);

  useHighlightPulse(group, highlight);

  return (
    <group ref={group}>
      <mesh geometry={res.leather} material={res.leatherMat} castShadow receiveShadow />
      <mesh geometry={res.pocket} material={res.pocketMat} receiveShadow />
      {res.laces && <mesh geometry={res.laces} material={res.laceMat} castShadow />}
      {res.binding && <mesh geometry={res.binding} material={res.bindMat} castShadow />}
      <mesh geometry={res.patch} material={res.patchMat} />
    </group>
  );
}
