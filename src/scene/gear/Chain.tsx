import * as THREE from 'three';
import { useRef } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeMaterial, useDisposable, useHighlightPulse, type GearProps } from './util';

/** Neck radius the chain is sized for. Origin = neck center at the base of the neck. */
export const CHAIN_NECK_RADIUS = 0.09;

/** Closed necklace curve: snug at the back of the neck, draping down onto the chest in front (+Z). */
export class NecklaceCurve extends THREE.Curve<THREE.Vector3> {
  R: number;
  drop: number;
  constructor(R = CHAIN_NECK_RADIUS + 0.012, drop = 0.11) {
    super();
    this.R = R;
    this.drop = drop;
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2; // a = 0 → front (+Z)
    const f = (1 + Math.cos(a)) / 2; // 1 front, 0 back
    const x = this.R * Math.sin(a) * (1 + 0.25 * f);
    const z = this.R * Math.cos(a) + 0.03 * f * f;
    const y = -this.drop * Math.pow(f, 2.4) + 0.012 * (1 - f);
    return target.set(x, y, z);
  }
}

function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  return g;
}

/** Outward direction (away from the neck axis, tilted by the chest slope) at curve param t. */
function outward(c: THREE.Curve<THREE.Vector3>, t: number, T: THREE.Vector3) {
  const p = c.getPointAt(t);
  const o = new THREE.Vector3(p.x, 0, p.z).normalize();
  // chest tilt: in front, links lie against a chest sloping forward-down
  const f = Math.max(0, o.z);
  o.y += 0.45 * f;
  o.addScaledVector(T, -T.dot(o)).normalize();
  return o;
}

export function Chain({ visual, highlight }: GearProps) {
  const variant = visual.variant ?? 'cuban';
  const finish = visual.finish ?? (variant === 'pearl' ? 'gloss' : 'metal');
  const group = useRef<THREE.Group>(null);

  const res = useDisposable(() => {
    const c = new NecklaceCurve();
    const L = c.getLength();
    const T = new THREE.Vector3();
    let body: THREE.BufferGeometry;
    const mat =
      variant === 'pearl'
        ? makeMaterial(visual.primary, finish, { roughness: 0.18, metalness: 0, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.4, sheen: 0.6, sheenColor: new THREE.Color('#ffe9f4') })
        : makeMaterial(visual.primary, finish === 'matte' || finish === 'gloss' ? 'metal' : finish);

    if (variant === 'rope') {
      // two strands twisted around the curve
      const strands: THREE.BufferGeometry[] = [];
      const N = 900;
      const twists = L / 0.007;
      for (const ph of [0, Math.PI]) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i < N; i++) {
          const t = i / N;
          const p = c.getPointAt(t);
          c.getTangentAt(t, T);
          const o = outward(c, t, T);
          const b = new THREE.Vector3().crossVectors(T, o);
          const a = t * twists * Math.PI * 2 + ph;
          pts.push(p.addScaledVector(o, Math.cos(a) * 0.0022).addScaledVector(b, Math.sin(a) * 0.0022));
        }
        strands.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), N * 2, 0.0021, 6, true));
      }
      body = merge(strands);
    } else if (variant === 'pearl') {
      const n = Math.floor(L / 0.0105);
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < n; i++) {
        const s = new THREE.SphereGeometry(0.0052, 14, 10);
        const p = c.getPointAt(i / n);
        s.translate(p.x, p.y, p.z);
        parts.push(s);
      }
      body = merge(parts);
    } else {
      // cuban: flat, chunky interlocking links
      const step = 0.0098;
      const n = Math.floor(L / step);
      const parts: THREE.BufferGeometry[] = [];
      const m = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const p = c.getPointAt(t);
        c.getTangentAt(t, T);
        const o = outward(c, t, T);
        const b = new THREE.Vector3().crossVectors(o, T);
        const tor = new THREE.TorusGeometry(0.0058, 0.0025, 8, 18);
        tor.scale(1.25, 0.8, 0.55);
        tor.rotateX((i % 2 ? 1 : -1) * 0.5);
        // local X = tangent, local Y = b (in chest plane), local Z = outward
        m.makeBasis(T, b, o).setPosition(p);
        tor.applyMatrix4(m);
        parts.push(tor);
      }
      body = merge(parts);
    }

    // Pendant (secondary color)
    let pendant: THREE.BufferGeometry | null = null;
    let gem: THREE.BufferGeometry | null = null;
    let pendantMat: THREE.MeshPhysicalMaterial | null = null;
    let gemMat: THREE.MeshPhysicalMaterial | null = null;
    if (visual.secondary) {
      const front = c.getPointAt(0);
      const parts: THREE.BufferGeometry[] = [];
      const bail = new THREE.TorusGeometry(0.0055, 0.0018, 8, 20);
      bail.rotateY(Math.PI / 2);
      bail.translate(0, -0.006, 0);
      parts.push(bail);
      // baseball-diamond shaped plate
      const sq = new THREE.Shape();
      const d = 0.019;
      sq.moveTo(0, 0);
      sq.lineTo(d, -d);
      sq.lineTo(0, -2 * d);
      sq.lineTo(-d, -d);
      sq.closePath();
      const plate = new THREE.ExtrudeGeometry(sq, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0018, bevelSegments: 3 });
      plate.translate(0, -0.012, -0.0015);
      parts.push(plate);
      pendant = merge(parts);
      pendant.rotateX(-0.42);
      pendant.translate(front.x, front.y, front.z + 0.004);
      gem = new THREE.OctahedronGeometry(0.0075, 0);
      gem.scale(1, 1, 0.6);
      gem.translate(0, -0.031, 0.004);
      gem.rotateX(-0.42);
      gem.translate(front.x, front.y, front.z + 0.004);
      pendantMat = makeMaterial(visual.secondary, 'metal', { roughness: 0.22 });
      gemMat = makeMaterial('#ffffff', 'gloss', { transmission: 0.6, thickness: 0.01, ior: 2.4, roughness: 0, iridescence: 1, metalness: 0.1, flatShading: true });
    }
    return { body, mat, pendant, gem, pendantMat, gemMat };
  }, [variant, finish, visual.primary, visual.secondary]);

  useHighlightPulse(group, highlight);

  return (
    <group ref={group}>
      <mesh geometry={res.body} material={res.mat} castShadow />
      {res.pendant && res.pendantMat && <mesh geometry={res.pendant} material={res.pendantMat} castShadow />}
      {res.gem && res.gemMat && <mesh geometry={res.gem} material={res.gemMat} />}
    </group>
  );
}
