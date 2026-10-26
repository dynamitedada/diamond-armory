/**
 * Maps equipped soft goods (jersey, undershirt, pants, socks, belt, batting gloves) + player profile
 * onto the uniform material's role uniforms, and paints the jersey artwork (wordmark, name, number,
 * pinstripes...) into a CanvasTexture that is projected around the torso.
 */
import * as THREE from 'three';
import type { Item, PlayerProfile, Slot } from '../data/types';
import { JERSEY_Y0, JERSEY_Y1, ROLE, type UniformUniforms } from './character';

type Equipped = Partial<Record<Slot, Item>>;

const FINISH: Record<string, { rough: number; metal: number }> = {
  matte: { rough: 0.86, metal: 0 },
  gloss: { rough: 0.32, metal: 0 },
  metal: { rough: 0.3, metal: 0.85 },
  chrome: { rough: 0.12, metal: 1 },
  wood: { rough: 0.6, metal: 0 },
  leather: { rough: 0.55, metal: 0 },
  glow: { rough: 0.4, metal: 0 },
};

const lum = (hex: string) => {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};

/** Jersey text bits derived from the profile. */
export function jerseyLabels(player: PlayerProfile, jersey?: Item) {
  const parts = player.name.replace(/'[^']*'/g, ' ').trim().split(/\s+/);
  const last = (parts[parts.length - 1] || player.name).toUpperCase();
  const teamWords = player.team.trim().split(/\s+/);
  const wordmark = teamWords[teamWords.length - 1] || player.team;
  const number = jersey?.visual.text ?? String(player.number);
  return { last, wordmark, number };
}

const W = 1024;
const H = 448;
/** circumference / height of the projection cylinder in metres-ish, to keep glyphs unstretched */
const ASPECT_FIX = W / 2.15 / (H / (JERSEY_Y1 - JERSEY_Y0));

const yPx = (y: number) => H - ((y - JERSEY_Y0) / (JERSEY_Y1 - JERSEY_Y0)) * H;

function blockText(
  g: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  px: number,
  fill: string,
  stroke: string | null,
  font = '900 {px}px "Arial Black", "Arial Bold", Impact, sans-serif',
  spacing = 0,
) {
  g.save();
  g.translate(cx, cy);
  g.scale(ASPECT_FIX < 1 ? 1 : 1 / ASPECT_FIX, 1);
  g.font = font.replace('{px}', String(px));
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if ('letterSpacing' in g) (g as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
  if (stroke) {
    g.lineJoin = 'round';
    g.strokeStyle = stroke;
    g.lineWidth = Math.max(4, px * 0.16);
    g.strokeText(text, 0, 0);
  }
  g.fillStyle = fill;
  g.fillText(text, 0, 0);
  g.restore();
}

export function paintJersey(canvas: HTMLCanvasElement, jersey: Item | undefined, player: PlayerProfile) {
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  g.clearRect(0, 0, W, H);
  if (!jersey) return;
  const { primary, secondary = '#111111', variant } = jersey.visual;
  const { last, wordmark, number } = jerseyLabels(player, jersey);
  const outline = lum(secondary) > 0.45 ? '#0b0d18' : lum(primary) > 0.6 ? '#c8102e' : '#ffffff';

  // --- pattern layer (drawn at partial alpha; base colour comes from the role colour) ---
  g.save();
  if (variant === 'home') {
    g.globalAlpha = 0.5;
    g.fillStyle = secondary;
    for (let x = 0; x < W; x += 22) g.fillRect(x, 0, 2, H);
  } else if (variant === 'throwback') {
    // 70s/80s chest bands
    const bands = [
      [1.06, 0.035, secondary],
      [1.0, 0.035, '#ffffff'],
      [0.94, 0.035, secondary],
    ] as const;
    for (const [y, h, c] of bands) {
      g.fillStyle = c;
      g.fillRect(0, yPx(y + h / 2), W, (h / (JERSEY_Y1 - JERSEY_Y0)) * H);
    }
  } else if (variant === 'city') {
    // night-skyline gradient + neon side piping
    const grd = g.createLinearGradient(0, H, 0, H * 0.45);
    grd.addColorStop(0, secondary + '66');
    grd.addColorStop(1, secondary + '00');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#05060f';
    let x = 0;
    let s = 3;
    while (x < W) {
      s = (s * 9301 + 49297) % 233280;
      const bw = 14 + (s % 30);
      const bh = 16 + (s % 54);
      g.globalAlpha = 0.55;
      g.fillRect(x, H - bh - 30, bw, bh + 30);
      x += bw + 2;
    }
    g.globalAlpha = 1;
    g.fillStyle = secondary;
    for (const u of [0.25, 0.75]) g.fillRect(u * W - 3, 0, 6, H);
  } else if (variant === 'away') {
    g.globalAlpha = 0.18;
    g.fillStyle = '#ffffff';
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1); // heathered knit
  }
  g.restore();

  // --- back: name bar + number (centred at u = 0.5) ---
  const backX = W * 0.5;
  blockText(g, last, backX, yPx(1.07), 46, secondary, outline, undefined, 4);
  blockText(g, number, backX, yPx(0.83), 150, secondary, outline);

  // --- front: script wordmark across the chest (wraps over the u=0/1 seam) + small number ---
  const script = 'italic 900 {px}px "Brush Script MT", "Segoe Script", Georgia, serif';
  for (const x of [0, W]) blockText(g, wordmark, x, yPx(0.96), 70, secondary, outline, script);
  blockText(g, number, W * 0.085, yPx(0.76), 64, secondary, outline);
}

