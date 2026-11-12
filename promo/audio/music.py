"""Original soundtrack for the Diamond Armory promo (120 BPM, A minor, synthwave x trap).
Everything is synthesized here; no samples, so the result is free of third-party rights.
Usage: python3 music.py  -> music.wav + sfx/*.wav
"""
import numpy as np, soundfile as sf, os
from pedalboard import Pedalboard, Reverb, Compressor, Limiter, LowpassFilter, HighpassFilter, Delay, Chorus, Gain

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
STEP = BEAT / 4
LEN = 64.0
N = int(LEN * SR)
rng = np.random.default_rng(7)

def t_(d): return np.arange(int(d * SR)) / SR
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def env_adsr(n, a=0.005, d=0.1, s=0.7, r=0.1):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na, endpoint=False)
    nd2 = min(nd, max(0, n - na)); e[na:na + nd2] = np.linspace(1, s, nd2, endpoint=False)
    if nr > 0 and n > nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def place(buf, x, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i].copy()
    f = min(len(x), int(0.005 * SR))
    if f > 1: x[-f:] *= np.linspace(1, 0, f)
    buf[i:i + len(x)] += x * gain
def saw(f, t, phase=0.0):
    # band-limited-ish saw via additive (enough harmonics for warmth, no aliasing)
    out = np.zeros_like(t)
    k = 1
    while k * f < SR / 2.2 and k <= 40:
        out += ((-1) ** (k + 1)) * np.sin(2 * np.pi * k * f * t + phase * k) / k
        k += 1
    return out * (2 / np.pi)
def sq(f, t):
    out = np.zeros_like(t); k = 1
    while k * f < SR / 2.2 and k <= 31:
        out += np.sin(2 * np.pi * k * f * t) / k; k += 2
    return out * (4 / np.pi)
def fx(x, board):
    y = board(x.astype(np.float32)[None, :] if x.ndim == 1 else x.astype(np.float32), SR)
    return y[0] if x.ndim == 1 else y
def stereo(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l, x * r])

# ───────────────── drums
def kick(d=0.45):
    t = t_(d); f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7.5)
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.25
    return np.tanh((x + click) * 1.6) * 0.9
def clap(d=0.35):
    t = t_(d); n = rng.standard_normal(len(t))
    e = np.zeros_like(t)
    for o in (0, 0.011, 0.022): e += (t >= o) * np.exp(-np.clip(t - o, 0, None) * (60 if o < 0.02 else 18))
    x = n * e
    x = fx(x, Pedalboard([HighpassFilter(900), LowpassFilter(7000)]))
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4
    return (x * 0.8 + body)
def hat(d=0.06, open_=False):
    t = t_(0.28 if open_ else d); n = rng.standard_normal(len(t))
    x = fx(n, Pedalboard([HighpassFilter(7500)])) * np.exp(-t * (14 if open_ else 70))
    return x * (0.35 if open_ else 0.28)
def crash(d=2.5):
    t = t_(d); n = rng.standard_normal(len(t))
    x = fx(n, Pedalboard([HighpassFilter(4000)])) * np.exp(-t * 1.6)
    return x * 0.3

# ───────────────── harmony (A minor: Am F C G)
CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]
ROOTS = [33, 29, 36, 31]
def chord_at(bar): return bar % 4

def pad_note(f, d):
    t = t_(d)
    x = sum(saw(f * (1 + det), t, rng.uniform(0, 6.28)) for det in (-0.006, 0.0, 0.0065)) / 3
    return x * env_adsr(len(t), 0.25, 0.4, 0.8, 0.5)
def bass_note(f, d):
    t = t_(d)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.tanh(3 * np.sin(2 * np.pi * f * t))
    return x * env_adsr(len(t), 0.004, 0.2, 0.85, 0.06)
def pluck(f, d=0.22):
    t = t_(d)
    x = saw(f, t) * 0.6 + sq(f * 2, t) * 0.15
    return x * np.exp(-t * 14)
def lead(f, d, f_prev=None):
    t = t_(d)
    if f_prev: fr = f + (f_prev - f) * np.exp(-t * 40)
    else: fr = np.full_like(t, f)
    ph = 2 * np.pi * np.cumsum(fr * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t))) / SR
    x = np.zeros_like(t)
    for k in range(1, 18): x += ((-1) ** (k + 1)) * np.sin(k * ph) / k
    return x * 0.6 * env_adsr(len(t), 0.01, 0.15, 0.75, 0.08)

# section map: (start_bar, end_bar, name)
# bars are 2 s. 0-1 intro | 2-9 groove A | 10-15 groove B | 16 breakdown | 17-24 drop 2 | 25-26 light | 27-29 outro groove | 30-31 end
def section(bar):
    if bar < 2: return 'intro'
    if bar < 10: return 'A'
    if bar < 16: return 'B'
    if bar < 17: return 'break'
    if bar < 25: return 'drop'
    if bar < 27: return 'light'
    if bar < 30: return 'outro'
    return 'end'

