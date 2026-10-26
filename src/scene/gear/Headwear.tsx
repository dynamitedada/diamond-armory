import * as THREE from 'three';
import { useRef } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  brimGeometry,
  labelTexture,
  makeMaterial,
  roundedEnds,
  shellEdgeCurve,
  shellGeometry,
  shellPoint,
  sweepGeometry,
  useDisposable,
  useHighlightPulse,
  type GearProps,
} from './util';

const DEG = Math.PI / 180;
const gauss = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
/** wrap angle difference into [-PI, PI] */
const adiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Front logo patch conforming to an ellipsoid (sphere patch scaled). */
function frontPatch(radii: [number, number, number], lat0: number, lat1: number, halfLon: number, scale = 1.004) {
  const g = new THREE.SphereGeometry(1, 24, 12, Math.PI / 2 - halfLon, halfLon * 2, Math.PI / 2 - lat1, lat1 - lat0);
  g.scale(radii[0] * scale, radii[1] * scale, radii[2] * scale);
  return g;
}

// ---------------------------------------------------------------------------
// Cap
// ---------------------------------------------------------------------------

export function Cap({ visual, highlight }: GearProps) {
  const variant = visual.variant ?? 'fitted';
  const finish = visual.finish ?? 'matte';
  const secondary = visual.secondary ?? '#ffffff';
  const group = useRef<THREE.Group>(null);

  const res = useDisposable(() => {
    const radii: [number, number, number] = [0.127, 0.118, 0.134];
    const snap = variant === 'snapback' || variant === 'backwards';
    const bottom = (lon: number) => {
      let b = -4 * DEG + 6 * DEG * Math.cos(lon) * 0.5;
      if (snap) b += 20 * DEG * gauss(Math.abs(adiff(lon, Math.PI)), 0, 0.2);
      return b;
    };
    const crown = shellGeometry(radii, bottom, 96, 30);
    const crownMat = makeMaterial(visual.primary, finish, { side: THREE.DoubleSide });

    // Panel seams + button + snap strap in secondary
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 6; k++) {
      const lon = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 16; j++) {
        const lat = 88 * DEG + (bottom(lon) + 3 * DEG - 88 * DEG) * (j / 16);
        pts.push(shellPoint(radii, lon, lat, 1.006));
      }
      parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0012, 5));
    }
    const button = new THREE.SphereGeometry(0.0085, 16, 10);
    button.scale(1, 0.45, 1);
    button.translate(0, radii[1] + 0.001, 0);
    parts.push(button);
    if (snap) {
      const strap = new THREE.BoxGeometry(0.06, 0.012, 0.012, 2, 1, 1);
      strap.translate(0, -0.006, -radii[2] * 0.985);
      parts.push(strap);
    }
    const trimPts = shellEdgeCurve(radii, bottom, 1.0, 128);
    parts.push(new THREE.TubeGeometry(trimPts, 160, 0.0028, 6, true));
    const trim = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
    parts.forEach((p) => p.dispose());
    const trimMat = makeMaterial(secondary, finish === 'matte' ? 'gloss' : finish);

    // Brim
    const flat = snap;
    const brim = brimGeometry(0.128, flat ? 0.095 : 0.085, 62 * DEG, flat ? 0.002 : 0.03, 0.0065);
    const brimMat = makeMaterial(visual.primary, finish);
    const under = brimGeometry(0.128, flat ? 0.095 : 0.085, 62 * DEG, flat ? 0.002 : 0.03, 0.001);
    under.translate(0, -0.0058, 0);
    const underMat = makeMaterial(flat ? secondary : new THREE.Color(visual.primary).multiplyScalar(0.6), 'matte');

    // Front logo
    const logoGeo = frontPatch(radii, 8 * DEG, 44 * DEG, 30 * DEG, 1.008);
    const logoMat = makeMaterial(secondary, 'gloss', {
      map: labelTexture(visual.text ?? 'DA', { color: '#ffffff', width: 256, height: 200, outline: '#00000055' }),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    return { crown, crownMat, trim, trimMat, brim, brimMat, under, underMat, logoGeo, logoMat };
  }, [variant, finish, visual.primary, secondary, visual.text]);

  useHighlightPulse(group, highlight);
  const backwards = variant === 'backwards';

  return (
    <group ref={group} rotation={[backwards ? 0.06 : -0.08, backwards ? Math.PI : 0, 0]} position={[0, 0.012, 0]}>
      <mesh geometry={res.crown} material={res.crownMat} castShadow receiveShadow />
      <mesh geometry={res.trim} material={res.trimMat} castShadow />
      <mesh geometry={res.logoGeo} material={res.logoMat} renderOrder={1} />
      <group position={[0, 0.0, 0.002]} rotation={[0.12, 0, 0]}>
        <mesh geometry={res.brim} material={res.brimMat} castShadow receiveShadow />
        <mesh geometry={res.under} material={res.underMat} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Helmet
// ---------------------------------------------------------------------------

/** Ear flap(s) sit on the batter's front side: +X is the wearer's left ear when facing +Z. */
export function Helmet({ visual, highlight }: GearProps) {
  const variant = visual.variant ?? 'single-flap';
  const finish = visual.finish ?? 'gloss';
  const secondary = visual.secondary ?? '#1a1a1e';
  const group = useRef<THREE.Group>(null);

  const res = useDisposable(() => {
    const radii: [number, number, number] = [0.138, 0.136, 0.148];
    const flapL = true; // +X
    const flapR = variant === 'double-flap';
    const flapLon = 76 * DEG;
    const bottom = (lon: number) => {
      const c = (1 + Math.cos(lon)) / 2; // 1 front, 0 back
      let b = -28 * DEG + (16 * DEG + 28 * DEG) * Math.pow(c, 1.6);
      // raise around ears where there is no flap (ear cut-out)
      const flapDepth = -66 * DEG;
      const sides: [boolean, number][] = [
        [flapL, flapLon],
        [flapR, -flapLon],
      ];
      for (const [has, lonF] of sides) {
        const d = Math.abs(adiff(lon, lonF));
        if (has) {
          const w = gauss(d, 0, 0.46);
          b = b + (flapDepth - b) * w;
        } else {
          b = Math.max(b, b + (-6 * DEG - b) * gauss(d, 0, 0.32));
        }
      }
      return b;
    };
    const outer = shellGeometry(radii, bottom, 128, 40);
    const shellMat = makeMaterial(visual.primary, finish, {
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      roughness: finish === 'matte' ? 0.7 : Math.min(0.3, finishRough(finish)),
    });
    const linerMat = makeMaterial('#222226', 'matte', { side: THREE.BackSide });
    const edge = new THREE.TubeGeometry(shellEdgeCurve(radii, bottom, 0.985, 192), 256, 0.0055, 10, true);
    const edgeMat = makeMaterial('#16161a', 'matte', { roughness: 0.6 });

    const accents: THREE.BufferGeometry[] = [];
    // Ear holes on flap(s)
    const holes: THREE.BufferGeometry[] = [];
    const flapList = [flapL ? flapLon : null, flapR ? -flapLon : null].filter((x): x is number => x !== null);
    for (const lonF of flapList) {
      for (const [dl, dlat, r] of [
        [0, -14, 0.011],
        [-0.12, -22, 0.006],
        [0.12, -22, 0.006],
      ] as const) {
        const p = shellPoint(radii, lonF + dl * Math.sign(lonF), dlat * DEG, 1.002);
        const h = new THREE.CircleGeometry(r, 20);
        h.lookAt(p.clone().normalize());
        h.translate(p.x, p.y, p.z);
        holes.push(h);
      }
    }
    // Vents on top (small dark slots)
    for (const lon of [-0.35, 0.35]) {
      const pts = [62, 48].map((l) => shellPoint(radii, lon, l * DEG, 1.004));
      holes.push(sweepGeometry(new THREE.CatmullRomCurve3(pts), { radius: (t) => 0.007 * roundedEnds(t, 0.3), side: new THREE.Vector3(Math.cos(lon), 0, -Math.sin(lon)), width: 1, depth: 0.25, segments: 10, radial: 12 }));
    }
    // Accent stripe down the center
    const stripePts: THREE.Vector3[] = [];
    for (let j = 0; j <= 24; j++) stripePts.push(shellPoint(radii, 0, (14 + j * 7.4) * DEG, 1.003));
    accents.push(sweepGeometry(new THREE.CatmullRomCurve3(stripePts), { radius: () => 0.009, side: new THREE.Vector3(1, 0, 0), width: 1, depth: 0.12, segments: 120, radial: 8 }));

    // C-flap jaw guard: plate sweeping from the flap forward along the jaw
    if (variant === 'c-flap') {
      const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
      const pts = [V(0.118, -0.08, 0.012), V(0.108, -0.1, 0.06), V(0.084, -0.112, 0.1), V(0.05, -0.108, 0.128)];
      accents.push(sweepGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), {
        radius: (t) => 0.03 * (1 - 0.3 * t) * roundedEnds(t, 0.04, 0.22),
        side: new THREE.Vector3(0, 1, 0),
        width: 1,
        depth: 0.22,
        segments: 40,
        radial: 20,
      }));
    }
    const accent = mergeGeometries(accents.map((p) => (p.index ? p.toNonIndexed() : p)));
    accents.forEach((p) => p.dispose());
    const accentMat = makeMaterial(secondary, finish === 'matte' ? 'matte' : 'gloss', { clearcoat: 1, side: THREE.DoubleSide });
    const hole = mergeGeometries(holes.map((p) => (p.index ? p.toNonIndexed() : p)));
    holes.forEach((p) => p.dispose());
    const holeMat = makeMaterial('#0b0b0d', 'matte', { polygonOffset: true, polygonOffsetFactor: -2 });

    // Bill
    const front = shellPoint(radii, 0, 16 * DEG);
    const brim = brimGeometry(0.135, 0.055, 58 * DEG, 0.012, 0.007);
    const brimMat = makeMaterial(visual.primary, finish, { clearcoat: 1, clearcoatRoughness: 0.05 });

    let logoGeo: THREE.BufferGeometry | null = null;
    let logoMat: THREE.MeshPhysicalMaterial | null = null;
    if (visual.text) {
      logoGeo = frontPatch(radii, 22 * DEG, 52 * DEG, 26 * DEG, 1.006);
      logoMat = makeMaterial(secondary, 'gloss', {
        map: labelTexture(visual.text, { color: '#ffffff', width: 256, height: 180, outline: '#00000066' }),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
    }
    return { outer, shellMat, linerMat, edge, edgeMat, accent, accentMat, hole, holeMat, brim, brimMat, brimY: front.y, logoGeo, logoMat };
  }, [variant, finish, visual.primary, secondary, visual.text]);

  useHighlightPulse(group, highlight);

  return (
    <group ref={group} position={[0, 0.012, -0.006]}>
      <mesh geometry={res.outer} material={res.shellMat} castShadow receiveShadow />
      <mesh geometry={res.outer} material={res.linerMat} scale={0.955} />
      <mesh geometry={res.edge} material={res.edgeMat} castShadow />
      <mesh geometry={res.accent} material={res.accentMat} castShadow />
      <mesh geometry={res.hole} material={res.holeMat} />
      {res.logoGeo && res.logoMat && <mesh geometry={res.logoGeo} material={res.logoMat} renderOrder={1} />}
      <group position={[0, res.brimY + 0.004, 0.0]} rotation={[0.18, 0, 0]}>
        <mesh geometry={res.brim} material={res.brimMat} castShadow />
      </group>
    </group>
  );
}

function finishRough(f: string) {
  return f === 'chrome' ? 0.08 : f === 'metal' ? 0.3 : 0.22;
}
