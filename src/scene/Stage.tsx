/**
 * Dusk ballpark backdrop: gradient sky dome, stadium bowl silhouette with light towers, bokeh light
 * sprites, a dirt batter's circle with home plate + chalk box, contact shadow and a three-point rig
 * (warm key, warm rim, cool fill). Environment reflections come from local Lightformers (no CDN).
 */
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- sky dome
const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // at the far plane
}`;
const skyFrag = /* glsl */ `
varying vec3 vDir;
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uGround;
void main() {
  float h = vDir.y;
  vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
  c = mix(c, uTop, smoothstep(0.18, 0.75, h));
  c = mix(uGround, c, smoothstep(-0.12, 0.02, h));
  // warm glow where the sun went down (behind the player, slightly left)
  float sun = pow(max(0.0, dot(normalize(vDir * vec3(1.0, 2.5, 1.0)), normalize(vec3(-0.35, 0.05, -1.0)))), 6.0);
  c += vec3(1.0, 0.42, 0.18) * sun * 0.35;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color('#070a1f') },
          uMid: { value: new THREE.Color('#2a1d4f') },
          uHorizon: { value: new THREE.Color('#b8506a') },
          uGround: { value: new THREE.Color('#06070d') },
        },
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[60, 32, 16]} />
    </mesh>
  );
}

