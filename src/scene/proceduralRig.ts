/**
 * Procedural pose layers applied on top of the AnimationMixer output every frame.
 *
 * KayKit ships fantasy clips only (sword slices, cheering...). A baseball swing is a very specific
 * motion — hips fire before shoulders, the bat lays flat and sweeps horizontally through the zone,
 * both hands stay on the handle — so batting is authored here as keyframed *intent* (pelvis/torso
 * yaw, bat grip point + direction, foot plants) and solved onto the skeleton with two-bone IK:
 *  - legs: IK to planted foot targets (stride / front-foot lift / back-foot pivot)
 *  - right (top) hand: IK so its handslot sits on the handle, oriented along the bat
 *  - left (bottom) hand: IK to the handle point below → both hands always on the bat
 * Flex and dance are small procedural layers too. Layers cross-fade by weight against the mixer pose.
 */
import * as THREE from 'three';
import { basisQuat, rotateWorld, sampleChannel, setWorldPos, setWorldQuat, solveTwoBone, worldPos, worldQuat } from './ik';

const DEG = Math.PI / 180;
type V3 = [number, number, number];

/** Batting intent at one instant, in character space (character faces +Z, pitcher at +X, RH batter). */
export interface BatPose {
  pelvis: number; // deg yaw, + opens toward the pitcher
  torso: number; // deg yaw relative to pelvis
  lean: number; // deg forward bend toward the plate (+Z)
  side: number; // deg side bend (+ = toward catcher, lowers back shoulder)
  head: number; // deg absolute yaw of the head
  headPitch: number;
  grip: V3; // bat grip origin (gear origin) position
  az: number; // deg bat direction azimuth in XZ (0 = +X pitcher, 90 = +Z plate, 180 = -X catcher)
  el: number; // deg bat elevation
  rA: number; // top-hand position along the bat (char units from the bat origin)
  lA: number; // bottom-hand position along the bat
  footL: V3; // front (lead) ankle target
  footR: V3; // back ankle target
  hip: V3; // pelvis offset
  backYaw: number; // back-foot pivot (deg)
  backHeel: number; // back heel lift (deg)
  frontYaw: number; // front foot open toward pitcher (deg)
}

const STANCE: BatPose = {
  pelvis: -8,
  torso: -12,
  lean: 14,
  side: 4,
  head: 72,
  headPitch: 4,
  grip: [-0.5, 1.2, 0.22],
  az: 205,
  el: 58,
  rA: 0.13,
  lA: -0.07,
  footL: [0.36, 0.15, 0.02],
  footR: [-0.34, 0.15, -0.02],
  hip: [-0.03, -0.07, 0],
  backYaw: 0,
  backHeel: 0,
  frontYaw: 10,
};

const key = (t: number, p: Partial<BatPose>, base: BatPose = STANCE) => ({ t, p: { ...base, ...p } as BatPose });

/** The swing: load → stride → hips fire → bat lays flat → contact over the plate → extension → wrap. */
const SWING = [
  key(0, {}),
  key(0.32, { pelvis: -22, torso: -20, grip: [-0.6, 1.24, 0.12], az: 212, el: 52, footL: [0.3, 0.26, 0.04], hip: [-0.09, -0.04, 0], frontYaw: 0, head: 74 }),
  key(0.52, { pelvis: -14, torso: -24, grip: [-0.6, 1.14, 0.16], az: 208, el: 42, footL: [0.44, 0.15, 0.04], hip: [0.0, -0.09, 0], frontYaw: 18, head: 72 }),
  key(0.6, { pelvis: 26, torso: -24, grip: [-0.42, 0.98, 0.3], az: 186, el: 8, footL: [0.44, 0.15, 0.04], hip: [0.05, -0.1, 0], frontYaw: 30, backYaw: 20, head: 70 }),
  key(0.67, { pelvis: 50, torso: -12, lean: 18, side: 10, grip: [-0.04, 0.9, 0.44], az: 96, el: -4, footL: [0.44, 0.15, 0.04], hip: [0.08, -0.1, 0], frontYaw: 40, backYaw: 50, backHeel: 25, head: 64, headPitch: 12 }),
  key(0.75, { pelvis: 70, torso: 8, lean: 14, side: 6, grip: [0.3, 0.98, 0.4], az: 22, el: 4, footL: [0.44, 0.15, 0.04], hip: [0.1, -0.08, 0], frontYaw: 45, backYaw: 72, backHeel: 40, head: 58, headPitch: 6 }),
  key(0.9, { pelvis: 86, torso: 40, lean: 4, side: 0, grip: [0.48, 1.3, 0.12], az: -100, el: 32, footL: [0.44, 0.15, 0.04], hip: [0.1, -0.06, 0], frontYaw: 45, backYaw: 85, backHeel: 45, head: 55, headPitch: -6 }),
  key(1.45, { pelvis: 86, torso: 50, lean: 4, side: 0, grip: [0.48, 1.3, 0.08], az: -108, el: 36, footL: [0.44, 0.15, 0.04], hip: [0.1, -0.06, 0], frontYaw: 45, backYaw: 85, backHeel: 45, head: 58, headPitch: -8 }),
  key(2.05, {}),
];

