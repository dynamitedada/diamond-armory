import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  energyTexture,
  gripTexture,
  labelTexture,
  makeMaterial,
  smoothstep,
  useDisposable,
  useHighlightPulse,
  woodTexture,
  type Finish,
  type GearProps,
} from './util';

interface BatSpec {
  L: number; // overall length (m)
  knobR: number;
  handleR: number;
  barrelR: number;
  taperStart: number; // fraction of L
  barrelStart: number; // fraction of L
  cup: boolean;
}

const CLASSIC: BatSpec = { L: 0.84, knobR: 0.0235, handleR: 0.0122, barrelR: 0.0331, taperStart: 0.3, barrelStart: 0.62, cup: true };

export const BAT_SPECS: Record<string, BatSpec> = {
  classic: CLASSIC,
  barrel: { L: 0.82, knobR: 0.026, handleR: 0.0138, barrelR: 0.0425, taperStart: 0.25, barrelStart: 0.54, cup: false },
  thin: { L: 0.86, knobR: 0.0215, handleR: 0.0108, barrelR: 0.0272, taperStart: 0.33, barrelStart: 0.68, cup: true },
  fungo: { L: 0.94, knobR: 0.021, handleR: 0.0104, barrelR: 0.0238, taperStart: 0.22, barrelStart: 0.74, cup: false },
  spiked: CLASSIC,
  neon: { ...CLASSIC, cup: false },
};

/** Distance from the bottom of the knob to the grip-center origin. */
export const BAT_GRIP_OFFSET = 0.075;

/** Radius of the bat body at distance t (m) from the knob bottom (body region only). */
function bodyRadius(s: BatSpec, t: number) {
  const a = s.taperStart * s.L;
  const b = s.barrelStart * s.L;
  const handle = s.handleR * (1 + 0.12 * Math.min(1, t / a));
  const k = smoothstep(a, b, t);
  // ease-in so the taper flares late like a real bat
  const r = handle + (s.barrelR - handle) * Math.pow(k, 1.25);
  return r;
}

/** Lathe profile (Vector2(r, y)) with y measured from the knob bottom. */
export function batProfile(s: BatSpec): THREE.Vector2[] {
  const P: THREE.Vector2[] = [];
  const v = (r: number, y: number) => P.push(new THREE.Vector2(r, y));
  const kr = s.knobR;
  // knob: flat-ish bottom with rounded edge, then a neck flaring into the handle
  v(0, 0);
  v(kr * 0.55, 0);
  v(kr * 0.85, 0.0012);
  v(kr * 0.97, 0.004);
  v(kr, 0.008);
  v(kr * 0.97, 0.0115);
  v(kr * 0.86, 0.0145);
  v(s.handleR * 1.45, 0.019);
  v(s.handleR * 1.15, 0.025);
  v(s.handleR * 1.03, 0.034);
  const endRound = s.barrelR * 0.55;
  const bodyEnd = s.L - endRound;
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const t = 0.042 + (bodyEnd - 0.042) * (i / steps);
    v(bodyRadius(s, t), t);
  }
  const R = bodyRadius(s, bodyEnd);
  if (s.cup) {
    // rounded rim then a shallow cupped end
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      v(R * (0.82 + 0.18 * Math.cos(a)), bodyEnd + endRound * Math.sin(a));
    }
    v(R * 0.74, s.L - 0.002);
    v(R * 0.62, s.L - 0.009);
    v(R * 0.4, s.L - 0.0135);
    v(0, s.L - 0.015);
  } else {
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * (Math.PI / 2);
      v(R * Math.cos(a), bodyEnd + endRound * Math.sin(a));
    }
  }
  return P;
}

function subProfile(s: BatSpec, t0: number, t1: number, inflate: number, steps = 40) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (t1 - t0) * (i / steps);
    pts.push(new THREE.Vector2(bodyRadius(s, t) + inflate, t));
  }
  return pts;
}

function defaultFinish(variant: string): Finish {
  switch (variant) {
    case 'barrel':
      return 'metal';
    case 'neon':
      return 'glow';
    case 'spiked':
      return 'matte';
    default:
      return 'wood';
  }
}

