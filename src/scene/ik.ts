/** Tiny allocation-free IK / bone helpers (world-space, assumes uniform scale on the rig). */
import * as THREE from 'three';

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _e = new THREE.Vector3();
const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _rq = new THREE.Quaternion();
const _wqP = new THREE.Vector3();
const _wqS = new THREE.Vector3();

export function worldPos(o: THREE.Object3D, out: THREE.Vector3) {
  return out.setFromMatrixPosition(o.matrixWorld);
}

/** World quaternion straight from matrixWorld (no updateWorldMatrix side effects). */
export function worldQuat(o: THREE.Object3D, out: THREE.Quaternion) {
  o.matrixWorld.decompose(_wqP, out, _wqS);
  return out;
}

/** Set a bone's world orientation (parent matrixWorld must be current). Updates the bone subtree. */
export function setWorldQuat(bone: THREE.Object3D, q: THREE.Quaternion, update = true) {
  worldQuat(bone.parent!, _q2).invert();
  bone.quaternion.copy(_q2.multiply(q));
  if (update) bone.updateMatrixWorld(true);
}

/** Pre-multiply a world-space rotation onto a bone. */
export function rotateWorld(bone: THREE.Object3D, q: THREE.Quaternion, update = true) {
  worldQuat(bone, _rq);
  _rq.premultiply(q);
  setWorldQuat(bone, _rq, update);
}

/** Set a bone's world position (parent matrixWorld must be current). */
export function setWorldPos(bone: THREE.Object3D, p: THREE.Vector3, update = true) {
  _m.copy(bone.parent!.matrixWorld).invert();
  bone.position.copy(_t.copy(p).applyMatrix4(_m));
  if (update) bone.updateMatrixWorld(true);
}

/**
 * Analytic two-bone IK: rotate `upper` and `mid` so that `end` lands on `target`, bending toward `pole`
 * (a world-space direction). Bone lengths are measured from the current pose.
 */
export function solveTwoBone(
  upper: THREE.Object3D,
  mid: THREE.Object3D,
  end: THREE.Object3D,
  target: THREE.Vector3,
  pole: THREE.Vector3,
) {
  worldPos(upper, _a);
  worldPos(mid, _b);
  worldPos(end, _c);
  const l1 = _a.distanceTo(_b);
  const l2 = _b.distanceTo(_c);
  _d.subVectors(target, _a);
  let dist = _d.length();
  if (dist < 1e-5) return;
  _d.divideScalar(dist);
  dist = THREE.MathUtils.clamp(dist, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
  // pole direction orthogonal to the reach axis
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_p.lengthSq() < 1e-8) _p.set(0, -1, 0).addScaledVector(_d, -_d.y);
  _p.normalize();
  const cosA = THREE.MathUtils.clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  // desired elbow
  _e.copy(_a).addScaledVector(_d, cosA * l1).addScaledVector(_p, sinA * l1);
  // aim upper bone at elbow
  _b.sub(_a).normalize();
  _t.copy(_e).sub(_a).normalize();
  _q.setFromUnitVectors(_b, _t);
  rotateWorld(upper, _q);
  // aim mid bone at (clamped) target
  worldPos(mid, _b);
  worldPos(end, _c);
  _c.sub(_b).normalize();
  _t.copy(_a).addScaledVector(_d, dist).sub(_b).normalize();
  _q.setFromUnitVectors(_c, _t);
  rotateWorld(mid, _q);
}

/** Build a world rotation whose local +Y = `y` and whose local +Z is as close as possible to `zHint`. */
export function basisQuat(y: THREE.Vector3, zHint: THREE.Vector3, out: THREE.Quaternion) {
  _b.copy(y).normalize();
  _c.copy(zHint).addScaledVector(_b, -zHint.dot(_b));
  if (_c.lengthSq() < 1e-8) _c.set(0, 0, 1).addScaledVector(_b, -_b.z);
  _c.normalize();
  _a.crossVectors(_b, _c); // x = y × z
  _m.makeBasis(_a, _b, _c);
  return out.setFromRotationMatrix(_m);
}

/** Hermite-spline sampler over keyframed scalar channels (non-uniform Catmull-Rom tangents). */
export function sampleChannel(times: number[], values: number[], t: number): number {
  const n = times.length;
  if (t <= times[0]) return values[0];
  if (t >= times[n - 1]) return values[n - 1];
  let i = 0;
  while (i < n - 2 && t > times[i + 1]) i++;
  const t0 = times[i];
  const t1 = times[i + 1];
  const h = t1 - t0;
  const s = (t - t0) / h;
  const v0 = values[i];
  const v1 = values[i + 1];
  // tangents (zero at ends and at "hold" keys where neighbours are equal)
  const m0 = i > 0 ? ((v1 - values[i - 1]) / (t1 - times[i - 1])) * h : 0;
  const m1 = i < n - 2 ? ((values[i + 2] - v0) / (times[i + 2] - t0)) * h : 0;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * m1;
}