/** Sacrifice bunt: pivot square to the pitcher, top hand slides up the barrel, catch the ball, reset. */
const BUNT = [
  key(0, {}),
  key(0.38, { pelvis: 40, torso: 30, lean: 20, side: 0, grip: [0.18, 1.0, 0.46], az: 104, el: 14, rA: 0.36, lA: -0.04, footL: [0.4, 0.15, 0.14], footR: [-0.3, 0.15, -0.04], hip: [0.02, -0.14, 0.02], frontYaw: 35, backYaw: 35, head: 78, headPitch: 6 }),
  key(0.85, { pelvis: 42, torso: 32, lean: 22, side: 0, grip: [0.16, 0.98, 0.44], az: 104, el: 12, rA: 0.36, lA: -0.04, footL: [0.4, 0.15, 0.14], footR: [-0.3, 0.15, -0.04], hip: [0.02, -0.15, 0.02], frontYaw: 35, backYaw: 35, head: 80, headPitch: 6 }),
  key(1.0, { pelvis: 40, torso: 28, lean: 22, side: 0, grip: [0.08, 0.96, 0.4], az: 110, el: 10, rA: 0.36, lA: -0.04, footL: [0.4, 0.15, 0.14], footR: [-0.3, 0.15, -0.04], hip: [0.0, -0.15, 0.02], frontYaw: 35, backYaw: 35, head: 76, headPitch: 10 }),
  key(1.55, { pelvis: 40, torso: 28, lean: 20, side: 0, grip: [0.1, 0.98, 0.42], az: 108, el: 12, rA: 0.36, lA: -0.04, footL: [0.4, 0.15, 0.14], footR: [-0.3, 0.15, -0.04], hip: [0.0, -0.14, 0.02], frontYaw: 35, backYaw: 35, head: 76, headPitch: 8 }),
  key(2.1, {}),
];

type Timeline = { t: number; p: BatPose }[];

const SCALAR_KEYS = ['pelvis', 'torso', 'lean', 'side', 'head', 'headPitch', 'az', 'el', 'rA', 'lA', 'backYaw', 'backHeel', 'frontYaw'] as const;
const VEC_KEYS = ['grip', 'footL', 'footR', 'hip'] as const;

interface CompiledTimeline {
  duration: number;
  times: number[];
  ch: Record<string, number[]>;
}

function compile(tl: Timeline): CompiledTimeline {
  const times = tl.map((k) => k.t);
  const ch: Record<string, number[]> = {};
  for (const k of SCALAR_KEYS) ch[k] = tl.map((x) => x.p[k]);
  for (const k of VEC_KEYS) for (let i = 0; i < 3; i++) ch[`${k}${i}`] = tl.map((x) => x.p[k][i]);
  return { duration: times[times.length - 1], times, ch };
}

const TL = { swing: compile(SWING), bunt: compile(BUNT) };
export const SWING_DURATION = TL.swing.duration;
export const BUNT_DURATION = TL.bunt.duration;

function sampleInto(tl: CompiledTimeline, t: number, out: BatPose) {
  for (const k of SCALAR_KEYS) out[k] = sampleChannel(tl.times, tl.ch[k], t);
  for (const k of VEC_KEYS) for (let i = 0; i < 3; i++) out[k][i] = sampleChannel(tl.times, tl.ch[`${k}${i}`], t);
}

function copyPose(src: BatPose, out: BatPose) {
  for (const k of SCALAR_KEYS) out[k] = src[k];
  for (const k of VEC_KEYS) for (let i = 0; i < 3; i++) out[k][i] = src[k][i];
}

