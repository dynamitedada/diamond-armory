import { useRef } from 'react';
import * as THREE from 'three';
import { useHighlightPulse, type GearProps } from './util';

/** Logo-free category proxy; deliberately not a manufacturer's exact asset. */
export function SlidingMitt({ visual, highlight }: GearProps) {
  const ref = useRef<THREE.Group>(null);
  useHighlightPulse(ref, highlight);
  return <group ref={ref}>
    <mesh position={[0, 0.045, 0]} scale={[0.7, 1.2, 0.42]} castShadow>
      <capsuleGeometry args={[0.07, 0.08, 6, 12]} />
      <meshStandardMaterial color={visual.primary} roughness={0.85} />
    </mesh>
    <mesh position={[0, -0.055, 0]} castShadow>
      <boxGeometry args={[0.105, 0.035, 0.065]} />
      <meshStandardMaterial color={visual.secondary ?? '#a4aab8'} roughness={0.9} />
    </mesh>
  </group>;
}

export function LegGuard({ visual, highlight }: GearProps) {
  const ref = useRef<THREE.Group>(null);
  useHighlightPulse(ref, highlight);
  return <group ref={ref}>
    <mesh position={[0, 0, 0.04]} scale={[1, 1, 0.45]} castShadow>
      <capsuleGeometry args={[0.06, 0.2, 6, 12]} />
      <meshStandardMaterial color={visual.primary} roughness={0.7} />
    </mesh>
    {[-0.09, 0.09].map((y) => <mesh key={y} position={[0, y, 0]}>
      <cylinderGeometry args={[0.065, 0.065, 0.025, 12]} />
      <meshStandardMaterial color={visual.secondary ?? '#a4aab8'} />
    </mesh>)}
  </group>;
}
