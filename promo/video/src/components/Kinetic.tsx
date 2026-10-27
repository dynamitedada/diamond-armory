import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C, DISPLAY } from '../theme';

export interface Line { text: string; color?: string; size?: number; gradient?: boolean; at?: number }

/**
 * Slam-in display type. Each word drops in with a spring, a motion blur and a slight overshoot;
 * the whole block punches out over the last frames of its Sequence.
 */
export const Kinetic: React.FC<{
  lines: Line[]; duration: number; align?: 'center' | 'left' | 'right'; stagger?: number; y?: number; x?: number;
  exit?: boolean; shadow?: boolean;
}> = ({ lines, duration, align = 'center', stagger = 3, y = 50, x = 50, exit = true, shadow = true }) => {
  const f = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const k = width / 1920;
  const out = exit ? interpolate(f, [duration - 7, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) }) : 0;
  let wi = 0;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', left: `${x}%`, top: `${y}%`,
        transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'}, -50%) scale(${1 + out * 0.12})`,
        opacity: 1 - out, filter: `blur(${out * 14}px)`, textAlign: align, width: 'max-content', maxWidth: `${width * 0.92}px`,
      }}>
        {lines.map((ln, li) => (
          <div key={li} style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', gap: `${0.22 * (ln.size ?? 150) * k}px`, flexWrap: 'wrap' }}>
            {ln.text.split(' ').map((w, i) => {
              const delay = (ln.at ?? 0) + wi++ * stagger;
              const sp = spring({ frame: f - delay, fps, config: { damping: 13, stiffness: 180, mass: 0.7 } });
              const vis = f >= delay;
              const size = (ln.size ?? 150) * k;
              return (
                <span key={i} style={{
                  fontFamily: DISPLAY, fontSize: size, lineHeight: 0.92, letterSpacing: '0.01em', display: 'inline-block',
                  color: ln.gradient ? 'transparent' : ln.color ?? C.white,
                  backgroundImage: ln.gradient ? `linear-gradient(100deg, ${C.gold} 0%, #ffe680 35%, ${C.magenta} 100%)` : undefined,
                  WebkitBackgroundClip: ln.gradient ? 'text' : undefined, backgroundClip: ln.gradient ? 'text' : undefined,
                  opacity: vis ? Math.min(1, sp * 1.6) : 0,
                  transform: `translateY(${(1 - sp) * 0.45 * size}px) scale(${1.25 - 0.25 * sp})`,
                  filter: `blur(${Math.max(0, (1 - sp) * 10)}px)${shadow ? ' drop-shadow(0 6px 24px rgba(0,0,0,.65))' : ''}`,
                }}>{w}</span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