drums = np.zeros((2, N)); bass = np.zeros(N); pad = np.zeros(N); arp = np.zeros(N); leadb = np.zeros(N); fxb = np.zeros((2, N))
kick_times = []

def pk(x, p): return x / (np.max(np.abs(x)) + 1e-9) * p
K, CL, HC, HO = pk(kick(), 0.9), pk(clap(), 0.55), pk(hat(), 0.16), pk(hat(open_=True), 0.14)
for bar in range(32):
    sec = section(bar); b0 = bar * BAR
    full = sec in ('A', 'B', 'drop', 'outro')
    for st in range(16):
        tt = b0 + st * STEP
        if full or sec == 'light':
            four = sec in ('B', 'drop')
            if st in ((0, 4, 8, 12) if four else (0, 7, 10)) or (sec == 'light' and st in (0, 8)):
                place(drums[0], K, tt); place(drums[1], K, tt); kick_times.append(tt)
            if st in (4, 12): place(drums[0], CL, tt, 0.75); place(drums[1], CL, tt, 0.75)
            if st % 2 == 0: place(drums[0], HC, tt, 0.9 if st % 4 == 2 else 0.5); place(drums[1], HC, tt, 0.6)
            if four and st in (2, 6, 10, 14): place(drums[0], HO, tt, 0.35); place(drums[1], HO, tt, 0.5)
            # trap hat rolls on the last beat of every 2nd bar
            if sec in ('B', 'drop') and bar % 2 == 1 and st >= 12:
                for r in range(2): place(drums[1], HC, tt + r * STEP / 2, 0.5); place(drums[0], HC, tt + r * STEP / 2, 0.35)
    if sec == 'intro' and bar == 1:
        for st in range(8, 16):  # snare build into the drop
            place(drums[0], CL, b0 + st * STEP, 0.2 + 0.05 * (st - 8)); place(drums[1], CL, b0 + st * STEP, 0.2 + 0.05 * (st - 8))
    if sec == 'break':
        for st in range(0, 16, 2 if bar else 1):
            g = 0.15 + 0.6 * st / 16
            place(drums[0], CL, b0 + st * STEP, g * 0.6); place(drums[1], CL, b0 + st * STEP, g * 0.6)
    # crashes on section downbeats
    if bar in (2, 10, 17, 27):
        c = pk(crash(), 0.25); place(drums[0], c, b0, 0.9); place(drums[1], c, b0, 0.9)

    ci = chord_at(bar)
    # pad everywhere (filtered in intro/break/end)
    for m in CHORDS[ci]:
        place(pad, pad_note(midi(m), BAR + 0.3), b0, 0.16)
        if sec in ('drop', 'B'): place(pad, pad_note(midi(m + 12), BAR + 0.3), b0, 0.07)
    # bass
    if full or sec == 'light':
        pattern = [(0, 3), (3, 1), (6, 2), (8, 3), (11, 1), (14, 2)] if sec != 'light' else [(0, 8), (8, 8)]
        for st, ln in pattern:
            octv = 12 if (st in (11, 14) and sec in ('B', 'drop')) else 0
            place(bass, bass_note(midi(ROOTS[ci] + octv), ln * STEP), b0 + st * STEP, 0.5)
    # arp
    if sec in ('A', 'B', 'drop', 'light', 'outro', 'intro'):
        notes = CHORDS[ci] + [n + 12 for n in CHORDS[ci]]
        order = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 2]
        for st in range(16):
            if sec == 'intro' and bar == 0 and st < 8: continue
            place(arp, pluck(midi(notes[order[st]] + 12)), b0 + st * STEP, 0.10 if sec != 'intro' else 0.07)
    # lead hook (A minor pentatonic) in B and drop
    if sec in ('B', 'drop'):
        hook = [[(0, 76, 3), (3, 74, 1), (4, 72, 2), (6, 69, 2), (8, 72, 3), (11, 74, 1), (12, 76, 4)],
                [(0, 72, 3), (3, 69, 1), (4, 67, 2), (6, 64, 2), (8, 67, 4), (12, 69, 4)],
                [(0, 76, 3), (3, 79, 1), (4, 81, 2), (6, 79, 2), (8, 76, 3), (11, 74, 1), (12, 72, 4)],
                [(0, 74, 4), (4, 76, 2), (6, 74, 2), (8, 71, 4), (12, 74, 4)]][bar % 4]
        prev = None
        for st, m, ln in hook:
            place(leadb, lead(midi(m), ln * STEP * 0.95, prev), b0 + st * STEP, 0.13)
            prev = midi(m)

