import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, Finish } from './components/Backdrop';
import { Kinetic } from './components/Kinetic';
import { Footage, Screen } from './components/Footage';
import { Caption, DiamondWipe, Flash, Logo, OvrCallout, Streak } from './components/Overlays';
import { BODY, C, DISPLAY, s } from './theme';

export const PROMO_SECONDS = 64;

/** One SFX hit at an absolute time (seconds). */
const Sfx: React.FC<{ at: number; name: string; vol?: number }> = ({ at, name, vol = 0.6 }) => (
  <Sequence from={s(at)} durationInFrames={s(3.2)} layout="none"><Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={vol} /></Sequence>
);
/** A scene placed at [a, b) seconds. */
const At: React.FC<{ a: number; b: number; children: React.ReactNode; name?: string }> = ({ a, b, children, name }) => (
  <Sequence from={s(a)} durationInFrames={s(b - a)} name={name}>{children}</Sequence>
);

export const Promo: React.FC = () => {
  const { height, width } = useVideoConfig();
  const V = height > width; // vertical cut
  return (
    <AbsoluteFill style={{ background: C.ink, fontFamily: BODY }}>
      <Audio src={staticFile('audio/music.wav')} volume={(f) => interpolate(f, [0, 6], [0, 0.9], { extrapolateRight: 'clamp' })} />

      {/* ── 0–4 s · cold open */}
      <At a={0} b={4} name="cold open">
        <Backdrop intensity={0.6} />
        <Sequence from={s(0.25)} durationInFrames={s(1.75)}><Kinetic duration={s(1.75)} lines={[{ text: 'EVERY PLAYER', size: V ? 170 : 150 }, { text: 'HAS A BAG.', size: V ? 170 : 150, color: C.gold }]} /></Sequence>
        <Sequence from={s(2.0)} durationInFrames={s(2.0)}><Kinetic duration={s(2.0)} exit={false} lines={[{ text: "WHAT'S IN", size: V ? 190 : 170 }, { text: 'YOURS?', size: V ? 260 : 230, gradient: true }]} /></Sequence>
      </At>

      {/* ── 4–6.5 s · logo slam over the page booting */}
      <At a={4} b={6.5} name="logo">
        <Footage src="boot" from={0.2} duration={s(2.5)} push={[1.12, 1.18]} dim={0.55} />
        <AbsoluteFill style={{ backdropFilter: 'blur(14px)' }} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}><Logo scale={V ? 0.8 : 1} /></AbsoluteFill>
        <Sequence from={s(1.0)}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ marginTop: (V ? 520 : 420) * (width / 1920), fontFamily: BODY, fontWeight: 600, color: C.white, opacity: 0.85, letterSpacing: '0.32em', fontSize: (V ? 34 : 26) * (width / 1920), textTransform: 'uppercase' }}>
              Your gear · Your game · Your player
            </div>
          </AbsoluteFill>
        </Sequence>
        <Flash length={10} />
      </At>

      {/* ── 6.5–10 s · the real page loads in */}
      <At a={6.5} b={10} name="boot">
        <DiamondWipe length={10}>
          <Footage src="boot" from={1.6} duration={s(3.5)} push={[1.0, 1.06]} crop={V ? { x: 960, y: 520, s: 1 } : undefined} />
        </DiamondWipe>
        <Sequence from={s(0.5)}><Caption kicker="Diamond Armory" text="MEET YOUR ARMORY." highlight="ARMORY." duration={s(3.0)} pos={V ? 'bc' : 'bl'} /></Sequence>
      </At>

      {/* ── 10–16 s · hero orbit */}
      <At a={10} b={16} name="hero">
        <Footage src="hero" from={1.0} duration={s(6)} push={[1.0, 1.05]} crop={V ? { x: 960, y: 540, s: 1 } : undefined} />
        <Streak length={14} />
        <Sequence from={s(0.4)} durationInFrames={s(2.6)}><Kinetic duration={s(2.6)} align={V ? 'center' : 'left'} x={V ? 50 : 6} y={V ? 18 : 50} lines={[{ text: 'A 3D PLAYER', size: 120 }, { text: 'BUILT FROM', size: 120 }, { text: 'YOUR GEAR.', size: 140, gradient: true }]} /></Sequence>
        <Sequence from={s(3.0)} durationInFrames={s(3.0)}><Kinetic duration={s(3.0)} align={V ? 'center' : 'right'} x={V ? 50 : 94} y={V ? 82 : 50} lines={[{ text: 'SO IT LOOKS', size: 120 }, { text: 'LIKE YOU.', size: 150, color: C.gold }]} /></Sequence>
      </At>

      {/* ── 16–22 s · slots & tooltips */}
      <At a={16} b={22} name="tooltips">
        <Backdrop />
        {V ? <Footage src="tooltips" from={0.3} duration={s(6)} push={[1, 1.03]} crop={{ x: 700, y: 560, s: 1 }} />
           : <Screen src="tooltips" from={0.3} duration={s(6)} tilt={[10, 3]} scale={0.74} x={150} y={20} />}
        {!V && <Sequence from={s(0.3)} durationInFrames={s(5.5)}><Kinetic duration={s(5.5)} align="left" x={4} y={50} stagger={4} lines={[{ text: '16', size: 220, gradient: true }, { text: 'GEAR SLOTS', size: 90 }, { text: 'HELMET', size: 60, color: C.dim, at: 30 }, { text: 'TO CLEATS', size: 60, color: C.dim, at: 34 }]} /></Sequence>}
        {V && <Sequence from={s(0.3)}><Caption kicker="16 gear slots" text="HELMET TO CLEATS." highlight="CLEATS." duration={s(5.5)} pos="bc" /></Sequence>}
        <Sequence from={s(3.0)}><Caption kicker="Hover any slot" text="STATS. PERKS. SET BONUSES." highlight="SET BONUSES." duration={s(3.0)} pos={V ? 'tl' : 'tr'} size={V ? 70 : 62} /></Sequence>
      </At>

      {/* ── 22–30 s · bat swap, live */}
      <At a={22} b={30} name="batswap">
        <Footage src="batswap" from={1.8} rate={1.25} duration={s(8)} push={[1, 1.04]} crop={V ? { x: 1000, y: 560, s: 1 } : undefined} />
        <Flash length={8} peak={0.5} />
        <Sequence from={s(0.3)}><Caption kicker="New bat this season?" text="EQUIP IT. SEE IT LIVE." highlight="SEE IT LIVE." duration={s(4.6)} pos={V ? 'bc' : 'br'} /></Sequence>
        <Sequence from={s(5.2)}><Caption kicker="Your lumber" text="YOUR SWING." highlight="SWING." duration={s(2.8)} pos={V ? 'bc' : 'bl'} color={C.magenta} /></Sequence>
      </At>

      {/* ── 30–32 s · jersey */}
      <At a={30} b={32} name="jersey">
        <Footage src="jersey" from={3.6} duration={s(2)} push={[1.02, 1.08]} crop={V ? { x: 1150, y: 560, s: 1 } : undefined} />
        <Streak length={12} reverse color={C.cyan} />
        <Kinetic duration={s(2)} align={V ? 'center' : 'right'} x={V ? 50 : 95} y={V ? 82 : 22} lines={[{ text: 'YOUR', size: 110 }, { text: 'COLORS.', size: 160, color: C.cyan }]} />
      </At>

      {/* ── 32–34 s · breakdown */}
      <At a={32} b={34} name="break">
        <Backdrop intensity={0.4} />
        <Kinetic duration={s(2)} lines={[{ text: 'FROM THE SANDLOT…', size: V ? 140 : 170 }]} />
      </At>

      {/* ── 34–41 s · transformation: starter kit -> full loadout */}
      <At a={34} b={41} name="transform">
        <Footage src="transform" from={0.4} duration={s(7)} push={[1.0, 1.05]} crop={V ? { x: 960, y: 520, s: 1 } : undefined} />
        <Flash length={10} color={C.gold} peak={0.6} />
        <Sequence from={s(0.2)} durationInFrames={s(2.5)}><Kinetic duration={s(2.5)} y={V ? 15 : 84} lines={[{ text: '…TO THE SHOW.', size: V ? 130 : 150, gradient: true }]} /></Sequence>
      </At>

      {/* ── 41–47 s · montage on the beat */}
      <At a={41} b={43} name="glove">
        <Footage src="glove" from={6.2} duration={s(2)} push={[1.02, 1.07]} crop={V ? { x: 900, y: 560, s: 1 } : undefined} />
        <Kinetic duration={s(2)} align={V ? 'center' : 'left'} x={V ? 50 : 5} y={V ? 82 : 22} lines={[{ text: 'YOUR', size: 110 }, { text: 'LEATHER.', size: 160, color: C.legendary }]} />
      </At>
      <At a={43} b={45} name="headgear">
        <Footage src="headgear" from={4.6} duration={s(2)} push={[1.02, 1.07]} crop={V ? { x: 960, y: 540, s: 1 } : undefined} />
        <Streak length={12} />
        <Kinetic duration={s(2)} align={V ? 'center' : 'right'} x={V ? 50 : 95} y={V ? 82 : 22} lines={[{ text: 'YOUR', size: 110 }, { text: 'SHADES.', size: 160, color: C.gold }]} />
      </At>
      <At a={45} b={49} name="anims">
        <Footage src="anims" from={4.4} duration={s(4)} push={[1.0, 1.05]} crop={V ? { x: 960, y: 540, s: 1 } : undefined} />
        <Flash length={6} peak={0.4} />
        <Sequence from={s(0.2)}><Caption kicker="Celebrate in style" text="YOUR WALK-OFF MOMENT." highlight="WALK-OFF" duration={s(3.6)} pos={V ? 'bc' : 'bl'} color={C.magenta} /></Sequence>
      </At>

      {/* ── 49–54 s · stats */}
      <At a={49} b={54} name="stats">
        <Footage src="stats" from={1.2} duration={s(5)} push={[1.0, 1.04]} crop={V ? { x: 960, y: 700, s: 1 } : undefined} />
        <Sequence from={s(0.3)}><Caption kicker="Real gear · Real stats" text="EVERY PIECE MOVES YOUR NUMBERS." highlight="YOUR NUMBERS." duration={s(4.5)} pos={V ? 'tl' : 'tl'} size={V ? 80 : 86} /></Sequence>
      </At>

      {/* ── 54–58 s · the ask */}
      <At a={54} b={58} name="ask">
        <Footage src="outro" from={0.5} duration={s(4)} push={[1.05, 1.0]} dim={0.55} crop={V ? { x: 960, y: 540, s: 1 } : undefined} />
        <Flash length={8} />
        <Sequence durationInFrames={s(1.6)}><Kinetic duration={s(1.6)} lines={[{ text: 'NEW BAT?', size: V ? 150 : 140, at: 0 }, { text: 'NEW CLEATS?', size: V ? 150 : 140, at: 6 }, { text: 'NEW GLOVE?', size: V ? 150 : 140, at: 12 }]} stagger={2} /></Sequence>
        <Sequence from={s(1.6)} durationInFrames={s(2.4)}><Kinetic duration={s(2.4)} lines={[{ text: 'PUT IT IN', size: V ? 150 : 140 }, { text: 'YOUR ARMORY.', size: V ? 190 : 190, gradient: true }]} /></Sequence>
      </At>

      {/* ── 58–64 s · end card */}
      <At a={58} b={64} name="end">
        <Backdrop />
        <Flash length={12} color={C.gold} peak={0.7} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `translateY(${(V ? -140 : -70) * (width / 1920)}px)` }}><Logo scale={V ? 0.8 : 0.9} /></div>
        </AbsoluteFill>
        <Sequence from={s(0.8)}><EndLines /></Sequence>
      </At>

      <Finish />

      {/* ── sound design */}
      <Sfx at={1.95} name="whoosh-short" vol={0.35} />
      <Sfx at={3.45} name="bat-crack" vol={0.9} />
      <Sfx at={6.35} name="whoosh-up" vol={0.45} />
      <Sfx at={9.85} name="whoosh-down" vol={0.4} />
      <Sfx at={15.85} name="whoosh-up" vol={0.4} />
      <Sfx at={22.0} name="hit" vol={0.5} />
      <Sfx at={29.9} name="whoosh-short" vol={0.4} />
      <Sfx at={34.0} name="levelup" vol={0.45} />
      <Sfx at={40.9} name="whoosh-short" vol={0.35} />
      <Sfx at={42.9} name="whoosh-short" vol={0.35} />
      <Sfx at={44.9} name="hit" vol={0.45} />
      <Sfx at={48.9} name="whoosh-up" vol={0.35} />
      <Sfx at={54.0} name="hit" vol={0.5} />
      <Sfx at={55.6} name="hit" vol={0.5} />
      <Sfx at={58.0} name="equip" vol={0.5} />
    </AbsoluteFill>
  );
};