function newPose(): BatPose {
  return { ...STANCE, grip: [...STANCE.grip], footL: [...STANCE.footL], footR: [...STANCE.footR], hip: [...STANCE.hip] };
}

export type BatMode = 'stance' | 'swing' | 'bunt';
export type LayerName = 'bat' | 'flex' | 'dance';

const BONES = [
  'hips', 'spine', 'chest', 'head',
  'upperarml', 'lowerarml', 'wristl', 'handl',
  'upperarmr', 'lowerarmr', 'wristr', 'handr',
  'upperlegl', 'lowerlegl', 'footl',
  'upperlegr', 'lowerlegr', 'footr',
] as const;
type BoneName = (typeof BONES)[number];

// scratch
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qs = new THREE.Quaternion();
const _qc = new THREE.Quaternion();
const _hint = new THREE.Vector3();
const _vs = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _gripR = new THREE.Vector3();
const _gripL = new THREE.Vector3();
const _poleR = new THREE.Vector3();
const _poleL = new THREE.Vector3();
const _fist = new THREE.Vector3();
const _hdir = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

interface LayerState {
  weight: number;
  target: number;
  quats: THREE.Quaternion[];
  hipPos: THREE.Vector3;
}

export class ProceduralRig {
  readonly bones: Record<BoneName | 'handslotr' | 'handslotl', THREE.Bone>;
  private charRoot: THREE.Object3D;
  private base: THREE.Quaternion[] = BONES.map(() => new THREE.Quaternion());
  private baseHip = new THREE.Vector3();
  private layers: Record<LayerName, LayerState>;
  private order: LayerName[] = ['bat', 'flex', 'dance'];
  // bind data
  private footBind: Record<'l' | 'r', THREE.Quaternion> = { l: new THREE.Quaternion(), r: new THREE.Quaternion() };
  private slotLocal: Record<'l' | 'r', { p: THREE.Vector3; q: THREE.Quaternion }>;
  private handLocal: Record<'l' | 'r', { p: THREE.Vector3; q: THREE.Quaternion }>;
  /** extra rotation so the fist wraps the handle naturally (handslot frame) */
  readonly gripFix: Record<'l' | 'r', THREE.Quaternion> = { l: new THREE.Quaternion(), r: new THREE.Quaternion() };
  // batting
  batMode: BatMode = 'stance';
  private batTime = 0;
  private pose = newPose();
  private fromPose = newPose();
  private blendT = 1;
  private blendDur = 0;
  private time = 0;
  /** distance (char units) from the top hand down to the bat origin; Player positions the bat with it */
  topHandAlong = STANCE.rA;
  onOneShotDone?: (mode: BatMode) => void;

  constructor(charRoot: THREE.Object3D, bones: Record<string, THREE.Bone>) {
    this.charRoot = charRoot;
    this.bones = bones as ProceduralRig['bones'];
    const mk = (): LayerState => ({ weight: 0, target: 0, quats: BONES.map(() => new THREE.Quaternion()), hipPos: new THREE.Vector3() });
    this.layers = { bat: mk(), flex: mk(), dance: mk() };
    // bind measurements (clone is in rest pose)
    charRoot.updateMatrixWorld(true);
    const rootQInv = worldQuat(charRoot, new THREE.Quaternion()).invert();
    for (const s of ['l', 'r'] as const) {
      worldQuat(this.bones[`foot${s}`], this.footBind[s]).premultiply(rootQInv);
    }
    const loc = (b: THREE.Object3D) => ({ p: b.position.clone(), q: b.quaternion.clone() });
    this.slotLocal = { l: loc(this.bones.handslotl), r: loc(this.bones.handslotr) };
    this.handLocal = { l: loc(this.bones.handl), r: loc(this.bones.handr) };
    // fists: rotate the grip so knuckles face away from the body (calibrated visually)
    this.gripFix.r.setFromAxisAngle(Y, Math.PI / 2);
    this.gripFix.l.setFromAxisAngle(Y, -Math.PI / 2);
  }

  private dirty = false;

  /**
   * Undo last frame's procedural edits before the mixer runs. AnimationMixer only writes a property
   * when its value *changed* since its last write, so un-keyed bones, held poses and frozen time would
   * otherwise keep (and accumulate) last frame's IK result. Restoring the previous mixer output keeps
   * the bones exactly as the mixer believes they are.
   */
  restoreMixerPose() {
    if (!this.dirty) return;
    for (let i = 0; i < BONES.length; i++) this.bones[BONES[i]].quaternion.copy(this.base[i]);
    this.bones.hips.position.copy(this.baseHip);
    this.dirty = false;
  }