# risers & impacts baked into the music at structural points
def riser(d):
    t = t_(d); n = rng.standard_normal(len(t))
    out = np.zeros_like(t); seg = int(0.05 * SR)
    for i in range(0, len(t), seg):
        k = i / len(t); cutoff = 300 + 9000 * k ** 2
        out[i:i + seg] = fx(n[i:i + seg], Pedalboard([LowpassFilter(cutoff), HighpassFilter(200 + 1500 * k)]))
    tone = saw(midi(45), t) * 0  # placeholder kept silent
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / d) ** 2) / SR) * 0.15
    return (out * 0.5 + sweep) * (t / d) ** 1.6
def impact(d=2.5):
    t = t_(d); f = 32 + 60 * np.exp(-t * 6)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    n = fx(rng.standard_normal(len(t)), Pedalboard([LowpassFilter(1800)])) * np.exp(-t * 6) * 0.5
    return np.tanh((x + n) * 1.5) * 0.8
for at, d in ((0.0, 4.0), (32.0, 2.0), (52.0, 2.0)):
    r = pk(riser(d), 0.5); place(fxb[0], r, at, 0.5); place(fxb[1], r, at, 0.5)
for at in (4.0, 34.0, 54.0, 58.0):
    im = pk(impact(), 0.8); place(fxb[0], im, at, 0.8); place(fxb[1], im, at, 0.8)

# sidechain from kicks
sc = np.ones(N)
for kt in kick_times:
    i = int(kt * SR); L = int(0.22 * SR); seg = sc[i:i + L]
    curve = 1 - 0.65 * np.exp(-np.arange(len(seg)) / SR * 14)
    sc[i:i + L] = np.minimum(seg, curve)

# filter automation: intro / break / end are low-passed pads & arps
def lp_auto(x, sections_lp):
    out = x.copy()
    for (a, b, f0, f1) in sections_lp:
        i, j = int(a * SR), int(b * SR); seg = x[i:j]; res = np.zeros_like(seg); blk = int(0.05 * SR)
        for k in range(0, len(seg), blk):
            fr = f0 + (f1 - f0) * (k / max(1, len(seg)))
            res[k:k + blk] = fx(seg[k:k + blk], Pedalboard([LowpassFilter(fr)]))
        out[i:j] = res
    return out
LP = [(0, 4, 400, 3500), (32, 34, 600, 6000), (60, 64, 3000, 500)]
pad = lp_auto(pad, LP); arp = lp_auto(arp, LP)

padS = fx(np.stack([pad, np.roll(pad, 300)]) * sc, Pedalboard([Chorus(rate_hz=0.4, depth=0.3, mix=0.4), Reverb(room_size=0.8, wet_level=0.35, dry_level=0.7, width=1.0)]))
arpS = fx(np.stack([arp * sc, arp * sc]), Pedalboard([Delay(delay_seconds=BEAT * 0.75, feedback=0.35, mix=0.3), Reverb(room_size=0.6, wet_level=0.25, dry_level=0.8)]))
arpS[0] *= 0.8; arpS[1] *= 1.0
leadS = fx(np.stack([leadb, leadb]), Pedalboard([Chorus(rate_hz=0.8, depth=0.2, mix=0.25), Delay(delay_seconds=BEAT * 0.5, feedback=0.3, mix=0.25), Reverb(room_size=0.7, wet_level=0.3, dry_level=0.8)]))
bassS = np.stack([bass * sc, bass * sc])
bassS = fx(bassS, Pedalboard([LowpassFilter(900), Compressor(threshold_db=-12, ratio=3)]))
drumsS = fx(drums, Pedalboard([Compressor(threshold_db=-10, ratio=3, attack_ms=3, release_ms=80), Reverb(room_size=0.25, wet_level=0.08, dry_level=0.95)]))
fxS = fx(fxb, Pedalboard([Reverb(room_size=0.9, wet_level=0.4, dry_level=0.8)]))

def rms(x): import numpy as np; return 20*np.log10(np.sqrt(np.mean(x**2))+1e-9)
for nm,x in (('drums',drumsS),('bass',bassS),('pad',padS),('arp',arpS),('lead',leadS),('fx',fxS)): print(nm, round(rms(x),1), round(20*np.log10(np.max(np.abs(x))),1))
def lvl(x, target):
    active = np.abs(x).max(axis=0) > 1e-4 if x.ndim == 2 else np.abs(x) > 1e-4
    r = 20 * np.log10(np.sqrt(np.mean(x[..., active] ** 2)) + 1e-9)
    return x * 10 ** ((target - r) / 20)
