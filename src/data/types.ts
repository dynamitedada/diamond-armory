// Shared contract between the UI layer (src/ui) and the 3D layer (src/scene).

export type Slot =
  | 'helmet' | 'cap' | 'eyewear' | 'chain' | 'jersey' | 'undershirt'
  | 'battingGloves' | 'wristband' | 'elbowGuard' | 'belt' | 'pants' | 'socks' | 'cleats'
  | 'bat' | 'glove' | 'walkupSong' | 'slidingMitt' | 'legGuard';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

/**
 * Special effects for standout items. The 3D layer renders them on the equipped piece (and the bat's swing trail);
 * the icon layer animates them on item art. Reserve them for epic and above.
 */
export const EFFECTS = ['flame', 'lightning', 'frost', 'galaxy', 'gold', 'smoke', 'prism', 'glitch', 'toxic', 'aura'] as const;
export type ItemEffect = (typeof EFFECTS)[number];

/** Surface patterns, used by item art and (where supported) 3D materials. */
export const PATTERNS = [
  'solid', 'two-tone', 'gradient', 'flames', 'camo', 'digital-camo', 'tie-dye', 'marble', 'carbon', 'pinstripe',
  'stars-stripes', 'galaxy', 'splatter', 'checker', 'tiger', 'snake', 'lightning', 'circuit', 'holo',
] as const;
export type ItemPattern = (typeof PATTERNS)[number];

export type StatKey = 'power' | 'contact' | 'speed' | 'arm' | 'fielding' | 'eye' | 'clutch' | 'swag';

export interface ItemVisual {
  /** Primary color (hex) applied to the item's main material. */
  primary: string;
  /** Secondary / accent color (hex). */
  secondary?: string;
  /** Material finish, used by the 3D layer to pick roughness/metalness. */
  finish?: 'matte' | 'gloss' | 'metal' | 'chrome' | 'wood' | 'leather' | 'glow';
  /** Variant key the 3D layer can switch geometry on (e.g. bat shape). */
  variant?: string;
  /** Text printed on the item (jersey number, bat engraving). */
  text?: string;
  /** Third color for patterns and effects. */
  accent?: string;
  /** Surface pattern; defaults to 'solid'. */
  pattern?: ItemPattern;
  /** Special effect (epic+ items). */
  effect?: ItemEffect;
}

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  rarity: Rarity;
  /** Overall rating, the "item level" equivalent. */
  ovr: number;
  type: string;            // e.g. "Maple Bat · 33.5in / 31oz"
  stats: Partial<Record<StatKey, number>>;
  perks?: string[];        // green "Equip:" lines
  setName?: string;
  flavor?: string;         // gold italic flavor text
  price?: number;          // coins
  icon: string;            // emoji/glyph fallback; generated item art is drawn from slot + visual
  visual: ItemVisual;
  /** Limited drop: shown with a "Limited" badge. */
  limited?: boolean;
}

export type AnimationName = 'idle' | 'stance' | 'swing' | 'bunt' | 'celebrate' | 'dance' | 'walk' | 'flex';

export interface PlayerProfile {
  name: string;
  team: string;
  position: string;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  number: number;
  level: number;
  skinTone: string;
  hairColor: string;
}

/**
 * Geometry variants the 3D layer must support, per slot. Item catalogs may only
 * use these values in `visual.variant`.
 */
export const VARIANTS = {
  // classic wood, fat barrel, skinny contact bat, long fungo, novelty spiked, glowing energy bat,
  // torpedo (mass bulge near the label), two-piece composite (contrast handle + end cap),
  // one-piece alloy (straight, sleek), axe-handle knob
  bat: ['classic', 'barrel', 'thin', 'fungo', 'spiked', 'neon', 'torpedo', 'composite', 'alloy', 'axe'],
  glove: ['infield', 'outfield', 'catcher', 'first-base', 'pitcher', 'trap'],
  helmet: ['single-flap', 'double-flap', 'c-flap', 'visor'],
  cap: ['fitted', 'backwards', 'snapback', 'flatbrim', 'trucker'],
  eyewear: ['wraparound', 'aviator', 'eyeblack', 'shield', 'round'],
  chain: ['rope', 'cuban', 'pearl', 'tennis', 'beads'],
  cleats: ['low', 'mid', 'high', 'turf'],
  jersey: ['home', 'away', 'city', 'throwback', 'pinstripe', 'camo', 'gradient'],
  undershirt: ['long', 'sleeve', 'thermal'],
  pants: ['long', 'knicker'],
  socks: ['crew', 'knee', 'stirrup'],
  walkupSong: ['drill', 'organ', 'salsa', 'synthwave', 'country', 'rock', 'reggaeton', 'hyperpop'],
  slidingMitt: ['mitt'],
  legGuard: ['shin', 'extended'],
} as const;
