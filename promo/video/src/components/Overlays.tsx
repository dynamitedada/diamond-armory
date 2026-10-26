import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BODY, C, DISPLAY } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Lower-third: small kicker chip + big display line, revealed by a sliding mask. */
export const Caption: React.FC<{
  kicker?: string; text: string; highlight?: string; duration: number; pos?: 'bl' | 'br' | 'tl' | 'tr' | 'bc'; color?: string; size?: number;
}> = ({ kicker, text, highlight, duration, pos = 'bl', color = C.gold, size = 92 }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = width / 1920;
  const inP = spring({ frame: f, fps, config: { damping: 18, stiffness: 140 } });
  const outP = interpolate(f, [duration - 8, duration], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const vertical = height > width;
  const pad = (vertical ? 70 : 96) * k;
  const style: React.CSSProperties = { position: 'absolute', maxWidth: width - pad * 2 };
  if (pos[0] === 'b') style.bottom = (vertical ? 300 : 92) * k; else style.top = (vertical ? 260 : 92) * k;
  if (pos === 'bc') { style.left = '50%'; style.transform = 'translateX(-50%)'; style.textAlign = 'center'; }
  else if (pos[1] === 'l') style.left = pad; else { style.right = pad; style.textAlign = 'right'; }
  const parts = highlight ? text.split(highlight) : [text];
  const fs = size * k * (vertical ? 1.1 : 1);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ ...style, opacity: 1 - outP, filter: `blur(${outP * 8}px)` }}>
        {kicker && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10 * k, padding: `${8 * k}px ${16 * k}px`, borderRadius: 999,
            background: 'rgba(5,6,15,.72)', border: `1px solid ${color}55`, color, fontFamily: BODY, fontWeight: 700,
            fontSize: 20 * k * (vertical ? 1.3 : 1), letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 * k,
            transform: `translateY(${(1 - inP) * 20}px)`, opacity: inP, backdropFilter: 'blur(6px)',
          }}>
            <span style={{ width: 9 * k, height: 9 * k, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}`, opacity: 0.6 + 0.4 * Math.sin(f / 4) }} />
            {kicker}
          </div>
        )}
        <div style={{ overflow: 'hidden', paddingBottom: 6 * k }}>
          <div style={{
            fontFamily: DISPLAY, fontSize: fs, lineHeight: 0.95, color: C.white, letterSpacing: '0.01em',
            transform: `translateY(${(1 - inP) * 110}%)`, textShadow: '0 6px 30px rgba(0,0,0,.7)',
          }}>
            {parts.map((p, i) => (
              <span key={i}>{p}{i < parts.length - 1 && <span style={{ color }}>{highlight}</span>}</span>
            ))}
          </div>
        </div>
        <div style={{ height: 4 * k, marginTop: 10 * k, width: `${inP * 100}%`, maxWidth: 220 * k, background: `linear-gradient(90deg, ${color}, ${C.magenta})`, borderRadius: 4, marginLeft: pos[1] === 'r' ? 'auto' : pos === 'bc' ? 'auto' : 0, marginRight: pos === 'bc' ? 'auto' : 0 }} />
      </div>
    </AbsoluteFill>
  );
};

/** Short exposure flash on a hit. */
export const Flash: React.FC<{ color?: string; length?: number; peak?: number }> = ({ color = '#fff', length = 9, peak = 0.85 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 1, length], [peak, peak, 0], { ...clamp, easing: Easing.out(Easing.quad) });
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: 'screen', pointerEvents: 'none' }} />;
};

/** Baseball-diamond wipe: a rotated square grows from the centre revealing `children`. */
export const DiamondWipe: React.FC<{ length?: number; children: React.ReactNode; edge?: string }> = ({ length = 12, children, edge = C.gold }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = interpolate(f, [0, length], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const r = p * (width + height) * 0.75;
  const cx = width / 2, cy = height / 2;
  const poly = `polygon(${cx}px ${cy - r}px, ${cx + r}px ${cy}px, ${cx}px ${cy + r}px, ${cx - r}px ${cy}px)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: p >= 1 ? undefined : poly }}>{children}</AbsoluteFill>
      {p < 1 && (
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} fill="none" stroke={edge} strokeWidth={6} style={{ filter: `drop-shadow(0 0 14px ${edge})` }} />
        </svg>
      )}
    </AbsoluteFill>
  );
};