mix = lvl(drumsS, -17) + lvl(bassS, -19) + lvl(padS, -23) + lvl(arpS, -25) + lvl(leadS, -23) + lvl(fxS, -22)
print('premaster peak dB', round(20*np.log10(np.max(np.abs(mix))),1))
# final fade on the last 1.5 s
fade = np.ones(N); fade[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR)) ** 2; mix *= fade
mix = fx(mix, Pedalboard([HighpassFilter(28), Compressor(threshold_db=-16, ratio=2.0, attack_ms=15, release_ms=200)]))
def brickwall(x, ceil=0.89):
    from scipy.ndimage import maximum_filter1d, uniform_filter1d
    pk = maximum_filter1d(np.abs(x).max(axis=0), size=int(0.006 * SR))  # centred window = ~3 ms look-ahead
    g = np.minimum(1.0, ceil / (pk + 1e-9))
    g = uniform_filter1d(np.minimum.accumulate(g[::-1])[::-1] * 0 + g, size=int(0.003 * SR))
    g = np.minimum(g, maximum_filter1d(g, 1))
    return np.clip(x * g, -ceil, ceil)
mix = brickwall(mix * 10 ** (3 / 20))
os.makedirs('sfx', exist_ok=True)
sf.write('music.wav', mix.T, SR, subtype='PCM_24')

# ───────────────── SFX (placed by the editor in Remotion)
def norm(x, peak=0.9): return x / (np.max(np.abs(x)) + 1e-9) * peak
def bat_crack():
    t = t_(1.2); n = rng.standard_normal(len(t))
    snap = fx(n * np.exp(-t * 90), Pedalboard([HighpassFilter(1200)]))
    ping = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dk) * a for f, dk, a in ((1850, 38, 0.6), (2730, 45, 0.4), (980, 25, 0.5), (4100, 60, 0.25)))
    thump = np.sin(2 * np.pi * (90 + 120 * np.exp(-t * 40)) * t) * np.exp(-t * 18) * 0.7
    x = snap * 0.9 + ping + thump
    return fx(np.stack([x, x]), Pedalboard([Reverb(room_size=0.85, wet_level=0.45, dry_level=0.85, width=1.0)]))
def whoosh(d=0.7, up=True):
    t = t_(d); n = rng.standard_normal(len(t)); out = np.zeros_like(t); blk = int(0.02 * SR)
    for i in range(0, len(t), blk):
        k = i / len(t); fr = (500 + 6000 * k) if up else (6500 - 6000 * k)
        out[i:i + blk] = fx(n[i:i + blk], Pedalboard([LowpassFilter(fr), HighpassFilter(fr * 0.25)]))
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    l = out * e * (1 - t / d * 0.6); r = out * e * (0.4 + t / d * 0.6)
    return fx(np.stack([l, r]), Pedalboard([Reverb(room_size=0.5, wet_level=0.2)]))
def ui_tick():
    t = t_(0.12); x = np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 90) + np.sin(2 * np.pi * 1200 * t) * np.exp(-t * 60) * 0.5
    return np.stack([x, x])
def equip_chime():
    t = t_(0.9); x = sum(np.sin(2 * np.pi * midi(m) * t) * np.exp(-t * 6) * a for m, a in ((88, 0.5), (93, 0.35), (100, 0.2)))
    x += np.sin(2 * np.pi * midi(76) * t) * np.exp(-t * 10) * 0.4
    return fx(np.stack([x, x]), Pedalboard([Reverb(room_size=0.6, wet_level=0.35)]))
def level_up():
    out = np.zeros(int(1.4 * SR))
    for i, m in enumerate((69, 72, 76, 81, 84, 88)):
        p = pluck(midi(m), 0.6) * 0.8; place(out, p, i * 0.055)
    return fx(np.stack([out, out]), Pedalboard([Delay(delay_seconds=0.12, feedback=0.3, mix=0.25), Reverb(room_size=0.7, wet_level=0.35)]))
def boom():
    x = impact(3.0); return np.stack([x, x])
def text_hit():
    t = t_(0.5); x = np.sin(2 * np.pi * (60 + 80 * np.exp(-t * 30)) * t) * np.exp(-t * 9)
    n = fx(rng.standard_normal(len(t)) * np.exp(-t * 35), Pedalboard([HighpassFilter(2500)])) * 0.4
    y = np.tanh((x + n) * 1.8); return fx(np.stack([y, y]), Pedalboard([Reverb(room_size=0.4, wet_level=0.15)]))
for name, fn in (('bat-crack', bat_crack), ('whoosh-up', lambda: whoosh(0.7, True)), ('whoosh-down', lambda: whoosh(0.6, False)),
                 ('whoosh-short', lambda: whoosh(0.35, True)), ('tick', ui_tick), ('equip', equip_chime), ('levelup', level_up), ('boom', boom), ('hit', text_hit)):
    y = fn(); y = y if y.ndim == 2 else np.stack([y, y])
    sf.write(f'sfx/{name}.wav', (norm(y, 0.8)).T, SR, subtype='PCM_24')
print('ok', mix.shape, float(np.max(np.abs(mix))))
