import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Item, Rarity, Slot, StatKey } from '../data/types';
import { create } from 'zustand';

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#ffffff',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
  mythic: '#e6cc80',
};

/** Slightly brighter rarity color for text on dark backgrounds (rare blue is hard to read). */
export const RARITY_TEXT: Record<Rarity, string> = {
  ...RARITY_COLOR,
  rare: '#2f8fff',
  epic: '#b75cff',
};

export const PRIMARY_STATS: StatKey[] = ['power', 'contact', 'speed', 'arm', 'fielding'];
export const SECONDARY_STATS: StatKey[] = ['eye', 'clutch', 'swag'];
export const ALL_STATS: StatKey[] = [...PRIMARY_STATS, ...SECONDARY_STATS];

export const STAT_LABEL: Record<StatKey, string> = {
  power: 'Power', contact: 'Contact', speed: 'Speed', arm: 'Arm', fielding: 'Fielding',
  eye: 'Eye', clutch: 'Clutch', swag: 'Swag',
};

export const STAT_COLOR: Record<StatKey, string> = {
  power: '#ff4d6d', contact: '#4ad7ff', speed: '#39ff88', arm: '#ffb020', fielding: '#9d7bff',
  eye: '#6af2ff', clutch: '#ffd100', swag: '#ff2bd6',
};

/** Player's natural (un-geared) ratings; gear stacks on top. */
export const BASE_STATS: Record<StatKey, number> = {
  power: 58, contact: 66, speed: 74, arm: 63, fielding: 69, eye: 55, clutch: 50, swag: 40,
};

/** Name color per position (WoW class-color energy, tuned for dark backgrounds). */
export const POSITION_COLOR: Record<string, string> = {
  Pitcher: '#69ccf0', Catcher: '#c79c6e', 'First Base': '#ff8a3d', 'Second Base': '#fff468',
  'Third Base': '#ff5a6e', Shortstop: '#ff6ad5', 'Left Field': '#33ff9f', 'Center Field': '#abd473',
  'Right Field': '#9a9bff', 'Designated Hitter': '#c97bff', Utility: '#f2f2f2',
};

export const LEFT_SLOTS: Slot[] = ['helmet', 'cap', 'eyewear', 'chain', 'jersey', 'undershirt', 'wristband', 'elbowGuard'];
export const RIGHT_SLOTS: Slot[] = ['battingGloves', 'belt', 'pants', 'socks', 'cleats', 'walkupSong'];
export const BOTTOM_SLOTS: Slot[] = ['bat', 'glove'];

export type Side = 'left' | 'right' | 'bottom';

export const fmt = (n: number) => n.toLocaleString('en-US');

export function sumStats(items: (Item | undefined)[]): Record<StatKey, number> {
  const out = Object.fromEntries(ALL_STATS.map((k) => [k, 0])) as Record<StatKey, number>;
  for (const it of items) if (it) for (const [k, v] of Object.entries(it.stats)) out[k as StatKey] += v ?? 0;
  return out;
}

/** UI-only state (which picker is open, "ready" flag that drives skeletons → stagger-in). */
interface UiState {
  pickerSlot?: Slot;
  openPicker: (s?: Slot) => void;
  ready: boolean;
  setReady: (v?: boolean) => void;
  /** A sticky bottom action bar is showing (the feedback button moves up to clear it). */
  bottomBar: boolean;
  setBottomBar: (v: boolean) => void;
  /** Bumped whenever gear is committed from a picker (phones scroll the model back into view). */
  commitNonce: number;
  bumpCommit: () => void;
}
export const useUi = create<UiState>((set) => ({
  pickerSlot: undefined,
  openPicker: (pickerSlot) => set({ pickerSlot }),
  ready: false,
  setReady: (ready = true) => set({ ready }),
  bottomBar: false,
  setBottomBar: (bottomBar) => set({ bottomBar }),
  commitNonce: 0,
  bumpCommit: () => set((s) => ({ commitNonce: s.commitNonce + 1 })),
}));

/** Live media query match. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
  );
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animated number that eases toward `target`. */
export function useCountUp(target: number, duration = 900, start = 0): number {
  const [value, setValue] = useState(start);
  const from = useRef(start);
  const valueRef = useRef(start);
  useEffect(() => {
    from.current = valueRef.current;
    if (prefersReducedMotion()) {
      valueRef.current = target;
      const raf = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(raf);
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from.current + (target - from.current) * e;
      valueRef.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/** Tracks whether Shift is held (for comparison tooltips). */
export function useShiftKey(): boolean {
  const [down, setDown] = useState(false);
  useEffect(() => {
    const d = (e: KeyboardEvent) => e.key === 'Shift' && setDown(true);
    const u = (e: KeyboardEvent) => e.key === 'Shift' && setDown(false);
    const b = () => setDown(false);
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', u);
    window.addEventListener('blur', b);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); window.removeEventListener('blur', b); };
  }, []);
  return down;
}

export type Placement = 'left' | 'right' | 'top';

/**
 * Positions a floating box of size (w,h) next to `anchor` on `placement`, flipping to the
 * opposite side when it would overflow and clamping to the viewport. Coordinates are fixed.
 */
export function placeFloating(anchor: DOMRect, w: number, h: number, placement: Placement, offset = 12) {
  const vw = window.innerWidth, vh = window.innerHeight, m = 8;
  let x: number, y: number;
  if (placement === 'top') {
    x = anchor.left + anchor.width / 2 - w / 2;
    y = anchor.top - offset - h;
    if (y < m) y = anchor.bottom + offset;
  } else {
    const right = anchor.right + offset, left = anchor.left - offset - w;
    if (placement === 'right') x = right + w <= vw - m ? right : left >= m ? left : right;
    else x = left >= m ? left : right + w <= vw - m ? right : left;
    y = anchor.top;
  }
  x = Math.max(m, Math.min(x, vw - m - w));
  y = Math.max(m, Math.min(y, vh - m - h));
  return { x, y };
}
