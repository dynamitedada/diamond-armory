// Shared contract between the UI layer (src/ui) and the 3D layer (src/scene).

export type Slot =
  | 'helmet' | 'cap' | 'eyewear' | 'chain' | 'jersey' | 'undershirt'
  | 'battingGloves' | 'wristband' | 'elbowGuard' | 'belt' | 'pants' | 'socks' | 'cleats'
  | 'bat' | 'glove' | 'walkupSong';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

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
  icon: string;            // emoji/glyph placeholder icon
  visual: ItemVisual;
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
  bat: ['classic', 'barrel', 'thin', 'fungo', 'spiked', 'neon'],      // classic wood, fat barrel, skinny contact bat, long fungo, novelty spiked, glowing energy bat
  glove: ['infield', 'outfield', 'catcher', 'first-base'],
  helmet: ['single-flap', 'double-flap', 'c-flap'],
  cap: ['fitted', 'backwards', 'snapback'],
  eyewear: ['wraparound', 'aviator', 'eyeblack'],
  chain: ['rope', 'cuban', 'pearl'],
  cleats: ['low', 'mid', 'high'],
} as const;