export interface OutfitState {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  key: string;
}

export function createOutfitState(): OutfitState {
  const canvas = document.createElement('canvas');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return { canvas, texture, key: '' };
}

export const SOFT_SLOTS: Slot[] = ['jersey', 'undershirt', 'pants', 'socks', 'belt', 'battingGloves'];

/** Apply the equipped soft goods to the role uniforms. Cheap: call on every equip change. */
export function applyOutfit(u: UniformUniforms, os: OutfitState, eq: Equipped, player: PlayerProfile) {
  const col = u.uRoleColor.value;
  const par = u.uRoleParam.value;
  const set = (role: number, hex: string, finish = 'matte', grad = 0.55) => {
    col[role].set(hex);
    const f = FINISH[finish] ?? FINISH.matte;
    par[role].set(f.rough, f.metal, grad, par[role].w);
  };
  const skin = player.skinTone;
  const jersey = eq.jersey?.visual;
  const under = eq.undershirt?.visual;
  const pants = eq.pants?.visual;
  const socks = eq.socks?.visual;
  const belt = eq.belt?.visual;
  const gloves = eq.battingGloves?.visual;

  set(ROLE.skin, skin, 'matte', 0.35);
  par[ROLE.skin].x = 0.62;
  set(ROLE.hair, player.hairColor, 'matte', 0.5);
  par[ROLE.hair].x = 0.55;
  set(ROLE.eyes, '#0a0a0c', 'gloss', 0);

  const jp = jersey?.primary ?? '#e9e6dd';
  const js = jersey?.secondary ?? '#1b2340';
  set(ROLE.jersey, jp, jersey?.finish ?? 'matte', 0.45);
  set(ROLE.trim, js, 'matte', 0.3);

  // undershirt: long sleeves on both forearms; "sleeve" variant = single compression sleeve on the lead (left) arm
  if (under) {
    const uf = under.finish === 'glow' ? 'gloss' : under.finish ?? 'matte';
    if (under.variant === 'sleeve') {
      set(ROLE.underL, under.primary, uf, 0.35);
      set(ROLE.underR, skin, 'matte', 0.35);
      par[ROLE.underR].x = 0.62;
    } else {
      set(ROLE.underL, under.primary, uf, 0.35);
      set(ROLE.underR, under.primary, uf, 0.35);
    }
    set(ROLE.neck, under.variant === 'sleeve' ? skin : under.primary, 'matte', 0.3);
  } else {
    set(ROLE.underL, skin, 'matte', 0.35);
    set(ROLE.underR, skin, 'matte', 0.35);
    set(ROLE.neck, skin, 'matte', 0.3);
  }
  for (const r of [ROLE.underL, ROLE.underR, ROLE.neck]) if (col[r].equals(new THREE.Color(skin))) par[r].x = 0.62;

  set(ROLE.hands, gloves?.primary ?? skin, gloves?.finish ?? 'matte', 0.35);

  const pp = pants?.primary ?? '#e9e6dd';
  const ps = pants?.secondary ?? pp;
  const longPants = pants?.variant === 'long';
  set(ROLE.pants, pp, pants?.finish ?? 'matte', 0.5);
  set(ROLE.pantsTrim, longPants ? pp : ps, 'matte', 0.5);

  // socks are only visible under knickers / short pants; long pants cover them
  const sp = socks?.primary ?? '#f2f2f2';
  const ss = socks?.secondary ?? sp;
  if (longPants) {
    set(ROLE.socks, pp, 'matte', 0.5);
    set(ROLE.socksTrim, ps, 'matte', 0.5);
  } else {
    set(ROLE.socks, sp, 'matte', 0.45);
    set(ROLE.socksTrim, socks?.variant === 'stirrup' || socks?.variant === 'knee' ? ss : sp, 'matte', 0.45);
  }
  set(ROLE.shoe, '#16181f', 'gloss', 0.5);

  set(ROLE.belt, belt?.primary ?? '#14161c', belt?.finish ?? 'leather', 0.35);
  set(ROLE.buckle, belt?.secondary ?? '#c0c4cc', 'chrome', 0.1);

  // jersey artwork texture (repaint only when its inputs change)
  const key = JSON.stringify([eq.jersey?.id, player.name, player.team, player.number]);
  if (key !== os.key) {
    os.key = key;
    paintJersey(os.canvas, eq.jersey, player);
    os.texture.needsUpdate = true;
  }
  u.uJersey.value = os.texture;
}

/** Which uniform roles light up when a soft-goods slot is hovered. */
export const SLOT_ROLES: Partial<Record<Slot, number[]>> = {
  jersey: [ROLE.jersey, ROLE.trim],
  undershirt: [ROLE.underL, ROLE.underR, ROLE.neck],
  pants: [ROLE.pants, ROLE.pantsTrim],
  socks: [ROLE.socks, ROLE.socksTrim],
  belt: [ROLE.belt, ROLE.buckle],
  battingGloves: [ROLE.hands],
};
