import { AbsoluteFill, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C } from '../theme';
import { createContext, useContext } from 'react';

// Lets <Footage> inside a <Screen> lay out against the source size rather than the composition.
const SizeCtx = createContext<{ w: number; h: number } | null>(null);
const WithSize: React.FC<{ w: number; h: number; children: React.ReactNode }> = ({ w, h, children }) => (
  <SizeCtx.Provider value={{ w, h }}><div style={{ position: 'relative', width: w, height: h }}>{children}</div></SizeCtx.Provider>
);

export interface Crop { x: number; y: number; s: number } // centre in source px (1920x1080) + zoom

/** A recorded take of the real armory page. `from` is in seconds into the take. */
export const Footage: React.FC<{
  src: string; from?: number; duration: number; push?: [number, number]; crop?: Crop; cropTo?: Crop; rate?: number; dim?: number;
}> = ({ src, from = 0, duration, push = [1, 1.04], crop, cropTo, rate = 1, dim = 0 }) => {
  const f = useCurrentFrame();
  const cfg = useVideoConfig();
  const box = useContext(SizeCtx);
  const width = box?.w ?? cfg.width, height = box?.h ?? cfg.height;
  const p = interpolate(f, [0, duration], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const c0 = crop ?? { x: 960, y: 540, s: 1 };
  const c1 = cropTo ?? c0;
  const cx = c0.x + (c1.x - c0.x) * p, cy = c0.y + (c1.y - c0.y) * p;
  const zs = c0.s * Math.pow(c1.s / c0.s, p) * (push[0] + (push[1] - push[0]) * p);
  // cover the composition with the 1920x1080 source, then zoom about (cx, cy)
  const base = Math.max(width / 1920, height / 1080);
  const sc = base * zs;
  const tx = width / 2 - cx * sc, ty = height / 2 - cy * sc;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: C.ink }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${sc})` }}>
        <OffthreadVideo src={staticFile(`footage/${src}.mp4`)} startFrom={Math.round(from * 30)} playbackRate={rate} muted style={{ width: 1920, height: 1080 }} />
      </div>
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(5,6,15,${dim})` }} />}
    </AbsoluteFill>
  );
};

/** Footage presented as a floating, tilted screen over the backdrop (premium product-shot look). */
export const Screen: React.FC<{
  src: string; from?: number; duration: number; crop?: Crop; cropTo?: Crop; tilt?: [number, number]; scale?: number; x?: number; y?: number; rate?: number;
}> = ({ src, from = 0, duration, crop, cropTo, tilt = [-9, -3], scale = 0.8, x = 0, y = 0, rate }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = interpolate(f, [0, duration], [0, 1], { extrapolateRight: 'clamp' });
  const ry = tilt[0] + (tilt[1] - tilt[0]) * Easing.out(Easing.cubic)(p);
  const enter = interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const w = width * scale, h = (w * 9) / 16;
  return (
    <AbsoluteFill style={{ perspective: 2200 }}>
      <div style={{
        position: 'absolute', left: (width - w) / 2 + x, top: (height - h) / 2 + y, width: w, height: h,
        transform: `rotateY(${ry}deg) rotateX(${3 - p * 2}deg) translateZ(${(1 - enter) * -300}px)`, opacity: enter,
        borderRadius: 18 * (width / 1920), overflow: 'hidden',
        boxShadow: `0 40px 120px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.10), 0 0 80px rgba(255,43,214,.22)`,
      }}>
        <div style={{ width: 1920, height: 1080, transform: `scale(${w / 1920})`, transformOrigin: '0 0' }}>
          <WithSize w={1920} h={1080}><Footage src={src} from={from} duration={duration} crop={crop} cropTo={cropTo} push={[1, 1.02]} rate={rate} /></WithSize>
        </div>
        <AbsoluteFill style={{ background: 'linear-gradient(120deg, rgba(255,255,255,.10) 0%, transparent 30%, transparent 70%, rgba(255,255,255,.04) 100%)' }} />
      </div>
    </AbsoluteFill>
  );
};