// ---------------------------------------------------------------- textures
function radialTexture(inner = 0.0, soft = true) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(inner, 'rgba(255,255,255,0.95)');
  grd.addColorStop(soft ? 0.55 : 0.85, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bokehTexture() {
  // disc with a slightly brighter rim, like an out-of-focus highlight
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  grd.addColorStop(0, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.82, 'rgba(255,255,255,0.7)');
  grd.addColorStop(0.92, 'rgba(255,255,255,0.95)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(64, 64, 62, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function dirtTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  // radial dirt → grass falloff is done with alpha; colour variation here
  g.fillStyle = '#8a5a3a';
  g.fillRect(0, 0, S, S);
  let s = 12345;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = rnd() * 2.2 + 0.3;
    const l = rnd();
    g.fillStyle = l > 0.5 ? `rgba(255,220,180,${0.08 + rnd() * 0.12})` : `rgba(40,20,10,${0.08 + rnd() * 0.16})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // raked arcs
  g.strokeStyle = 'rgba(60,30,15,0.18)';
  for (let r = 20; r < S / 2; r += 7 + rnd() * 6) {
    g.lineWidth = 1 + rnd() * 1.5;
    g.beginPath();
    g.arc(S / 2, S / 2, r, rnd() * 6, rnd() * 6 + 3);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------- field
const fieldFrag = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uDirt;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  vec3 dirt = texture2D(uDirt, vUv * 1.0).rgb;
  vec3 grass = vec3(0.07, 0.17, 0.08);
  // mowing stripes
  grass *= 0.85 + 0.15 * step(0.5, fract((p.x + p.y) * 3.0));
  float dirtMask = 1.0 - smoothstep(0.42, 0.45, r);
  vec3 c = mix(grass, dirt, dirtMask);
  // vignette into the night
  float fade = 1.0 - smoothstep(0.55, 1.0, r);
  c *= mix(0.08, 1.0, fade);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function Field() {
  const dirt = useMemo(dirtTexture, []);
  const fieldMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: fieldFrag,
        uniforms: { uDirt: { value: dirt } },
      }),
    [dirt],
  );
  // lit dirt circle on top (so the key light/shadows read on it)
  const plate = useMemo(() => {
    const s = new THREE.Shape();
    const w = 0.43 / 2;
    s.moveTo(-w, 0);
    s.lineTo(w, 0);
    s.lineTo(w, 0.215);
    s.lineTo(0, 0.43);
    s.lineTo(-w, 0.215);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.002} material={fieldMat}>
        <planeGeometry args={[16, 16]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.0} receiveShadow>
        <circleGeometry args={[3.55, 64]} />
        <meshStandardMaterial map={dirt} roughness={1} color="#c79270" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* home plate in front of the batter, chalk batter's box around him */}
      <mesh geometry={plate} position={[0, 0.0, 0.95]} rotation-y={Math.PI} scale={1.6} receiveShadow castShadow>
        <meshStandardMaterial color="#f4f1ea" roughness={0.55} />
      </mesh>
      <ChalkBox />
    </group>
  );
}

function ChalkBox() {
  const geo = useMemo(() => {
    const w = 2.3;
    const d = 1.45;
    const t = 0.035;
    const parts: THREE.BufferGeometry[] = [];
    const seg = (x: number, z: number, sx: number, sz: number) => {
      const g = new THREE.PlaneGeometry(sx, sz);
      g.rotateX(-Math.PI / 2);
      g.translate(x, 0.004, z);
      parts.push(g);
    };
    const cx = 0;
    const cz = -0.05;
    seg(cx, cz - d / 2, w, t);
    seg(cx, cz + d / 2, w, t);
    seg(cx - w / 2, cz, t, d);
    seg(cx + w / 2, cz, t, d);
    const merged = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    return merged;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.75} depthWrite={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------- stadium
function Stadium() {
  const glow = useMemo(() => radialTexture(0.08), []);
  const bokeh = useMemo(bokehTexture, []);
  const towers = useMemo(() => {
    // light banks on top of tall towers around the bowl (azimuth deg, height, distance)
    return [
      [-62, 9.5, 30],
      [-30, 10.5, 32],
      [28, 10.5, 32],
      [60, 9.5, 30],
      [150, 9, 30],
      [-150, 9, 30],
    ] as const;
  }, []);
  const bokehs = useMemo(() => {
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const out: { p: [number, number, number]; s: number; c: string; o: number }[] = [];
    for (let i = 0; i < 46; i++) {
      const a = (r() * 1.7 - 0.85) * Math.PI + Math.PI; // mostly behind the player
      const d = 9 + r() * 7;
      const y = 1.2 + r() * 5.5;
      const warm = r() > 0.35;
      out.push({
        p: [Math.sin(a) * d, y, Math.cos(a) * d],
        s: 0.5 + r() * 1.3,
        c: warm ? (r() > 0.5 ? '#ffd9a0' : '#ffb27a') : r() > 0.5 ? '#9fc8ff' : '#ff8fd8',
        o: 0.07 + r() * 0.16,
      });
    }
    return out;
  }, []);

  const bowl = useMemo(() => {
    // dark stands silhouette ring with a faint upper rim & row lights
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, 'rgba(18,16,34,1)');
    grd.addColorStop(1, 'rgba(6,6,14,1)');
    g.fillStyle = grd;
    g.fillRect(0, 10, 2048, 118);
    let s = 3;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() > 0.7 ? 'rgba(255,190,120,0.55)' : 'rgba(150,170,255,0.35)';
      g.fillRect(r() * 2048, 18 + r() * 70, 2, 2);
    }
    g.fillStyle = 'rgba(255,170,120,0.35)';
    g.fillRect(0, 9, 2048, 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }, []);

  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    // gentle shimmer on the bokeh, like heat haze over the field
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const sp = g.children[i] as THREE.Sprite;
      const m = sp.material as THREE.SpriteMaterial;
      m.opacity = (sp.userData.o as number) * (0.8 + 0.2 * Math.sin(t * 0.7 + i * 1.7));
    }
  });

  return (
    <group>
      <mesh position-y={3.2}>
        <cylinderGeometry args={[36, 21, 7.5, 96, 1, true]} />
        <meshBasicMaterial map={bowl} side={THREE.BackSide} toneMapped={false} fog={false} />
      </mesh>
      {towers.map(([az, h, d], i) => {
        const a = (az * Math.PI) / 180 + Math.PI;
        const x = Math.sin(a) * d;
        const z = Math.cos(a) * d;
        return (
          <group key={i} position={[x, h, z]}>
            {[-1, 0, 1].map((cx) =>
              [0, 1].map((cy) => (
                <sprite key={`${cx}${cy}`} position={[cx * 0.7, cy * 0.6, 0]} scale={1.1}>
                  <spriteMaterial map={glow} color="#fff3d6" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
                </sprite>
              )),
            )}
            <sprite scale={6}>
              <spriteMaterial map={glow} color="#ffcf8a" opacity={0.28} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <mesh position={[0, -h / 2, 0]}>
              <boxGeometry args={[0.25, h, 0.25]} />
              <meshBasicMaterial color="#0b0b16" />
            </mesh>
          </group>
        );
      })}
      <group ref={group}>
        {bokehs.map((b, i) => (
          <sprite key={i} position={b.p} scale={b.s} userData={{ o: b.o }}>
            <spriteMaterial map={bokeh} color={b.c} opacity={b.o} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- lights
function Lights() {
  const key = useRef<THREE.DirectionalLight>(null);
  return (
    <>
      <hemisphereLight args={['#8fa2ff', '#2a160c', 0.55]} />
      {/* key: warm stadium light, front-left high */}
      <directionalLight
        ref={key}
        position={[3.5, 6.5, 5]}
        intensity={2.4}
        color="#ffe8cc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-1}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      {/* warm rim from behind-right (the sunset side / outfield lights) */}
      <directionalLight position={[-4, 3.5, -5]} intensity={2.6} color="#ff9a5c" />
      <directionalLight position={[4.5, 2.5, -4]} intensity={1.6} color="#ff6fb5" />
      {/* cool fill from the left */}
      <directionalLight position={[-5, 2, 3]} intensity={0.75} color="#6f8dff" />
      <pointLight position={[0, 0.4, 2.2]} intensity={1.2} distance={5} color="#ffd2a8" />
    </>
  );
}

function Reflections() {
  return (
    <Environment resolution={128} frames={1}>
      <color attach="background" args={['#0b0c1c']} />
      <Lightformer form="rect" intensity={2.2} color="#fff1dc" position={[3, 5, 4]} scale={[4, 2, 1]} target={[0, 1, 0]} />
      <Lightformer form="rect" intensity={2.5} color="#ff8a4a" position={[-5, 2, -4]} scale={[5, 2, 1]} target={[0, 1, 0]} />
      <Lightformer form="rect" intensity={1.4} color="#ff5fbf" position={[5, 2, -4]} scale={[3, 2, 1]} target={[0, 1, 0]} />
      <Lightformer form="rect" intensity={1.0} color="#5f7dff" position={[-5, 2, 3]} scale={[3, 3, 1]} target={[0, 1, 0]} />
      <Lightformer form="ring" intensity={1.5} color="#ffe3b0" position={[0, 8, 0]} scale={4} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.6} color="#7a4a2a" position={[0, -2, 0]} scale={[10, 10, 1]} target={[0, 0, 0]} />
    </Environment>
  );
}

export function Stage() {
  return (
    <>
      <fog attach="fog" args={['#120f26', 14, 40]} />
      <Sky />
      <Stadium />
      <Field />
      <Lights />
      <Reflections />
      <ContactShadows position={[0, 0.006, 0]} scale={4} resolution={256} blur={2.4} opacity={0.7} far={2.5} color="#1a0d06" frames={Infinity} />
    </>
  );
}