const EndLines: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const V = height > width;
  const k = width / 1920;
  const a = interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const b = interpolate(f, [18, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse = 1 + 0.025 * Math.sin(f / 6);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ marginTop: (V ? 520 : 400) * k, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 * k }}>
        <div style={{ fontFamily: DISPLAY, fontSize: (V ? 92 : 64) * k, color: C.white, letterSpacing: '0.06em', opacity: a, transform: `translateY(${(1 - a) * 20}px)`, textAlign: 'center' }}>
          SUIT UP LIKE YOU <span style={{ color: C.gold }}>PLAY.</span>
        </div>
        <div style={{
          opacity: b, transform: `translateY(${(1 - b) * 24}px) scale(${pulse})`, padding: `${22 * k}px ${48 * k}px`, borderRadius: 999,
          background: `linear-gradient(100deg, ${C.gold}, #ffb020 45%, ${C.magenta})`, color: '#0b0d18', fontFamily: DISPLAY,
          fontSize: (V ? 66 : 50) * k, letterSpacing: '0.08em', boxShadow: `0 16px 50px ${C.magenta}55, 0 0 0 6px rgba(255,209,0,.12)`,
        }}>
          UPDATE YOUR ARMORY →
        </div>
      </div>
    </AbsoluteFill>
  );
};
