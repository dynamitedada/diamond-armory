// Form model + helpers shared by the builder, profile page and clubhouse cards.
import type { Item, PlayerProfile, Slot, StatKey } from '../data/types';
import { CATALOG, DEFAULT_LOADOUT } from '../data/items';
import { toPlayerProfile, type ProfileInput, type ProfileRecord } from '../data/api';
import { ALL_STATS, sumStats } from '../ui/theme';

export type Loadout = Partial<Record<Slot, string>>;
export type Equipped = Partial<Record<Slot, Item>>;

export const POSITIONS = [
  'Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop',
  'Left Field', 'Center Field', 'Right Field', 'Designated Hitter', 'Utility',
] as const;

export const POSITION_ABBR: Record<string, string> = {
  Pitcher: 'P', Catcher: 'C', 'First Base': '1B', 'Second Base': '2B', 'Third Base': '3B', Shortstop: 'SS',
  'Left Field': 'LF', 'Center Field': 'CF', 'Right Field': 'RF', 'Designated Hitter': 'DH', Utility: 'UT',
};

/** Light → deep. */
export const SKIN_TONES = ['#f7dcc8', '#ecc4a2', '#dcaa83', '#c68a5e', '#aa6e45', '#8c5533', '#6c3f25', '#4a2a19'];

export const HAIR_COLORS: { hex: string; label: string }[] = [
  { hex: '#141010', label: 'Black' },
  { hex: '#3b2417', label: 'Dark brown' },
  { hex: '#6a4328', label: 'Brown' },
  { hex: '#8d3b1f', label: 'Auburn' },
  { hex: '#c4682c', label: 'Ginger' },
  { hex: '#d9b066', label: 'Blonde' },
  { hex: '#ebe5d6', label: 'Platinum' },
  { hex: '#8e9096', label: 'Gray' },
  { hex: '#ff2bd6', label: 'Neon pink' },
  { hex: '#4ad7ff', label: 'Electric blue' },
];

export const LIMITS = { name: 40, nickname: 24, team: 40 } as const;

/** What the builder form edits (numbers are kept as text while typing). */
export interface ProfileFields {
  name: string;
  nickname: string;
  team: string;
  number: string;
  position: string;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  skin_tone: string;
  hair_color: string;
}

export type FieldErrors = Partial<Record<keyof ProfileFields, string>>;

export function newFields(): ProfileFields {
  return {
    name: '',
    nickname: '',
    team: '',
    number: String(1 + Math.floor(Math.random() * 99)),
    position: 'Utility',
    bats: 'R',
    throws: 'R',
    skin_tone: SKIN_TONES[3],
    hair_color: HAIR_COLORS[1].hex,
  };
}

