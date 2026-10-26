/**
 * AnimationName → mixer clip + procedural layer mapping, with cross-fades through one AnimationMixer.
 */
import * as THREE from 'three';
import type { AnimationName } from '../data/types';
import { ProceduralRig, type BatMode, type LayerName } from './proceduralRig';

interface AnimSpec {
  /** KayKit clip driving the base pose (legs/breathing/secondary motion). */
  clip: string;
  /** procedural layer on top (batting rig, flex, dance) */
  layer: LayerName | null;
  bat?: BatMode;
  once?: boolean;
  /** what to fall back to when a one-shot finishes */
  then?: AnimationName;
  timeScale?: number;
}

export const ANIMS: Record<AnimationName, AnimSpec> = {
  idle: { clip: 'Idle', layer: null },
  stance: { clip: '2H_Melee_Idle', layer: 'bat', bat: 'stance' },
  swing: { clip: '2H_Melee_Idle', layer: 'bat', bat: 'swing', once: true, then: 'stance' },
  bunt: { clip: '2H_Melee_Idle', layer: 'bat', bat: 'bunt', once: true, then: 'stance' },
  celebrate: { clip: 'Cheer', layer: null, once: true, then: 'idle' },
  dance: { clip: 'Unarmed_Idle', layer: 'dance' },
  walk: { clip: 'Walking_A', layer: null },
  flex: { clip: 'Unarmed_Idle', layer: 'flex' },
};

/** Animations during which the batter wears the helmet (if both helmet & cap are equipped). */
export const BATTING_ANIMS: ReadonlySet<AnimationName> = new Set(['stance', 'swing', 'bunt']);

const FADE = 0.3;

export class AnimationController {
  readonly mixer: THREE.AnimationMixer;
  readonly rig: ProceduralRig;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  /** effective animation currently shown (one-shots fall back to `then`) */
  shown: AnimationName = 'idle';
  onShownChange?: (a: AnimationName) => void;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[], bones: Record<string, THREE.Bone>) {
    this.mixer = new THREE.AnimationMixer(root);
    const needed = new Set(Object.values(ANIMS).map((a) => a.clip));
    for (const clip of clips) {
      if (!needed.has(clip.name)) continue;
      // drop scale tracks (constant 1) and IK-control tracks: less work per frame
      const c = clip.clone();
      c.tracks = c.tracks.filter((t) => !t.name.endsWith('.scale') && !/IK|control-/.test(t.name));
      this.actions.set(clip.name, this.mixer.clipAction(c));
    }
    this.rig = new ProceduralRig(root, bones);
    this.rig.onOneShotDone = () => {
      if (ANIMS[this.shown].bat && ANIMS[this.shown].once) this.setShown(ANIMS[this.shown].then ?? 'stance');
    };
    this.mixer.addEventListener('finished', (e) => {
      const spec = ANIMS[this.shown];
      if (spec.once && !spec.bat && e.action === this.current) this.play(spec.then ?? 'idle');
    });
  }

  private setShown(a: AnimationName) {
    this.shown = a;
    this.onShownChange?.(a);
  }

  play(name: AnimationName) {
    const spec = ANIMS[name] ?? ANIMS.idle;
    const action = this.actions.get(spec.clip) ?? this.actions.get('Idle')!;
    if (action !== this.current || spec.once) {
      action.reset();
      action.setLoop(spec.once && !spec.bat ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = !!spec.once;
      action.timeScale = spec.timeScale ?? 1;
      action.enabled = true;
      action.setEffectiveWeight(1);
      if (this.current && this.current !== action) action.crossFadeFrom(this.current, FADE, false);
      else if (!this.current) action.fadeIn(FADE);
      action.play();
      this.current = action;
    }
    this.rig.setLayer(spec.layer);
    if (spec.bat) this.rig.playBat(spec.bat);
    this.setShown(name);
  }

  update(dt: number) {
    this.rig.restoreMixerPose();
    this.mixer.update(dt);
    this.rig.update(dt);
  }

  /** Stop everything. The controller stays usable (React StrictMode re-runs effects after cleanup). */
  dispose() {
    this.mixer.stopAllAction();
    this.current = null;
  }
}
