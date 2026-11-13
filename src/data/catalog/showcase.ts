// Showcase items: the headline pieces of the expansion, also used as fixtures by the 3D and art work.

import type { Item } from '../types';
import type { SetBonus } from '../items';

export const HYPE = 'Hype Collection';

export const SHOWCASE_SETS: Record<string, SetBonus[]> = {
  [HYPE]: [
    { pieces: 2, text: '+6 Power. Your first swing of every at-bat leaves a flame trail.' },
    { pieces: 3, text: '"Heat Check": after a hard-hit ball, +8 Contact for your next at-bat.' },
    { pieces: 4, text: '"Fully Lit": extra-base hits ignite the base path behind you. +12 Swag.' },
  ],
};

export const SHOWCASE_ITEMS: Item[] = [
  {
    id: 'bat-hype-fire', slot: 'bat', name: 'Hype Fire', rarity: 'epic', ovr: 92, setName: HYPE, limited: true,
    type: 'Two-Piece Composite · 32in / 29oz · Drop -3',
    stats: { power: 14, contact: 6, swag: 10 },
    perks: ['Equip: Swings leave a trail of fire.', 'Equip: Barrels hit 2 mph harder off pitches above 95 mph.'],
    flavor: 'The bat every dugout argues about. Sells out in an hour.',
    price: 9_500, icon: '🔥',
    visual: { primary: '#141414', secondary: '#ff5a1f', accent: '#ffd23f', finish: 'gloss', variant: 'composite', pattern: 'flames', effect: 'flame', text: 'HYPE FIRE' },
  },
  {
    id: 'bat-hype-comp', slot: 'bat', name: 'Hype Comp', rarity: 'rare', ovr: 84, setName: HYPE,
    type: 'Two-Piece Composite · 31in / 26oz · Drop -5',
    stats: { power: 8, contact: 7, swag: 4 },
    perks: ['Equip: +3 Contact on two-strike counts.'],
    flavor: 'Fire\'s little brother. Still runs hot.',
    price: 4_200, icon: '🏏',
    visual: { primary: '#1d1d22', secondary: '#ff8c1a', accent: '#ffffff', finish: 'gloss', variant: 'composite', pattern: 'two-tone', text: 'HYPE COMP' },
  },
  {
    id: 'bg-hype-fire', slot: 'battingGloves', name: 'Hype Fire Grips', rarity: 'epic', ovr: 88, setName: HYPE,
    type: 'Batting Gloves · Goatskin Palm',
    stats: { contact: 6, power: 4, swag: 6 },
    perks: ['Equip: Hands glow ember-orange during your stance.'],
    flavor: 'Velcro straps rated for 400 rips a day.',
    price: 2_400, icon: '🧤',
    visual: { primary: '#121212', secondary: '#ff5a1f', accent: '#ffd23f', finish: 'leather', pattern: 'flames', effect: 'flame' },
  },
  {
    id: 'helm-hype-fire', slot: 'helmet', name: 'Hype Fire Lid', rarity: 'epic', ovr: 89, setName: HYPE,
    type: 'Helmet · C-Flap · Matte',
    stats: { contact: 5, eye: 5, swag: 6 },
    perks: ['Equip: Heat shimmer rises off the shell after a hit.'],
    flavor: 'Matte black with a hand-painted flame wrap.',
    price: 2_900, icon: '⛑️',
    visual: { primary: '#101010', secondary: '#ff5a1f', accent: '#ffd23f', finish: 'matte', variant: 'c-flap', pattern: 'flames', effect: 'flame' },
  },
  {
    id: 'cleats-hype-fire', slot: 'cleats', name: 'Hype Fire Spikes', rarity: 'epic', ovr: 87, setName: HYPE,
    type: 'Cleats · Metal · Mid',
    stats: { speed: 9, fielding: 3, swag: 6 },
    perks: ['Equip: Leaves scorch marks when you steal a base.'],
    flavor: 'Lace up, light up.',
    price: 2_600, icon: '👟',
    visual: { primary: '#141414', secondary: '#ff5a1f', accent: '#ffd23f', finish: 'gloss', variant: 'mid', pattern: 'flames', effect: 'flame' },
  },
  {
    id: 'bat-torpedo-pinstripe', slot: 'bat', name: 'Bronx Torpedo', rarity: 'legendary', ovr: 95, limited: true,
    type: 'Maple · Torpedo Profile · 34in / 32oz',
    stats: { power: 12, contact: 12, clutch: 8 },
    perks: ['Equip: The sweet spot sits where you actually make contact.', 'Equip: Opposing benches demand to inspect it.'],
    flavor: 'They said it looked like a bowling pin. Then it hit three homers on opening weekend.',
    price: 14_000, icon: '🎳',
    visual: { primary: '#f1e6cf', secondary: '#0c2340', accent: '#c4ced4', finish: 'wood', variant: 'torpedo', pattern: 'pinstripe', effect: 'lightning', text: 'TORPEDO' },
  },
  {
    id: 'chain-beads-titanium', slot: 'chain', name: 'Ti Twist Beads', rarity: 'uncommon', ovr: 70,
    type: 'Necklace · Titanium Rope Beads',
    stats: { clutch: 3, swag: 3 },
    flavor: 'Every big leaguer\'s neck since 2006.',
    price: 300, icon: '📿',
    visual: { primary: '#1b2a6b', secondary: '#e4e7ee', finish: 'matte', variant: 'beads', pattern: 'two-tone' },
  },
  {
    id: 'glove-a2k-galaxy', slot: 'glove', name: 'A-2K Galaxy', rarity: 'mythic', ovr: 98, limited: true,
    type: 'Fielding Glove · 11.5in · Pro Stock Leather',
    stats: { fielding: 18, arm: 6, swag: 10 },
    perks: ['Equip: Line drives stick. Every time.', 'Equip: The pocket glows with a slow-turning nebula.'],
    flavor: 'Broken in by a shortstop on a distant moon.',
    price: 22_000, icon: '🌌',
    visual: { primary: '#1a103d', secondary: '#7b5cff', accent: '#3be8ff', finish: 'leather', variant: 'infield', pattern: 'galaxy', effect: 'galaxy' },
  },
];