export function recordToFields(r: ProfileRecord): ProfileFields {
  return {
    name: r.name,
    nickname: r.nickname ?? '',
    team: r.team ?? '',
    number: String(r.number),
    position: r.position,
    bats: r.bats,
    throws: r.throws,
    skin_tone: r.skin_tone,
    hair_color: r.hair_color,
  };
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

export function validateFields(f: ProfileFields): FieldErrors {
  const e: FieldErrors = {};
  const name = clean(f.name);
  if (!name) e.name = 'Your player needs a name.';
  else if (name.length > LIMITS.name) e.name = `Keep the name to ${LIMITS.name} characters.`;
  if (clean(f.nickname).length > LIMITS.nickname) e.nickname = `Nicknames max out at ${LIMITS.nickname} characters.`;
  else if (f.nickname.includes("'")) e.nickname = 'Skip the quote marks, we add those.';
  if (clean(f.team).length > LIMITS.team) e.team = `Keep the team name to ${LIMITS.team} characters.`;
  const num = f.number.trim();
  if (!num) e.number = 'Pick a number from 0 to 99.';
  else if (!/^\d{1,2}$/.test(num)) e.number = 'Use a whole number from 0 to 99.';
  if (!(POSITIONS as readonly string[]).includes(f.position)) e.position = 'Pick a position.';
  return e;
}

export function fieldsToInput(f: ProfileFields, loadout: Loadout): ProfileInput {
  return {
    name: clean(f.name),
    nickname: clean(f.nickname) || null,
    team: clean(f.team),
    position: f.position,
    number: Math.min(99, Math.max(0, parseInt(f.number, 10) || 0)),
    bats: f.bats,
    throws: f.throws,
    skin_tone: f.skin_tone,
    hair_color: f.hair_color,
    loadout,
  };
}

/** Live preview profile for the header + 3D layer (fills blanks so the model never looks broken). */
export function fieldsToPlayer(f: ProfileFields): PlayerProfile {
  const input = fieldsToInput(f, {});
  return toPlayerProfile({
    ...input,
    name: input.name || 'Rookie',
    slug: '',
    created_at: '',
    updated_at: '',
  });
}

// ───────────────────────────── loadouts

const BY_ID = new Map(CATALOG.map((i) => [i.id, i]));

/** Resolve a stored slot→id map to items, ignoring unknown ids or ids filed under the wrong slot. */
export function resolveLoadout(loadout: Loadout | null | undefined): Equipped {
  const out: Equipped = {};
  if (!loadout || typeof loadout !== 'object') return out;
  for (const [slot, id] of Object.entries(loadout)) {
    const item = typeof id === 'string' ? BY_ID.get(id) : undefined;
    if (item && item.slot === slot) out[item.slot] = item;
  }
  return out;
}

export function loadoutIds(equipped: Equipped): Loadout {
  const out: Loadout = {};
  for (const [slot, item] of Object.entries(equipped)) if (item) out[slot as Slot] = item.id;
  return out;
}

export const DEFAULT_LOADOUT_MAP: Loadout = loadoutIds(
  Object.fromEntries(DEFAULT_LOADOUT.map((id) => BY_ID.get(id)!).map((i) => [i.slot, i])),
);

export function sameLoadout(a: Loadout, b: Loadout): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<Slot>;
  for (const k of keys) if ((a[k] ?? null) !== (b[k] ?? null)) return false;
  return true;
}

/** Overall rating = average OVR of the equipped items (matches the header). */
export function equippedOvr(equipped: Equipped): number {
  const items = Object.values(equipped).filter(Boolean) as Item[];
  return items.length ? Math.round(items.reduce((a, i) => a + i.ovr, 0) / items.length) : 0;
}

export const loadoutOvr = (loadout: Loadout) => equippedOvr(resolveLoadout(loadout));

/** Jersey colors for card swatches. */
export function jerseyColors(loadout: Loadout): { primary: string; secondary: string } {
  const j = resolveLoadout(loadout).jersey?.visual;
  return { primary: j?.primary ?? '#e9e6dd', secondary: j?.secondary ?? '#1b2340' };
}

const ROLE_BY_STAT: Record<StatKey, string> = {
  power: 'Power Bat', contact: 'Contact Hitter', speed: 'Speedster', arm: 'Cannon Arm',
  fielding: 'Glove Wizard', eye: 'Sharp Eye', clutch: 'Clutch Gene', swag: 'Showtime',
};

/** A playful archetype from whatever stat the gear boosts most. */
export function roleFor(equipped: Equipped): string {
  const s = sumStats(Object.values(equipped));
  let best: StatKey | null = null;
  for (const k of ALL_STATS) if (s[k] > 0 && (best === null || s[k] > s[best])) best = k;
  return best ? ROLE_BY_STAT[best] : 'Prospect';
}

/** Splits a display name like "Manny 'Nitro' Gauz" into its parts. */
export function nameParts(displayName: string): { first: string; nick?: string; last: string } {
  const m = displayName.match(/(^|\s)'([^']+)'(?=\s|$)/);
  const nick = m?.[2];
  const rest = (m ? displayName.replace(m[0], ' ') : displayName).trim().split(/\s+/);
  const [first = '', ...last] = rest;
  return { first, nick, last: last.join(' ') };
}

/** "Manny 'Nitro' Gauz" for page titles and share text. */
export const profileTitle = (r: ProfileRecord) => toPlayerProfile(r).name;
