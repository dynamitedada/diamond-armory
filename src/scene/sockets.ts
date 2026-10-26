/**
 * Equipment sockets: which bone each gear piece hangs from and the transform that maps the gear's
 * real-world-metre geometry onto the chibi KayKit proportions (head ≈ 4× life size, hands ≈ 2×,
 * arms ≈ 1×). Values were measured from the Knight's bind pose (head mesh ≈ 0.5 radius, neck base at
 * the `head` bone, forearm radius ≈ 0.12) and tuned visually.
 */
import type { Slot } from '../data/types';

export type V3 = [number, number, number];

export interface SocketDef {
  bone: string;
  position: V3;
  /** Euler XYZ, radians */
  rotation: V3;
  scale: number | V3;
  /** orient the socket in character space (undo the bone's bind rotation), e.g. feet */
  charAligned?: boolean;
}

const D = Math.PI / 180;

/** Head gear is authored for a head radius of 0.12 m; the Knight's skull is ~0.48. */
export const HEAD_SCALE = 4.1;

export const SOCKETS = {
  bat: { bone: 'handslotr', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1.45 },
  glove: { bone: 'handl', position: [-0.04, 0.02, 0.0], rotation: [0, -90 * D, 0], scale: 2.4 },
  /** glove tucked in the back pocket while batting */
  gloveTucked: { bone: 'hips', position: [0.2, 0.08, -0.27], rotation: [-20 * D, 160 * D, -10 * D], scale: 1.5 },
  cap: { bone: 'head', position: [0, 0.5, 0.0], rotation: [0, 0, 0], scale: HEAD_SCALE },
  helmet: { bone: 'head', position: [0, 0.6, -0.03], rotation: [0, 0, 0], scale: 4.0 },
  eyewear: { bone: 'head', position: [0, 0.27, 0.08], rotation: [0, 0, 0], scale: 3.75 },
  chain: { bone: 'chest', position: [0, 0.28, 0.0], rotation: [0, 0, 0], scale: 3.2 },
  wristband: { bone: 'lowerarml', position: [0, 0.21, 0], rotation: [0, 0, 0], scale: [3.1, 1.5, 3.1] },
  elbowGuard: { bone: 'lowerarml', position: [0, 0.02, 0], rotation: [0, 0, 0], scale: 2.9 },
  cleatL: { bone: 'footl', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1.65, charAligned: true },
  cleatR: { bone: 'footr', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1.65, charAligned: true },
} satisfies Record<string, SocketDef>;

export type SocketName = keyof typeof SOCKETS;

/** Gear slots rendered as attached components (the rest are soft goods on the uniform material). */
export const GEAR_SLOTS: Slot[] = ['bat', 'glove', 'cap', 'helmet', 'eyewear', 'chain', 'wristband', 'elbowGuard', 'cleats'];
