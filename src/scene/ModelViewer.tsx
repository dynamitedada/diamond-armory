import * as THREE from 'three';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { Player } from './Player';
import { Stage } from './Stage';
import { CameraRig, DEFAULT_CAM } from './CameraRig';
import { registerViewer } from './viewerApi';

/** Registers renderer handles for screenshots. */
function ViewerHandles() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    registerViewer({ gl, scene, camera });
    return () => registerViewer(null);
  }, [gl, scene, camera]);
  return null;
}

/** Model entrance: rises & scales in once the character is ready. */
function Entrance({ ready, children }: { ready: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!g.current) return;
    if (ready) t.current = Math.min(1, t.current + dt / 0.7);
    const k = 1 - Math.pow(1 - t.current, 3);
    g.current.scale.setScalar(0.94 + 0.06 * k);
    g.current.position.y = -0.12 * (1 - k);
  });
  return (
    <group ref={g} scale={0.94}>
      {children}
    </group>
  );
}

function Loader({ done }: { done: boolean }) {
  const { progress, active } = useProgress();
  const pct = Math.round(done ? 100 : Math.min(progress, 99));
  const hidden = done && !active;
  return (
    <div
      aria-hidden={hidden}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: hidden ? 'none' : 'auto',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 450ms ease-out',
        background: 'radial-gradient(ellipse at 50% 60%, #2a1d4f 0%, #0b0d1f 60%, #05060d 100%)',
        color: '#e6d6b0',
        font: '600 12px/1.4 system-ui, sans-serif',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
        <svg width="54" height="54" viewBox="0 0 54 54" style={{ animation: 'da-spin 1.1s linear infinite' }}>
          <circle cx="27" cy="27" r="22" fill="none" stroke="#ffffff22" strokeWidth="4" />
          <circle cx="27" cy="27" r="22" fill="none" stroke="#ffd100" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 138 + 8} 200`} transform="rotate(-90 27 27)" />
          <path d="M18 27c3-5 15-5 18 0M18 27c3 5 15 5 18 0" stroke="#e6d6b0" strokeWidth="1.4" fill="none" strokeDasharray="2 2" />
        </svg>
        <span>Suiting up · {pct}%</span>
      </div>
      <style>{'@keyframes da-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

export function ModelViewer() {
  const [ready, setReady] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 320, overflow: 'hidden', touchAction: 'none' }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, preserveDrawingBuffer: false }}
        camera={{ fov: 30, near: 0.1, far: 200, position: DEFAULT_CAM.toArray() }}
        style={{ opacity: ready ? 1 : 0, transition: 'opacity 600ms ease-out' }}
      >
        <ViewerHandles />
        <Stage />
        <Suspense fallback={null}>
          <Entrance ready={ready}>
            <Player onReady={() => setReady(true)} />
          </Entrance>
        </Suspense>
        <CameraRig />
      </Canvas>
      <Loader done={ready} />
    </div>
  );
}

export default ModelViewer;
