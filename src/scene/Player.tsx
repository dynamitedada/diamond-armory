import * as THREE from 'three';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useArmory } from '../state/store';
import type { AnimationName, Item, Slot } from '../data/types';
import { prepareCharacter, ROLE_COUNT } from './character';
import { applyOutfit, createOutfitState, SLOT_ROLES } from './outfit';
import { AnimationController, BATTING_ANIMS } from './animations';
import { SOCKETS, type SocketName } from './sockets';
import { Bat, Cap, Chain, Cleats, ElbowGuard, Eyewear, Glove, Helmet, Wristband } from './gear';

export const MODEL_URL = '/models/Knight.glb';
useGLTF.preload(MODEL_URL);

/** Animations where the bat is put away (hands are busy). */
const NO_BAT: ReadonlySet<AnimationName> = new Set(['dance', 'flex']);
/** Animations where the glove is tucked in the back pocket. */
const GLOVE_TUCKED: ReadonlySet<AnimationName> = new Set(['stance', 'swing', 'bunt', 'flex']);

interface SocketProps {
  bone: THREE.Object3D;
  name: SocketName;
  bindInv?: THREE.Quaternion;
  children: ReactNode;
  groupRef?: React.Ref<THREE.Group>;
  visible?: boolean;
}

/** Portal a gear component into a bone with the socket's offset/scale. */
function Socket({ bone, name, bindInv, children, groupRef, visible = true }: SocketProps) {
  const def = SOCKETS[name];
  const { position, quaternion } = useMemo(() => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...def.rotation));
    const p = new THREE.Vector3(...def.position);
    if ('charAligned' in def && def.charAligned && bindInv) {
      q.premultiply(bindInv);
      p.applyQuaternion(bindInv);
    }
    return { position: p, quaternion: q };
  }, [def, bindInv]);
  return createPortal(
    <group position={position} quaternion={quaternion} scale={def.scale} visible={visible}>
      <group ref={groupRef}>{children}</group>
    </group>,
    bone,
  );
}

export interface PlayerProps {
  /** called once the character is built and posed (for fade-in) */
  onReady?: () => void;
}

