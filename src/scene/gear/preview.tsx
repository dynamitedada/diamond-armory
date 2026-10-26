// Dev-only entry for /gear-preview.html. Not imported by the main app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GearPreview } from './GearPreview';

const params = new URLSearchParams(location.search);
const only = params.get('only') ?? undefined;
const highlight = params.has('highlight');
const yaw = Number(params.get('yaw') ?? 0);
const shot = params.has('shot');
const dist = Number(params.get('dist') ?? (only ? 1.6 : 3.4));

function App() {
  return (
    <Canvas
      shadows
      dpr={shot ? 1 : [1, 2]}
      frameloop={shot ? 'demand' : 'always'}
      camera={{ position: [Math.sin(yaw) * dist, 0.15, Math.cos(yaw) * dist], fov: 40, near: 0.01, far: 50 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#10131c']} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 3, 3]} intensity={2.2} castShadow />
      <directionalLight position={[-3, 1, -2]} intensity={0.8} color="#88aaff" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-4, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 4, 1]} color="#9fc4ff" />
        <Lightformer form="rect" intensity={1.2} position={[4, 0, 2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} color="#ffd9a8" />
        <Lightformer form="ring" intensity={2} position={[0, 1, -4]} scale={2} />
      </Environment>
      <GearPreview only={only} highlight={highlight} />
      <OrbitControls makeDefault />
    </Canvas>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
