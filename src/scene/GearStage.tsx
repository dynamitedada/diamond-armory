// Lazy chunk: a small turntable for one gear piece, used by the gear detail popup.
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { Item } from '../data/types';
import { Bat, Cap, Chain, Cleats, ElbowGuard, Eyewear, Glove, Helmet, Wristband } from './gear';

const mannequin = new THREE.MeshStandardMaterial({ color: '#4b5066', roughness: 0.75 });

function GearModel({ item, number }: { item: Item; number?: number }) {
  const v = item.visual;
  switch (item.slot) {
    case 'bat':
      return <group rotation={[0, 0, -0.42]}><Bat visual={v} /></group>;
    case 'glove':
      return <group rotation={[0.15, 0.6, 0]}><Glove visual={v} /></group>;
    case 'cap':
      return <Cap visual={v} />;
    case 'helmet':
      return <Helmet visual={v.text && number !== undefined ? { ...v, text: String(number) } : v} />;
    case 'eyewear':
      return (
        <>
          {v.variant === 'eyeblack' && (
            <mesh material={mannequin}><sphereGeometry args={[0.12, 40, 24]} /></mesh>
          )}
          <Eyewear visual={v} />
        </>
      );
    case 'chain':
      return <group rotation={[0.35, 0, 0]}><Chain visual={v} /></group>;
    case 'wristband':
      return <group rotation={[0.5, 0, 0]}><Wristband visual={v} /></group>;
    case 'elbowGuard':
      return <group rotation={[0.3, 0, 0]}><ElbowGuard visual={v} /></group>;
    case 'cleats':
      return (
        <group rotation={[0.3, -0.6, 0]}>
          <group position={[0.06, 0, 0]}><Cleats side="r" visual={v} /></group>
          <group position={[-0.06, 0, 0]}><Cleats side="l" visual={v} /></group>
        </group>
      );
    default:
      return null;
  }
}

export default function GearStage({ item, number, spin = true }: { item: Item; number?: number; spin?: boolean }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.12, 1.4], fov: 32, near: 0.01, far: 50 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ touchAction: 'none' }}
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 3, 3]} intensity={2.2} />
      <directionalLight position={[-3, 1, -2]} intensity={0.9} color="#88aaff" />
      <pointLight position={[0, -1, 1.5]} intensity={0.6} color="#ff2bd6" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-4, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 4, 1]} color="#9fc4ff" />
        <Lightformer form="rect" intensity={1.2} position={[4, 0, 2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} color="#ffd9a8" />
        <Lightformer form="ring" intensity={2} position={[0, 1, -4]} scale={2} />
      </Environment>
      <Bounds fit clip observe margin={1.35}>
        <Center>
          <GearModel item={item} number={number} />
        </Center>
      </Bounds>
      <OrbitControls makeDefault autoRotate={spin} autoRotateSpeed={2.4} enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