export function Player({ onReady }: PlayerProps) {
  const gltf = useGLTF(MODEL_URL);
  const equipped = useArmory((s) => s.equipped);
  const player = useArmory((s) => s.player);
  const animation = useArmory((s) => s.animation);
  const nonce = useArmory((s) => s.animationNonce);
  const hovered = useArmory((s) => s.hovered);

  const rig = useMemo(() => {
    const root = cloneSkinned(gltf.scene);
    const prepared = prepareCharacter(root);
    // bind-pose orientations (character space) for char-aligned sockets
    root.updateMatrixWorld(true);
    const bindInv: Record<string, THREE.Quaternion> = {};
    for (const s of Object.values(SOCKETS)) {
      const b = prepared.bones[s.bone];
      if (b) bindInv[s.bone] = b.getWorldQuaternion(new THREE.Quaternion()).invert();
    }
    const controller = new AnimationController(root, gltf.animations, prepared.bones);
    const outfit = createOutfitState();
    return { root, prepared, controller, bindInv, outfit };
  }, [gltf]);

  useEffect(
    () => () => {
      rig.controller.dispose();
      rig.prepared.dispose();
      rig.outfit.texture.dispose();
    },
    [rig],
  );

  const [shown, setShown] = useState<AnimationName>(animation);
  useEffect(() => {
    rig.controller.onShownChange = setShown;
  }, [rig]);

  // animations: replay on every nonce bump
  useEffect(() => {
    rig.controller.play(animation);
  }, [rig, animation, nonce]);

  // soft goods → uniform roles
  useLayoutEffect(() => {
    applyOutfit(rig.prepared.uniforms, rig.outfit, equipped, player);
  }, [rig, equipped, player]);

  const batting = BATTING_ANIMS.has(shown);
  const showHelmet = !!equipped.helmet && (batting || !equipped.cap);
  const showCap = !!equipped.cap && !showHelmet;

  // gear visibility drives shader-side collapses (boots under cleats, hair under headwear)
  const feetTarget = equipped.cleats ? 1 : 0;
  const hairTarget = showCap || showHelmet ? 1 : 0;
  const hoverRoles = hovered ? SLOT_ROLES[hovered.slot] : undefined;
  const hoverMask = useMemo(() => {
    const m = new Float32Array(ROLE_COUNT);
    hoverRoles?.forEach((r) => (m[r] = 1));
    return m;
  }, [hoverRoles]);

  const batRef = useRef<THREE.Group>(null);
  const readyRef = useRef(false);
  useFrame((state, dt) => {
    const u = rig.prepared.uniforms;
    let step = Math.min(dt, 1 / 20);
    if (import.meta.env.DEV) {
      // test hook: window.__daDt = 0 freezes time; drive it with window.__daController.update(dt)
      const w = window as unknown as { __daDt?: number; __daController?: AnimationController };
      w.__daController = rig.controller;
      if (w.__daDt !== undefined) step = w.__daDt;
    }
    rig.controller.update(step);
    u.uTime.value = state.clock.elapsedTime;
    u.uFeet.value = feetTarget; // instant: boots must never poke through the cleats
    u.uHair.value = hairTarget;
    // hover highlight on uniform roles (soft fresnel pulse)
    const pulse = 0.55 + 0.45 * Math.sin(state.clock.elapsedTime * 3.4);
    const params = u.uRoleParam.value;
    const k = Math.min(1, dt * 8);
    for (let i = 0; i < ROLE_COUNT; i++) {
      const target = hoverMask[i] * pulse * 0.9;
      params[i].w += (target - params[i].w) * k;
      if (params[i].w < 0.002 && target === 0) params[i].w = 0;
    }
    // top hand slides along the handle (bunt): keep the bat origin under the right fist
    if (batRef.current) batRef.current.position.y = -rig.controller.rig.topHandAlong * rig.controller.rig.batWeight / SOCKETS.bat.scale;
    if (!readyRef.current) {
      readyRef.current = true;
      onReady?.();
    }
  });

  const B = rig.prepared.bones;
  const hl = (slot: Slot) => hovered?.slot === slot;
  const vis = (i?: Item) => i?.visual;

  return (
    <group>
      <primitive object={rig.root} />
      {equipped.bat && (
        <Socket bone={B[SOCKETS.bat.bone]} name="bat" groupRef={batRef} visible={!NO_BAT.has(shown)}>
          <Bat visual={vis(equipped.bat)!} highlight={hl('bat')} />
        </Socket>
      )}
      {equipped.glove &&
        (GLOVE_TUCKED.has(shown) ? (
          <Socket bone={B[SOCKETS.gloveTucked.bone]} name="gloveTucked">
            <Glove visual={vis(equipped.glove)!} highlight={hl('glove')} />
          </Socket>
        ) : (
          <Socket bone={B[SOCKETS.glove.bone]} name="glove">
            <Glove visual={vis(equipped.glove)!} highlight={hl('glove')} />
          </Socket>
        ))}
      {showCap && (
        <Socket bone={B[SOCKETS.cap.bone]} name="cap">
          <Cap visual={vis(equipped.cap)!} highlight={hl('cap')} />
        </Socket>
      )}
      {showHelmet && (
        <Socket bone={B[SOCKETS.helmet.bone]} name="helmet">
          <Helmet visual={vis(equipped.helmet)!} highlight={hl('helmet')} />
        </Socket>
      )}
      {equipped.eyewear && (
        <Socket bone={B[SOCKETS.eyewear.bone]} name="eyewear">
          <Eyewear visual={vis(equipped.eyewear)!} highlight={hl('eyewear')} />
        </Socket>
      )}
      {equipped.chain && (
        <Socket bone={B[SOCKETS.chain.bone]} name="chain">
          <Chain visual={vis(equipped.chain)!} highlight={hl('chain')} />
        </Socket>
      )}
      {equipped.wristband && (
        <Socket bone={B[SOCKETS.wristband.bone]} name="wristband">
          <Wristband visual={vis(equipped.wristband)!} highlight={hl('wristband')} />
        </Socket>
      )}
      {equipped.elbowGuard && (
        <Socket bone={B[SOCKETS.elbowGuard.bone]} name="elbowGuard">
          <ElbowGuard visual={vis(equipped.elbowGuard)!} highlight={hl('elbowGuard')} />
        </Socket>
      )}
      {equipped.cleats && (
        <>
          <Socket bone={B[SOCKETS.cleatL.bone]} name="cleatL" bindInv={rig.bindInv[SOCKETS.cleatL.bone]}>
            <Cleats visual={vis(equipped.cleats)!} highlight={hl('cleats')} side="l" />
          </Socket>
          <Socket bone={B[SOCKETS.cleatR.bone]} name="cleatR" bindInv={rig.bindInv[SOCKETS.cleatR.bone]}>
            <Cleats visual={vis(equipped.cleats)!} highlight={hl('cleats')} side="r" />
          </Socket>
        </>
      )}
    </group>
  );
}
