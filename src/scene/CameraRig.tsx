import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useArmory } from '../state/store';

/** Default framing: full body, slightly from the batter's open side and a touch above. */
export const DEFAULT_CAM = new THREE.Vector3(1.45, 1.55, 6.55);
export const DEFAULT_TARGET = new THREE.Vector3(0, 1.08, 0);
const TARGET_TUPLE: [number, number, number] = [DEFAULT_TARGET.x, DEFAULT_TARGET.y, DEFAULT_TARGET.z];
const MIN_D = 2.3; // torso close-up
const MAX_D = 7.2; // full body with breathing room
const POLAR_MIN = (75 * Math.PI) / 180;
const POLAR_MAX = (105 * Math.PI) / 180;
const RESUME_AFTER = 2.5; // s of inactivity before auto-rotate resumes

const _t = new THREE.Vector3();

export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const autoRotate = useArmory((s) => s.autoRotate);
  const resetNonce = useArmory((s) => s.viewResetNonce ?? 0);
  const resetting = useRef(0);
  const idleFor = useRef(Infinity);
  const interacting = useRef(false);

  useEffect(() => {
    camera.position.copy(DEFAULT_CAM);
    camera.lookAt(DEFAULT_TARGET);
  }, [camera]);

  useEffect(() => {
    // dev/test hook: lets automated screenshots orbit the camera
    if (import.meta.env.DEV) (window as unknown as { __daControls?: unknown }).__daControls = controls.current;
  });

  useEffect(() => {
    if (resetNonce > 0) resetting.current = 1;
  }, [resetNonce]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const start = () => {
      interacting.current = true;
      resetting.current = 0;
    };
    const end = () => {
      interacting.current = false;
      idleFor.current = 0;
    };
    c.addEventListener('start', start);
    c.addEventListener('end', end);
    return () => {
      c.removeEventListener('start', start);
      c.removeEventListener('end', end);
    };
  }, []);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    idleFor.current += dt;
    c.autoRotate = autoRotate && !interacting.current && idleFor.current > RESUME_AFTER && resetting.current === 0;
    if (resetting.current > 0) {
      const k = 1 - Math.exp(-dt * 6);
      camera.position.lerp(DEFAULT_CAM, k);
      c.target.lerp(DEFAULT_TARGET, k);
      if (camera.position.distanceToSquared(DEFAULT_CAM) < 1e-4) resetting.current = 0;
    } else {
      // zooming in frames the torso/face instead of the belt
      const d = camera.position.distanceTo(c.target);
      const z = THREE.MathUtils.clamp((MAX_D - d) / (MAX_D - MIN_D), 0, 1);
      _t.copy(c.target);
      _t.y += (THREE.MathUtils.lerp(DEFAULT_TARGET.y, 1.5, z * z) - _t.y) * Math.min(1, dt * 5);
      camera.position.y += _t.y - c.target.y;
      c.target.copy(_t);
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={TARGET_TUPLE}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      zoomSpeed={0.7}
      minDistance={MIN_D}
      maxDistance={MAX_D}
      minPolarAngle={POLAR_MIN}
      maxPolarAngle={POLAR_MAX}
      autoRotateSpeed={0.8}
    />
  );
}
