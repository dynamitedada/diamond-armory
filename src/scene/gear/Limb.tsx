import * as THREE from 'three';
import { useRef } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { labelTexture, makeMaterial, useDisposable, useHighlightPulse, type GearProps } from './util';

/** Limb radius these pieces are sized for. Origin = limb center, limb along Y. */
export const LIMB_RADIUS = 0.04;

/** Closed rounded-rectangle lathe profile (band cross-section). */
function bandProfile(rIn: number, rOut: number, h: number, round: number) {
  const pts: THREE.Vector2[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * round, cy + Math.sin(a) * round));
    }
  };
  corner(rIn + round, -h / 2 + round, Math.PI); // bottom-inner
  corner(rOut - round, -h / 2 + round, -Math.PI / 2); // bottom-outer
  corner(rOut - round, h / 2 - round, 0); // top-outer
  corner(rIn + round, h / 2 - round, Math.PI / 2); // top-inner
  pts.push(pts[0].clone());
  return pts;
}

function terryTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 4) {
    g.fillStyle = x % 8 ? '#a0a0a0' : '#606060';
    g.fillRect(x, 0, 2, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function Wristband({ visual, highlight }: GearProps) {
  const finish = visual.finish ?? 'matte';
  const secondary = visual.secondary ?? '#ffffff';
  const group = useRef<THREE.Group>(null);
  const res = useDisposable(() => {
    const band = new THREE.LatheGeometry(bandProfile(LIMB_RADIUS - 0.001, LIMB_RADIUS + 0.008, 0.07, 0.0035), 64);
    const bandMat = makeMaterial(visual.primary, finish, { bumpMap: terryTexture(), bumpScale: 0.6 });
    const stripes = mergeGeometries(
      [-0.022, 0.022].map((y) => {
        const s = new THREE.LatheGeometry(bandProfile(LIMB_RADIUS + 0.006, LIMB_RADIUS + 0.0088, 0.008, 0.0012), 64);
        s.translate(0, y, 0);
        return s.toNonIndexed();
      }),
    );
    const stripeMat = makeMaterial(secondary, finish);
    let logo: THREE.BufferGeometry | null = null;
    let logoMat: THREE.MeshPhysicalMaterial | null = null;
    if (visual.text) {
      logo = new THREE.CylinderGeometry(LIMB_RADIUS + 0.0083, LIMB_RADIUS + 0.0083, 0.026, 24, 1, true, -0.6, 1.2);
      logoMat = makeMaterial(secondary, 'gloss', {
        map: labelTexture(visual.text, { color: '#ffffff', width: 256, height: 128 }),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
    }
    return { band, bandMat, stripes, stripeMat, logo, logoMat };
  }, [finish, visual.primary, secondary, visual.text]);
  useHighlightPulse(group, highlight);
  return (
    <group ref={group}>
      <mesh geometry={res.band} material={res.bandMat} castShadow receiveShadow />
      <mesh geometry={res.stripes} material={res.stripeMat} castShadow />
      {res.logo && res.logoMat && <mesh geometry={res.logo} material={res.logoMat} renderOrder={1} />}
    </group>
  );
}

/** Elbow guard: articulated plates on the +Z side of the limb, two straps around it. */
export function ElbowGuard({ visual, highlight }: GearProps) {
  const finish = visual.finish ?? 'gloss';
  const secondary = visual.secondary ?? '#15151a';
  const group = useRef<THREE.Group>(null);
  const res = useDisposable(() => {
    // Articulated plates: partial lathes (phi = 0 faces +Z) with a closed, rounded cross-section
    const plate = (y0: number, y1: number, rMid: number, rEnd: number, thick: number, phiLen: number) => {
      const outer: THREE.Vector2[] = [];
      const inner: THREE.Vector2[] = [];
      const N = 16;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const y = y0 + (y1 - y0) * u;
        const bulge = Math.sin(u * Math.PI);
        const r = rEnd + (rMid - rEnd) * Math.pow(bulge, 0.6);
        const roll = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 8))); // rounded top/bottom lips
        outer.push(new THREE.Vector2(r - thick * (1 - roll), y));
        inner.unshift(new THREE.Vector2(r - thick, y));
      }
      return new THREE.LatheGeometry([...outer, ...inner, outer[0].clone()], 48, -phiLen / 2, phiLen);
    };
    const R = LIMB_RADIUS;
    const parts: THREE.BufferGeometry[] = [
      plate(-0.034, 0.034, R + 0.026, R + 0.012, 0.008, Math.PI * 1.15), // elbow cap
      plate(0.038, 0.11, R + 0.017, R + 0.01, 0.007, Math.PI * 1.0), // upper-arm plate
      plate(-0.11, -0.038, R + 0.016, R + 0.01, 0.007, Math.PI * 1.0), // forearm plate
    ];
    // raised center ridge on the cap
    const ridge = new THREE.CapsuleGeometry(0.007, 0.03, 6, 12);
    ridge.scale(1, 1, 0.6);
    ridge.translate(0, 0, R + 0.026);
    parts.push(ridge);
    const shell = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
    parts.forEach((p) => p.dispose());
    // dark padding under the plates (full-height sleeve on the front half)
    const padding = new THREE.LatheGeometry(bandProfile(R - 0.0005, R + 0.012, 0.215, 0.004), 40, -Math.PI * 0.62, Math.PI * 1.24);
    const straps = mergeGeometries(
      [0.121, -0.121].map((y) => {
        const s = new THREE.LatheGeometry(bandProfile(LIMB_RADIUS - 0.001, LIMB_RADIUS + 0.005, 0.02, 0.0022), 48);
        s.translate(0, y, 0);
        return s.toNonIndexed();
      }),
    );
    const shellMat = makeMaterial(visual.primary, finish, { side: THREE.DoubleSide, clearcoat: finish === 'gloss' ? 1 : 0.3 });
    const padMat = makeMaterial('#1d1d22', 'matte', { side: THREE.DoubleSide });
    const strapMat = makeMaterial(secondary, 'matte');
    return { shell, padding, straps, shellMat, padMat, strapMat };
  }, [finish, visual.primary, secondary]);
  useHighlightPulse(group, highlight);
  return (
    <group ref={group}>
      <mesh geometry={res.shell} material={res.shellMat} castShadow receiveShadow />
      <mesh geometry={res.padding} material={res.padMat} />
      <mesh geometry={res.straps} material={res.strapMat} castShadow />
    </group>
  );
}
