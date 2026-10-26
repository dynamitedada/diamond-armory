/**
 * Turns a KayKit "Knight" clone into a baseball player.
 *
 * The KayKit meshes are textured from an 8x4 atlas of vertical gradient swatches, so every vertex's
 * swatch (cell) tells us what the artist meant it to be (skin, hair, plate, strap…). We classify each
 * vertex into a uniform *role* (jersey, sleeve trim, pants, socks, belt…) from its cell + dominant bone
 * + bind position, bake the role/shade into vertex attributes, and render all body parts with ONE
 * patched MeshStandardMaterial whose per-role colours/finishes live in uniform arrays. Equipping a
 * jersey/pants/socks/belt/batting gloves therefore only touches a few uniforms (no geometry upload).
 *
 * Fantasy-only geometry (the brooch on the chest, the armoured boots when cleats are worn, extra hair
 * volume under a cap) is collapsed in the vertex shader rather than deleted, so it can toggle freely.
 */
import * as THREE from 'three';

export const ROLE = {
  skin: 0,
  hair: 1,
  eyes: 2,
  jersey: 3,
  trim: 4,
  underL: 5,
  underR: 6,
  hands: 7,
  belt: 8,
  buckle: 9,
  pants: 10,
  pantsTrim: 11,
  socks: 12,
  socksTrim: 13,
  shoe: 14,
  neck: 15,
} as const;
export const ROLE_COUNT = 16;

/** Collapse groups (aCollapse attribute). */
const C_NONE = 0;
const C_ALWAYS = 1;
const C_FEET = 2;
const C_HAIR = 3;

/** Meshes that are fantasy accessories (weapons, shields, helmets, capes, hats, hoods...). */
export const ACCESSORY_RE = /(Sword|Shield|Axe|Mug|Hat|Helmet|Cape|Spellbook|Wand|Staff|Crossbow|Knife|Throwable|Hood)/i;

/** Torso cylinder used to project the jersey artwork (bind-pose, character space). */
export const JERSEY_Y0 = 0.42;
export const JERSEY_Y1 = 1.3;

const cellOf = (u: number, v: number) => `${Math.min(7, Math.floor(u * 8))},${Math.min(3, Math.floor(v * 4))}`;

function dominantBone(mesh: THREE.SkinnedMesh, i: number) {
  const si = mesh.geometry.attributes.skinIndex;
  const sw = mesh.geometry.attributes.skinWeight;
  let bi = 0;
  let bw = -1;
  for (let k = 0; k < 4; k++) {
    const w = sw.getComponent(i, k);
    if (w > bw) {
      bw = w;
      bi = si.getComponent(i, k);
    }
  }
  return mesh.skeleton.bones[bi].name;
}

interface Classified {
  role: number;
  collapse: number;
  to: [number, number, number];
}

const HEAD_CENTER: [number, number, number] = [0, 1.66, 0.02];

function classify(part: string, cell: string, bone: string, x: number, y: number): Classified {
  const r = (role: number, collapse = C_NONE, to: [number, number, number] = [0, 0, 0]): Classified => ({ role, collapse, to });
  const side = x >= 0 ? 'l' : 'r';
  switch (part) {
    case 'Head':
      if (cell === '1,0') return r(ROLE.hair, C_HAIR, HEAD_CENTER);
      if (cell === '2,0') return r(ROLE.eyes);
      return r(ROLE.skin);
    case 'Arm': {
      const under = side === 'l' ? ROLE.underL : ROLE.underR;
      if (bone.startsWith('hand') || bone.startsWith('wrist')) return r(ROLE.hands);
      if (bone.startsWith('upperarm')) {
        if (cell === '7,0') return r(ROLE.trim); // sleeve cuff
        if (cell === '4,0') return r(under);
        return r(ROLE.jersey);
      }
      return r(under); // forearm: undershirt sleeve or bare skin
    }
    case 'Body':
      if (cell === '0,1' || cell === '1,1') return r(ROLE.jersey, C_ALWAYS, [-0.16, 0.98, 0.16]); // brooch
      if (cell === '6,0') return r(ROLE.belt);
      if (cell === '2,1') return r(ROLE.buckle);
      if (cell === '7,0') return r(ROLE.trim); // placket + collar
      if (cell === '7,1' && bone === 'chest') return r(ROLE.neck);
      if (bone === 'hips') return r(ROLE.pants);
      if (y < 0.55) return r(ROLE.pants);
      return r(ROLE.jersey);
    case 'Leg': {
      const ankle: [number, number, number] = [x >= 0 ? 0.171 : -0.171, 0.15, 0.0];
      if (bone.startsWith('foot') || bone.startsWith('toes')) return r(ROLE.shoe, C_FEET, ankle);
      if (bone.startsWith('lowerleg')) {
        if (cell === '7,0') return r(ROLE.socksTrim);
        if (cell === '7,1') return r(ROLE.pantsTrim);
        return r(ROLE.socks);
      }
      if (cell === '6,0') return r(ROLE.pantsTrim);
      return r(ROLE.pants);
    }
  }
  return r(ROLE.jersey);
}