  setLayer(name: LayerName | null) {
    for (const n of this.order) this.layers[n].target = n === name ? 1 : 0;
  }

  /** Start a batting timeline (stance loops; swing/bunt are one-shots that return to stance). */
  playBat(mode: BatMode) {
    copyPose(this.pose, this.fromPose);
    this.blendT = 0;
    this.blendDur = this.layers.bat.weight > 0.01 ? (mode === 'stance' ? 0.35 : 0.12) : 0;
    this.batMode = mode;
    this.batTime = 0;
  }

  get batWeight() {
    return this.layers.bat.weight;
  }

  isActive() {
    return this.order.some((n) => this.layers[n].weight > 0.001);
  }

  update(dt: number) {
    this.time += dt;
    this.blendT += dt;
    const fade = Math.min(1, dt / 0.3);
    let any = false;
    for (const n of this.order) {
      const L = this.layers[n];
      const d = L.target - L.weight;
      L.weight = Math.abs(d) < 0.002 ? L.target : L.weight + Math.sign(d) * Math.min(Math.abs(d), fade);
      if (L.weight > 0) any = true;
    }
    if (this.batMode !== 'stance') {
      this.batTime += dt;
      const dur = this.batMode === 'swing' ? SWING_DURATION : BUNT_DURATION;
      if (this.batTime >= dur) {
        const done = this.batMode;
        this.batMode = 'stance';
        this.batTime = 0;
        this.onOneShotDone?.(done);
      }
    }
    if (!any) return;

    this.charRoot.updateMatrixWorld(true);
    const B = this.bones;
    // snapshot mixer pose
    for (let i = 0; i < BONES.length; i++) this.base[i].copy(B[BONES[i]].quaternion);
    this.baseHip.copy(B.hips.position);
    this.dirty = true;

    for (const n of this.order) {
      const L = this.layers[n];
      if (L.weight <= 0) continue;
      this.restoreBase();
      if (n === 'bat') this.applyBat();
      else if (n === 'flex') this.applyFlex();
      else this.applyDance();
      for (let i = 0; i < BONES.length; i++) L.quats[i].copy(B[BONES[i]].quaternion);
      L.hipPos.copy(B.hips.position);
    }
    // compose: base → each layer by weight (smooth-stepped for nicer fades)
    this.restoreBase();
    for (const n of this.order) {
      const L = this.layers[n];
      if (L.weight <= 0) continue;
      const w = L.weight * L.weight * (3 - 2 * L.weight);
      for (let i = 0; i < BONES.length; i++) B[BONES[i]].quaternion.slerp(L.quats[i], w);
      B.hips.position.lerp(L.hipPos, w);
    }
    this.charRoot.updateMatrixWorld(true);
  }

