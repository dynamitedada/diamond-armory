import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../theme';

/** Night-game backdrop: deep navy, drifting stadium-light glows, faint diamond lattice. */
export const Backdrop: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g1x = 30 + Math.sin(f / 90) * 8, g1y = 35 + Math.cos(f / 110) * 6;
  const g2x = 72 + Math.cos(f / 100) * 7, g2y = 62 + Math.sin(f / 80) * 6;
  const cell = Math.round(Math.min(width, height) / 7);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 60% at ${g1x}% ${g1y}%, rgba(255,43,214,${0.28 * intensity}) 0%, transparent 70%),
            radial-gradient(ellipse 50% 55% at ${g2x}% ${g2y}%, rgba(74,215,255,${0.18 * intensity}) 0%, transparent 70%),
            radial-gradient(ellipse 80% 80% at 50% 110%, rgba(255,209,0,${0.10 * intensity}) 0%, transparent 70%),
            linear-gradient(180deg, #0b0d1f 0%, #05060f 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.09 * intensity,
          backgroundImage: `linear-gradient(45deg, rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(-45deg, rgba(255,255,255,.9) 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: `${(f * 0.6) % cell}px ${(f * 0.3) % cell}px`,
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 80%)',
        }}
      />
      <Bokeh />
    </AbsoluteFill>
  );
};

const DOTS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37.3) % 100, y: (i * 61.7) % 100, r: 4 + ((i * 13) % 18), sp: 0.15 + ((i * 7) % 10) / 30,
  c: [C.gold, C.magenta, C.cyan, '#ffffff'][i % 4],
}));
const Bokeh: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {DOTS.map((d, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${d.x}%`, top: `${(d.y - f * d.sp * 0.08 + 100) % 100}%`,
          width: d.r * 2, height: d.r * 2, borderRadius: '50%', background: d.c,
          opacity: 0.06 + 0.06 * Math.sin(f / 20 + i), filter: `blur(${d.r / 3}px)`,
        }} />
      ))}
    </AbsoluteFill>
  );
};

/** Film grain + vignette that sits over everything for a cohesive finish. */
export const Finish: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 60%, rgba(0,0,0,.45) 100%)' }} />
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.07, mixBlendMode: 'overlay' }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