function partOf(name: string): string | null {
  if (/ArmLeft|ArmRight/.test(name)) return 'Arm';
  if (/LegLeft|LegRight/.test(name)) return 'Leg';
  if (/_Body/.test(name)) return 'Body';
  if (/_Head/.test(name)) return 'Head';
  return null;
}

/**
 * Bake role/shade/collapse/jersey-uv attributes into a (cloned) skinned mesh geometry.
 * Returns the new geometry (caller owns & disposes it).
 */
function bakeGeometry(mesh: THREE.SkinnedMesh, part: string): THREE.BufferGeometry {
  let geo = mesh.geometry.clone();
  if (part === 'Body' && geo.index) {
    // the jersey projection wraps around the torso: un-index so seam triangles can be unwrapped
    const ni = geo.toNonIndexed();
    geo.dispose();
    geo = ni;
  }
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const n = pos.count;
  const role = new Float32Array(n);
  const shade = new Float32Array(n);
  const collapse = new Float32Array(n);
  const to = new Float32Array(n * 3);
  const juv = new Float32Array(n * 2);
  const tmp = { geometry: geo, skeleton: mesh.skeleton } as unknown as THREE.SkinnedMesh;
  for (let i = 0; i < n; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const c = classify(part, cellOf(u, v), dominantBone(tmp, i), x, y);
    role[i] = c.role;
    collapse[i] = c.collapse;
    to.set(c.to, i * 3);
    // swatch gradient runs top (bright) → bottom (dark); right-hand strip of each swatch is a bevel tone
    const vf = (v * 4) % 1;
    const uf = (u * 8) % 1;
    shade[i] = (1 - 0.42 * vf) * (uf > 0.84 ? 0.9 : 1);
    // cylindrical torso projection: back centre at u = .5, front seam at u = 0/1
    juv[i * 2] = 0.5 - Math.atan2(x, -z) / (Math.PI * 2);
    juv[i * 2 + 1] = (y - JERSEY_Y0) / (JERSEY_Y1 - JERSEY_Y0);
  }
  if (part === 'Body') {
    // unwrap triangles straddling the front seam (texture wraps with RepeatWrapping)
    for (let t = 0; t < n; t += 3) {
      const a = juv[t * 2];
      const b = juv[t * 2 + 2];
      const c = juv[t * 2 + 4];
      if (Math.max(a, b, c) - Math.min(a, b, c) > 0.5) {
        for (let k = 0; k < 3; k++) if (juv[(t + k) * 2] < 0.5) juv[(t + k) * 2] += 1;
      }
    }
  }
  geo.setAttribute('aRole', new THREE.BufferAttribute(role, 1));
  geo.setAttribute('aShade', new THREE.BufferAttribute(shade, 1));
  geo.setAttribute('aCollapse', new THREE.BufferAttribute(collapse, 1));
  geo.setAttribute('aCollapseTo', new THREE.BufferAttribute(to, 3));
  geo.setAttribute('aJUv', new THREE.BufferAttribute(juv, 2));
  geo.deleteAttribute('uv');
  geo.computeBoundingSphere();
  return geo;
}

export interface UniformUniforms {
  uRoleColor: { value: THREE.Color[] };
  /** x roughness, y metalness, z gradient strength, w highlight */
  uRoleParam: { value: THREE.Vector4[] };
  uJersey: { value: THREE.Texture | null };
  uFeet: { value: number };
  uHair: { value: number };
  uTime: { value: number };
  uHighlightColor: { value: THREE.Color };
  uFade: { value: number };
}

const VERT_DECL = /* glsl */ `
attribute float aRole;
attribute float aShade;
attribute float aCollapse;
attribute vec3 aCollapseTo;
attribute vec2 aJUv;
uniform float uFeet;
uniform float uHair;
flat varying float vRole;
varying float vShade;
varying vec2 vJUv;
`;