  private restoreBase() {
    const B = this.bones;
    for (let i = 0; i < BONES.length; i++) B[BONES[i]].quaternion.copy(this.base[i]);
    B.hips.position.copy(this.baseHip);
    this.charRoot.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------------ helpers
  private rootQ = new THREE.Quaternion();

  /** char-space point → world */
  private toWorld(p: THREE.Vector3) {
    return p.applyMatrix4(this.charRoot.matrixWorld);
  }

  /** char-space direction → world */
  private dirToWorld(d: THREE.Vector3) {
    return d.applyQuaternion(this.rootQ);
  }

  private yawWorld(bone: THREE.Bone, deg: number) {
    if (!deg) return;
    _q.setFromAxisAngle(_v.copy(Y).applyQuaternion(this.rootQ), deg * DEG);
    rotateWorld(bone, _q);
  }

  private axisWorld(bone: THREE.Bone, axis: THREE.Vector3, deg: number) {
    if (!deg) return;
    _q.setFromAxisAngle(_v.copy(axis).applyQuaternion(this.rootQ), deg * DEG);
    rotateWorld(bone, _q);
  }

  /** Torso: pelvis yaw + shift, spine/chest twist, forward lean, side bend, head aim. */
  private applyTorso(pelvis: number, torso: number, lean: number, side: number, head: number, headPitch: number, hip: V3) {
    const B = this.bones;
    worldPos(B.hips, _v2);
    _v3.set(hip[0], hip[1], hip[2]).applyQuaternion(this.rootQ).multiplyScalar(this.rootScale());
    setWorldPos(B.hips, _v2.add(_v3));
    this.yawWorld(B.hips, pelvis);
    this.axisWorld(B.spine, X, lean * 0.6);
    this.axisWorld(B.spine, Z, -side * 0.6);
    this.yawWorld(B.spine, torso * 0.45);
    this.axisWorld(B.chest, X, lean * 0.4);
    this.axisWorld(B.chest, Z, -side * 0.4);
    this.yawWorld(B.chest, torso * 0.55);
    // head: absolute aim in character space
    _q.setFromAxisAngle(Y, head * DEG);
    _q2.setFromAxisAngle(X, headPitch * DEG);
    _q.multiply(_q2).premultiply(this.rootQ);
    setWorldQuat(B.head, _q);
  }

  private rootScale() {
    return _vs.setFromMatrixScale(this.charRoot.matrixWorld).x;
  }

  private plantFoot(s: 'l' | 'r', target: V3, yawDeg: number, heelDeg: number) {
    const B = this.bones;
    _v2.set(target[0], target[1], target[2]);
    this.toWorld(_v2);
    // knee points forward and slightly out, following the foot's yaw
    _pole.set(s === 'l' ? 0.35 : -0.35, 0, 1).applyAxisAngle(Y, yawDeg * DEG);
    this.dirToWorld(_pole);
    solveTwoBone(B[`upperleg${s}`], B[`lowerleg${s}`], B[`foot${s}`], _v2, _pole);
    _q.setFromAxisAngle(Y, yawDeg * DEG);
    _q2.setFromAxisAngle(X, -heelDeg * DEG);
    _q.multiply(_q2).multiply(this.footBind[s]).premultiply(this.rootQ);
    setWorldQuat(B[`foot${s}`], _q);
  }

  /**
   * Place a hand so its handslot sits at `grip` (world) with handslot +Y along `dir` (world).
   * `pole` is the elbow bend direction (world).
   */
  private placeHand(s: 'l' | 'r', grip: THREE.Vector3, dir: THREE.Vector3, hint: THREE.Vector3, pole: THREE.Vector3) {
    const B = this.bones;
    const sl = this.slotLocal[s];
    const hl = this.handLocal[s];
    const sc = this.rootScale();
    // handslot world rotation
    basisQuat(dir, hint, _qs).multiply(this.gripFix[s]);
    // hand world rotation = slot * inv(slotLocal)
    _qc.copy(sl.q).invert();
    const handQ = _q2.copy(_qs).multiply(_qc);
    // hand world pos = grip - handQ * slotLocalPos
    _v3.copy(sl.p).multiplyScalar(sc).applyQuaternion(handQ);
    const handPos = _v2.copy(grip).sub(_v3);
    // wrist world rot / pos
    _qc.copy(hl.q).invert();
    const wristQ = _q.copy(handQ).multiply(_qc);
    _v3.copy(hl.p).multiplyScalar(sc).applyQuaternion(wristQ);
    handPos.sub(_v3); // now = wrist world position
    solveTwoBone(B[`upperarm${s}`], B[`lowerarm${s}`], B[`wrist${s}`], handPos, pole);
    setWorldQuat(B[`wrist${s}`], wristQ);
    B[`hand${s}`].quaternion.copy(hl.q);
    B[`hand${s}`].updateMatrixWorld(true);
  }

  // ------------------------------------------------------------------ batting
  private samplePose() {
    const p = this.pose;
    if (this.batMode === 'stance') {
      copyPose(STANCE, p);
      // bat waggle + breathing, a hip "rhythm" while waiting on the pitch
      const t = this.time;
      p.az += Math.sin(t * 2.4) * 7;
      p.el += Math.sin(t * 2.4 + 1.2) * 5;
      p.grip[0] += Math.sin(t * 2.4 + 0.4) * 0.02;
      p.grip[1] += Math.sin(t * 1.2) * 0.015;
      p.pelvis += Math.sin(t * 1.2) * 3;
      p.hip[1] += Math.sin(t * 2.4) * 0.008;
    } else {
      sampleInto(this.batMode === 'swing' ? TL.swing : TL.bunt, this.batTime, p);
    }
    if (this.blendT < this.blendDur) {
      // ease from the pose we were in when this timeline started
      const k = this.blendT / this.blendDur;
      const w = 1 - k * k * (3 - 2 * k);
      for (const kk of SCALAR_KEYS) p[kk] += (this.fromPose[kk] - p[kk]) * w;
      for (const kk of VEC_KEYS) for (let i = 0; i < 3; i++) p[kk][i] += (this.fromPose[kk][i] - p[kk][i]) * w;
    }
    return p;
  }

  private applyBat() {
    const B = this.bones;
    worldQuat(this.charRoot, this.rootQ);
    const p = this.samplePose();
    this.topHandAlong = p.rA;

    this.applyTorso(p.pelvis, p.torso, p.lean, p.side, p.head, p.headPitch, p.hip);
    this.plantFoot('l', p.footL, p.frontYaw, 0);
    this.plantFoot('r', p.footR, p.backYaw, p.backHeel);

    // bat frame in world
    const sc = this.rootScale();
    const az = p.az * DEG;
    const el = p.el * DEG;
    _dir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    this.dirToWorld(_dir).normalize();
    const origin = this.toWorld(_origin.set(p.grip[0], p.grip[1], p.grip[2]));
    // knuckles face away from the chest
    worldPos(B.chest, _hint);
    _hint.subVectors(origin, _hint);
    const gripR = _gripR.copy(origin).addScaledVector(_dir, p.rA * sc);
    const gripL = _gripL.copy(origin).addScaledVector(_dir, p.lA * sc);
    // elbows hang down & back; lead elbow slightly in front
    const poleR = this.dirToWorld(_poleR.set(-0.4, -1, -0.5));
    this.placeHand('r', gripR, _dir, _hint, poleR);
    const poleL = this.dirToWorld(_poleL.set(0.3, -1, 0.1));
    this.placeHand('l', gripL, _dir, _hint, poleL);
  }

  // ------------------------------------------------------------------ flex / dance
  private applyFlex() {
    worldQuat(this.charRoot, this.rootQ);
    const t = this.time;
    const pump = 0.5 + 0.5 * Math.sin(t * 3.2);
    // double-biceps: elbows out at shoulder height, fists up beside the helmet, chin up
    this.applyTorso(0, 0, -5 - pump * 3, 0, 0, -10 - pump * 4, [0, -0.05 - pump * 0.015, 0]);
    this.plantFoot('l', [0.3, 0.15, 0.02], 20, 0);
    this.plantFoot('r', [-0.3, 0.15, 0.02], -20, 0);
    for (const s of ['l', 'r'] as const) {
      const sx = s === 'l' ? 1 : -1;
      const fist = this.toWorld(_fist.set(sx * (0.62 + pump * 0.015), 1.32 + pump * 0.04, 0.1));
      const pole = this.dirToWorld(_poleR.set(sx * 1, -0.25, -0.35));
      const dir = this.dirToWorld(_hdir.set(0, 0.3, 1)).normalize();
      const hint = this.dirToWorld(_hint.set(-sx, 0, 0));
      this.placeHand(s, fist, dir, hint, pole);
    }
  }

  private applyDance() {
    worldQuat(this.charRoot, this.rootQ);
    const t = this.time * 1.0;
    const beat = t * Math.PI * 2 * 1.05; // ~126 bpm half-time groove
    const bounce = Math.abs(Math.sin(beat)) * 0.05;
    const sway = Math.sin(beat * 0.5);
    this.applyTorso(sway * 22, -sway * 16, 6, sway * 8, -sway * 12, -6 + Math.sin(beat) * 6, [sway * 0.05, -0.06 + bounce, 0]);
    this.plantFoot('l', [0.3, 0.15 + Math.max(0, -sway) * 0.07, 0.04], 15 + sway * 10, 0);
    this.plantFoot('r', [-0.3, 0.15 + Math.max(0, sway) * 0.07, 0.04], -15 + sway * 10, 0);
    for (const s of ['l', 'r'] as const) {
      const sx = s === 'l' ? 1 : -1;
      const ph = beat + (s === 'l' ? 0 : Math.PI);
      // "raise the roof" pumps alternating with a shoulder shimmy
      const up = 0.5 + 0.5 * Math.sin(ph);
      const fist = this.toWorld(_fist.set(sx * (0.55 + 0.05 * up), 1.0 + up * 0.55, 0.28 - up * 0.08));
      const pole = this.dirToWorld(_poleR.set(sx, -0.8, -0.4));
      const dir = this.dirToWorld(_hdir.set(sx * -0.2, 1, 0.3)).normalize();
      const hint = this.dirToWorld(_hint.set(0, 0, 1));
      this.placeHand(s, fist, dir, hint, pole);
    }
  }
}