export function Bat({ visual, highlight }: GearProps) {
  const variant = visual.variant && visual.variant in BAT_SPECS ? visual.variant : 'classic';
  const spec = BAT_SPECS[variant];
  const finish: Finish = visual.finish ?? defaultFinish(variant);
  const secondary = visual.secondary ?? (finish === 'wood' ? '#1b1b1f' : '#f5f5f5');
  const group = useRef<THREE.Group>(null);
  const neon = variant === 'neon' || finish === 'glow';

  const res = useDisposable(() => {
    const body = new THREE.LatheGeometry(batProfile(spec), 56);
    const gripT0 = 0.03;
    const gripT1 = spec.L * (variant === 'fungo' ? 0.24 : 0.3);
    const grip = new THREE.LatheGeometry(subProfile(spec, gripT0, gripT1, 0.0014, 30), 48);
    const labelLen = Math.min(0.17, spec.L * (1 - spec.barrelStart) - spec.barrelR * 0.9);
    const labelC = spec.L - spec.barrelR * 0.55 - labelLen / 2 - 0.035;
    const label = new THREE.LatheGeometry(
      subProfile(spec, labelC - labelLen / 2, labelC + labelLen / 2, 0.0004, 16),
      20,
      -0.62,
      1.24,
    );

    const bodyMat = makeMaterial(visual.primary, finish);
    if (finish === 'wood') {
      bodyMat.map = woodTexture(variant.length * 13 + 5);
    }
    if (neon) {
      bodyMat.emissive = new THREE.Color(visual.primary);
      bodyMat.emissiveMap = energyTexture();
      bodyMat.emissiveIntensity = 2.4;
      bodyMat.color = new THREE.Color(visual.primary).multiplyScalar(0.4);
      bodyMat.roughness = 0.25;
      bodyMat.clearcoat = 1;
      bodyMat.toneMapped = false;
    }
    const gripMat = makeMaterial(secondary, 'matte', { map: gripTexture(), roughness: 0.9 });

    let labelMat: THREE.MeshPhysicalMaterial | null = null;
    if (visual.text) {
      const engraved = finish === 'wood';
      const lum = new THREE.Color(visual.primary).getHSL({ h: 0, s: 0, l: 0 }).l;
      const color = engraved ? (lum < 0.3 ? (visual.secondary ?? '#d9b46a') : '#2a1607') : neon ? '#ffffff' : secondary;
      labelMat = makeMaterial(color, engraved ? 'matte' : 'gloss', {
        map: labelTexture(visual.text, { color: '#ffffff', vertical: true, oval: engraved, width: 640, height: 128 }),
        transparent: true,
        opacity: engraved ? 0.82 : 1,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        roughness: engraved ? 0.9 : 0.3,
      });
      if (neon) {
        labelMat.emissive = new THREE.Color('#ffffff');
        labelMat.emissiveIntensity = 1.5;
        labelMat.emissiveMap = labelMat.map;
        labelMat.toneMapped = false;
      }
    }

    // Spiked novelty bat: studs + barbed wire wrap
    let studs: THREE.BufferGeometry | null = null;
    let wire: THREE.BufferGeometry | null = null;
    let studMat: THREE.MeshPhysicalMaterial | null = null;
    if (variant === 'spiked') {
      const parts: THREE.BufferGeometry[] = [];
      const rings = 6;
      const t0 = spec.L * spec.barrelStart - 0.02;
      const t1 = spec.L - 0.05;
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < rings; i++) {
        const t = t0 + ((t1 - t0) * i) / (rings - 1);
        const r = bodyRadius(spec, t);
        const n = 7;
        for (let j = 0; j < n; j++) {
          const a = (j / n) * Math.PI * 2 + (i % 2) * (Math.PI / n);
          const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
          const cone = new THREE.ConeGeometry(0.0072, 0.032, 12, 1);
          cone.translate(0, 0.016, 0);
          const base = new THREE.CylinderGeometry(0.0078, 0.0085, 0.004, 14);
          base.translate(0, 0.001, 0);
          q.setFromUnitVectors(up, dir);
          m.compose(dir.clone().multiplyScalar(r - 0.001).setY(t), q, new THREE.Vector3(1, 1, 1));
          cone.applyMatrix4(m);
          base.applyMatrix4(m);
          parts.push(cone, base);
        }
      }
      studs = mergeGeometries(parts.map((p) => p.toNonIndexed()));
      parts.forEach((p) => p.dispose());
      // barbed wire helix around the taper/barrel
      const pts: THREE.Vector3[] = [];
      const wt0 = spec.L * spec.taperStart + 0.02;
      const wt1 = spec.L * spec.barrelStart + 0.01;
      for (let i = 0; i <= 160; i++) {
        const u = i / 160;
        const t = wt0 + (wt1 - wt0) * u;
        const a = u * Math.PI * 2 * 4;
        const r = bodyRadius(spec, t) + 0.0022;
        pts.push(new THREE.Vector3(Math.sin(a) * r, t, Math.cos(a) * r));
      }
      wire = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.0016, 6);
      studMat = makeMaterial(visual.secondary ?? '#c9ced6', 'chrome');
    }

    // Neon bat: soft additive glow shell
    let glow: THREE.MeshBasicMaterial | null = null;
    if (neon) {
      glow = new THREE.MeshBasicMaterial({
        color: new THREE.Color(visual.secondary ?? visual.primary),
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
        toneMapped: false,
      });
    }

    return { body, grip, label, bodyMat, gripMat, labelMat, studs, wire, studMat, glow };
  }, [variant, finish, visual.primary, secondary, visual.secondary, visual.text, neon, spec]);

  useHighlightPulse(group, highlight);
  useFrame((state) => {
    if (!neon) return;
    const t = state.clock.elapsedTime;
    res.bodyMat.emissiveIntensity = 2.1 + 0.6 * Math.sin(t * 2.6) + 0.25 * Math.sin(t * 7.3);
    if (res.bodyMat.emissiveMap) res.bodyMat.emissiveMap.offset.y = (t * 0.25) % 1;
    if (res.glow) res.glow.opacity = 0.14 + 0.08 * Math.sin(t * 2.6);
  });

  return (
    <group ref={group}>
      <group position={[0, -BAT_GRIP_OFFSET, 0]}>
        <mesh geometry={res.body} material={res.bodyMat} castShadow receiveShadow />
        <mesh geometry={res.grip} material={res.gripMat} castShadow />
        {res.labelMat && <mesh geometry={res.label} material={res.labelMat} renderOrder={1} />}
        {res.studs && res.studMat && <mesh geometry={res.studs} material={res.studMat} castShadow />}
        {res.wire && res.studMat && <mesh geometry={res.wire} material={res.studMat} castShadow />}
        {res.glow && <mesh geometry={res.body} material={res.glow} scale={[1.45, 1.01, 1.45]} position={[0, -0.004, 0]} />}
      </group>
    </group>
  );
}