const VERT_BEGIN = /* glsl */ `
#include <begin_vertex>
if (aCollapse > 0.5 && aCollapse < 1.5) transformed = aCollapseTo;
else if (aCollapse > 1.5 && aCollapse < 2.5) transformed = mix(transformed, aCollapseTo, uFeet);
else if (aCollapse > 2.5) {
  vec3 d = transformed - aCollapseTo;
  // squash hair volume under a cap/helmet: flatten the quiff, keep sideburns
  transformed = aCollapseTo + d * mix(vec3(1.0), vec3(0.9, 0.7, 0.9), uHair);
}
vRole = aRole;
vShade = aShade;
vJUv = aJUv;
`;

function patchVertex(shader: THREE.WebGLProgramParametersWithUniforms, depthOnly: boolean) {
  shader.vertexShader = (depthOnly ? VERT_DECL.replace(/flat varying[^\n]*\n|varying[^\n]*\n/g, '') : VERT_DECL) + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    depthOnly ? VERT_BEGIN.replace(/vRole = aRole;|vShade = aShade;|vJUv = aJUv;/g, '') : VERT_BEGIN,
  );
}

export function createUniformMaterial(u: UniformUniforms) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, transparent: false });
  mat.name = 'diamond-uniform';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    patchVertex(shader, false);
    shader.fragmentShader =
      /* glsl */ `
uniform vec3 uRoleColor[${ROLE_COUNT}];
uniform vec4 uRoleParam[${ROLE_COUNT}];
uniform sampler2D uJersey;
uniform float uTime;
uniform vec3 uHighlightColor;
uniform float uFade;
flat varying float vRole;
varying float vShade;
varying vec2 vJUv;
` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
int ri = int(vRole + 0.5);
vec4 rp = uRoleParam[ri];
float sh = mix(1.0, vShade, rp.z);
diffuseColor.rgb = uRoleColor[ri] * sh;
if (ri == ${ROLE.jersey}) {
  vec4 jt = texture2D(uJersey, vJUv);
  diffuseColor.rgb = mix(diffuseColor.rgb, jt.rgb * sh, jt.a);
}
`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = rp.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = rp.y;')
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `
#include <emissivemap_fragment>
if (rp.w > 0.001) {
  float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
  totalEmissiveRadiance += uHighlightColor * rp.w * (0.18 + 1.3 * fr);
}
`,
      )
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb *= uFade;');
  };
  mat.customProgramCacheKey = () => 'diamond-uniform-v1';
  return mat;
}

export function createDepthMaterial(u: UniformUniforms) {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFeet = u.uFeet;
    shader.uniforms.uHair = u.uHair;
    patchVertex(shader, true);
  };
  mat.customProgramCacheKey = () => 'diamond-uniform-depth-v1';
  return mat;
}

export function createUniforms(): UniformUniforms {
  return {
    uRoleColor: { value: Array.from({ length: ROLE_COUNT }, () => new THREE.Color(0xffffff)) },
    uRoleParam: { value: Array.from({ length: ROLE_COUNT }, () => new THREE.Vector4(0.8, 0, 0.5, 0)) },
    uJersey: { value: null },
    uFeet: { value: 0 },
    uHair: { value: 0 },
    uTime: { value: 0 },
    uHighlightColor: { value: new THREE.Color('#ffd27a') },
    uFade: { value: 1 },
  };
}

export interface PreparedCharacter {
  root: THREE.Object3D;
  bones: Record<string, THREE.Bone>;
  meshes: THREE.SkinnedMesh[];
  uniforms: UniformUniforms;
  material: THREE.MeshStandardMaterial;
  depthMaterial: THREE.MeshDepthMaterial;
  dispose: () => void;
}

/** Prepare an already-cloned (SkeletonUtils.clone) KayKit scene. */
export function prepareCharacter(root: THREE.Object3D): PreparedCharacter {
  const uniforms = createUniforms();
  const material = createUniformMaterial(uniforms);
  const depthMaterial = createDepthMaterial(uniforms);
  const bones: Record<string, THREE.Bone> = {};
  const meshes: THREE.SkinnedMesh[] = [];
  const geos: THREE.BufferGeometry[] = [];
  const hidden: THREE.Object3D[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
  });
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh) return;
    const part = m.isSkinnedMesh ? partOf(m.name) : null;
    if (!part || ACCESSORY_RE.test(m.name)) {
      m.visible = false;
      hidden.push(m);
      return;
    }
    const geo = bakeGeometry(m, part);
    geos.push(geo);
    m.geometry = geo;
    m.material = material;
    m.customDepthMaterial = depthMaterial;
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    meshes.push(m);
  });
  return {
    root,
    bones,
    meshes,
    uniforms,
    material,
    depthMaterial,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      material.dispose();
      depthMaterial.dispose();
      uniforms.uJersey.value?.dispose();
    },
  };
}