/** Diagonal light streak that sweeps across on a cut. */
export const Streak: React.FC<{ length?: number; color?: string; reverse?: boolean }> = ({ length = 14, color = C.gold, reverse }) => {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const p = interpolate(f, [0, length], [-0.4, 1.4], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const x = (reverse ? 1 - p : p) * width;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
      <div style={{ position: 'absolute', left: x - width * 0.15, top: '-30%', width: width * 0.3, height: '160%', transform: 'rotate(18deg)',
        background: `linear-gradient(90deg, transparent, ${color}22 35%, ${color}aa 50%, ${color}22 65%, transparent)`, filter: 'blur(8px)' }} />
    </AbsoluteFill>
  );
};

/** The Diamond Armory wordmark with a spinning diamond glyph. */
export const Logo: React.FC<{ scale?: number; delay?: number }> = ({ scale = 1, delay = 0 }) => {
  const f = useCurrentFrame() - delay;
  const { fps, width } = useVideoConfig();
  const k = (width / 1920) * scale;
  const sp = spring({ frame: f, fps, config: { damping: 12, stiffness: 120, mass: 0.9 } });
  const sp2 = spring({ frame: f - 6, fps, config: { damping: 14, stiffness: 120 } });
  const shine = interpolate(f, [10, 40], [-30, 130], clamp);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 * k, opacity: f < 0 ? 0 : 1 }}>
      <svg width={150 * k} height={150 * k} viewBox="-60 -60 120 120" style={{ transform: `scale(${sp}) rotate(${(1 - sp) * -180}deg)`, filter: `drop-shadow(0 0 30px ${C.magenta}88)` }}>
        <defs>
          <linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.gold} /><stop offset="1" stopColor={C.magenta} /></linearGradient>
        </defs>
        <rect x="-38" y="-38" width="76" height="76" rx="8" transform="rotate(45)" fill="none" stroke="url(#dg)" strokeWidth="7" />
        <rect x="-20" y="-20" width="40" height="40" rx="4" transform="rotate(45)" fill="url(#dg)" opacity="0.9" />
        {[[0, -54], [54, 0], [0, 54], [-54, 0]].map(([x, y], i) => <rect key={i} x={x - 6} y={y - 6} width="12" height="12" transform={`rotate(45 ${x} ${y})`} fill="#fff" />)}
      </svg>
      <div style={{ position: 'relative', fontFamily: DISPLAY, fontSize: 190 * k, lineHeight: 0.9, letterSpacing: '0.04em', color: C.white,
        transform: `translateY(${(1 - sp2) * 60 * k}px)`, opacity: sp2, textShadow: `0 8px 40px rgba(0,0,0,.6)`, whiteSpace: 'nowrap' }}>
        DIAMOND <span style={{ backgroundImage: `linear-gradient(100deg, ${C.gold}, #ffe680 40%, ${C.magenta})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: 'none', filter: 'drop-shadow(0 8px 30px rgba(0,0,0,.5))' }}>ARMORY</span>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg, rgba(255,255,255,0) ${shine - 12}%, rgba(255,255,255,.55) ${shine}%, rgba(255,255,255,0) ${shine + 12}%)`, mixBlendMode: 'overlay' }} />
      </div>
    </div>
  );
};

/** Big animated OVR counter callout, styled like the header badge in the app. */
export const OvrCallout: React.FC<{ from: number; to: number; start: number; end: number; label?: string }> = ({ from, to, start, end, label = 'OVERALL' }) => {
  const f = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const k = width / 1920;
  const v = Math.round(interpolate(f, [start, end], [from, to], { ...clamp, easing: Easing.out(Easing.cubic) }));
  const pop = spring({ frame: f - end, fps, config: { damping: 9, stiffness: 200 } });
  const inP = spring({ frame: f, fps, config: { damping: 16 } });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 * k, padding: `${18 * k}px ${30 * k}px`, borderRadius: 20 * k,
      background: 'rgba(5,6,15,.78)', border: `1px solid ${C.gold}55`, boxShadow: `0 20px 60px rgba(0,0,0,.5), 0 0 40px ${C.gold}22`,
      transform: `scale(${(0.8 + 0.2 * inP) * (1 + 0.08 * Math.sin(Math.PI * Math.min(1, pop)))})`, opacity: inP, backdropFilter: 'blur(8px)' }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 150 * k, lineHeight: 0.85, backgroundImage: `linear-gradient(180deg, #fff6b0, ${C.gold} 60%, #c99a00)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontVariantNumeric: 'tabular-nums', minWidth: 160 * k, textAlign: 'center' }}>{v}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 44 * k, color: C.white, letterSpacing: '0.06em', lineHeight: 1 }}>
        {label}
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 18 * k, color: '#39ff88', letterSpacing: '0.1em', marginTop: 6 * k, opacity: f > start ? 1 : 0 }}>▲ +{Math.max(0, v - from)}</div>
      </div>
    </div>
  );
};
