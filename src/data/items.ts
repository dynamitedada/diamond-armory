import type { Item, PlayerProfile, Slot } from './types';

export const PLAYER: PlayerProfile = {
  name: "Manny 'Nitro' Gauz",
  team: 'Brooklyn Night Owls',
  position: 'Shortstop',
  bats: 'R',
  throws: 'R',
  number: 7,
  level: 27,
  skinTone: '#c68a5e',
  hairColor: '#1a1210',
};

export const PLAYER_ROLE = 'Leadoff Spark';

/** Signature collections (set bonuses). Key = Item.setName. */
export interface SetBonus { pieces: number; text: string }
export const SET_BONUSES: Record<string, SetBonus[]> = {
  'Night Owl Signature': [
    { pieces: 2, text: '+6 Swag and +4 Clutch under the lights.' },
    { pieces: 3, text: 'Stolen bases after the 7th inning grant +10 Speed for the rest of the game.' },
    { pieces: 4, text: '"Lights Out": first plate appearance of every night game is a guaranteed barrel.' },
  ],
  'Sandlot Classics': [
    { pieces: 2, text: '+5 Contact. Rookies in the dugout gain +3 Morale.' },
  ],
};

const NOS = 'Night Owl Signature';

export const CATALOG: Item[] = [
  // ───────────────────────── HELMET
  { id: 'helm-batting-practice', slot: 'helmet', name: 'Batting Practice Lid', rarity: 'common', ovr: 61, type: 'Helmet · Single Flap',
    stats: { contact: 2, fielding: 1 }, flavor: 'Smells like the equipment bag from 2014.', price: 120, icon: '⛑️',
    visual: { primary: '#2b2f3a', secondary: '#9aa0ad', finish: 'matte', variant: 'single-flap' } },
  { id: 'helm-carbon-shell', slot: 'helmet', name: 'Carbon Shell Pro', rarity: 'rare', ovr: 78, type: 'Helmet · Double Flap',
    stats: { contact: 4, eye: 3, clutch: 2 }, perks: ['Reduces HBP injury time by 50%.'], price: 640, icon: '⛑️',
    visual: { primary: '#14161c', secondary: '#4ad7ff', finish: 'gloss', variant: 'double-flap' } },
  { id: 'helm-night-owl', slot: 'helmet', name: 'Night Owl Midnight Helm', rarity: 'legendary', ovr: 93, type: 'Helmet · C-Flap',
    stats: { contact: 6, eye: 5, clutch: 5 }, perks: ['Pitches above 98 mph appear 4% slower.'], setName: NOS,
    flavor: 'Matte black. Owl-eye decal glows when the count is full.', price: 4800, icon: '🦉',
    visual: { primary: '#0b0d18', secondary: '#ff2bd6', finish: 'gloss', variant: 'c-flap', text: '7' } },
  { id: 'helm-chrome-dome', slot: 'helmet', name: 'Chrome Dome', rarity: 'epic', ovr: 86, type: 'Helmet · C-Flap',
    stats: { swag: 8, contact: 3, eye: 2 }, perks: ['Reflects stadium lights into the catcher\'s eyes.'],
    flavor: 'You can do your hair in it.', price: 2100, icon: '🪩',
    visual: { primary: '#d8dde6', secondary: '#7a8090', finish: 'chrome', variant: 'c-flap' } },

  // ───────────────────────── CAP
  { id: 'cap-team-fitted', slot: 'cap', name: 'Night Owls Home Fitted', rarity: 'uncommon', ovr: 70, type: 'Cap · 59Fifty Fitted',
    stats: { fielding: 2, swag: 3 }, flavor: 'Brim stays flat. Sticker stays on.', price: 240, icon: '🧢',
    visual: { primary: '#121a3a', secondary: '#ffd100', finish: 'matte', variant: 'fitted' } },
  { id: 'cap-backwards-bodega', slot: 'cap', name: 'Bodega Backwards', rarity: 'rare', ovr: 79, type: 'Cap · Worn Backwards',
    stats: { swag: 7, speed: 2 }, perks: ['+15% chance to start a dugout dance party.'], flavor: 'Bought next to the egg sandwich.', price: 520, icon: '🧢',
    visual: { primary: '#ff4d2e', secondary: '#ffffff', finish: 'matte', variant: 'backwards' } },
  { id: 'cap-gold-snapback', slot: 'cap', name: 'Crown Heights Snapback', rarity: 'epic', ovr: 87, type: 'Cap · Snapback',
    stats: { swag: 9, clutch: 3, fielding: 2 }, perks: ['Fly balls lost in the sun are 30% rarer.'],
    flavor: 'Heavy is the head.', price: 1900, icon: '👑',
    visual: { primary: '#0d0d0d', secondary: '#e6c35c', finish: 'gloss', variant: 'snapback' } },
  { id: 'cap-sandlot', slot: 'cap', name: 'Sandlot Original', rarity: 'common', ovr: 58, type: 'Cap · Fitted',
    stats: { contact: 1, swag: 1 }, setName: 'Sandlot Classics', flavor: 'You\'re killing me, Smalls.', price: 60, icon: '🧢',
    visual: { primary: '#2e5a8a', secondary: '#f2efe6', finish: 'matte', variant: 'fitted' } },

  // ───────────────────────── EYEWEAR
  { id: 'eye-blacks', slot: 'eyewear', name: 'Classic Eye Black', rarity: 'common', ovr: 60, type: 'Eyewear · Grease Stripe',
    stats: { eye: 2, swag: 1 }, flavor: 'Two stripes. Zero nonsense.', price: 30, icon: '〰️',
    visual: { primary: '#050505', finish: 'matte', variant: 'eyeblack' } },
  { id: 'eye-mirror-wrap', slot: 'eyewear', name: 'Mirror Wraps', rarity: 'rare', ovr: 80, type: 'Eyewear · Wraparound',
    stats: { eye: 5, fielding: 2, swag: 3 }, perks: ['Day games: sun glare penalty removed.'], price: 700, icon: '🕶️',
    visual: { primary: '#141414', secondary: '#6af2ff', finish: 'chrome', variant: 'wraparound' } },
  { id: 'eye-gold-aviators', slot: 'eyewear', name: 'Gold Rush Aviators', rarity: 'epic', ovr: 85, type: 'Eyewear · Aviator',
    stats: { swag: 10, eye: 3 }, perks: ['Bat flips are 2x more disrespectful.'], flavor: 'Not for reading. For being read.', price: 2200, icon: '🕶️',
    visual: { primary: '#e2b84a', secondary: '#3b2a10', finish: 'metal', variant: 'aviator' } },
  { id: 'eye-neon-visor', slot: 'eyewear', name: 'Neon Owl Lenses', rarity: 'mythic', ovr: 97, type: 'Eyewear · Wraparound',
    stats: { eye: 9, contact: 4, clutch: 4, swag: 6 }, perks: ['Highlights the seams of breaking balls in magenta.'],
    flavor: 'Prototype. Do not ask where they came from.', price: 9900, icon: '🥽',
    visual: { primary: '#120018', secondary: '#ff2bd6', finish: 'glow', variant: 'wraparound' } },

  // ───────────────────────── CHAIN
  { id: 'chain-rope', slot: 'chain', name: 'Corner Store Rope', rarity: 'uncommon', ovr: 68, type: 'Chain · 14k Rope',
    stats: { swag: 4 }, flavor: 'Turns your neck green by the 5th.', price: 180, icon: '📿',
    visual: { primary: '#d6b04c', finish: 'metal', variant: 'rope' } },
  { id: 'chain-cuban', slot: 'chain', name: 'Iced Cuban Link', rarity: 'legendary', ovr: 92, type: 'Chain · 22in Cuban',
    stats: { swag: 14, clutch: 4 }, perks: ['Home run trots take 3 seconds longer. Worth it.'],
    flavor: 'It bounces when you round second.', price: 6500, icon: '⛓️',
    visual: { primary: '#f1d27a', secondary: '#e8f6ff', finish: 'chrome', variant: 'cuban' } },
  { id: 'chain-pearl', slot: 'chain', name: 'Pearl Necklace', rarity: 'epic', ovr: 84, type: 'Chain · Freshwater Pearl',
    stats: { swag: 9, contact: 2, eye: 2 }, perks: ['Calm under pressure: -10% strikeout chance with RISP.'],
    flavor: 'Ballplayers wear pearls now. Keep up.', price: 2600, icon: '🫧',
    visual: { primary: '#f4efe6', secondary: '#c9c1b5', finish: 'gloss', variant: 'pearl' } },

  // ───────────────────────── JERSEY
  { id: 'jersey-home', slot: 'jersey', name: 'Night Owls Home Whites', rarity: 'rare', ovr: 77, type: 'Jersey · Home',
    stats: { contact: 3, fielding: 3, swag: 2 }, flavor: 'Pinstripes optional. Grass stains mandatory.', price: 450, icon: '👕',
    visual: { primary: '#f4f2ec', secondary: '#121a3a', finish: 'matte', variant: 'home', text: '7' } },
  { id: 'jersey-midnight', slot: 'jersey', name: 'Midnight City Connect', rarity: 'legendary', ovr: 94, type: 'Jersey · City Connect',
    stats: { power: 5, contact: 5, swag: 9, clutch: 3 }, perks: ['Crowd noise +20% at home.'], setName: NOS,
    flavor: 'Designed on a napkin at 3am in Bushwick.', price: 5200, icon: '🌃',
    visual: { primary: '#0c0f24', secondary: '#ff2bd6', finish: 'matte', variant: 'city', text: '7' } },
  { id: 'jersey-road-grey', slot: 'jersey', name: 'Road Greys', rarity: 'uncommon', ovr: 69, type: 'Jersey · Away',
    stats: { contact: 2, fielding: 2 }, price: 220, icon: '👕',
    visual: { primary: '#8d929c', secondary: '#121a3a', finish: 'matte', variant: 'away', text: '7' } },
  { id: 'jersey-throwback', slot: 'jersey', name: '\'89 Throwback Pullover', rarity: 'epic', ovr: 86, type: 'Jersey · Throwback',
    stats: { swag: 8, contact: 3, power: 3 }, perks: ['Announcer uses your full government name.'],
    flavor: 'Polyester. Proud of it.', price: 1800, icon: '📼',
    visual: { primary: '#ffb020', secondary: '#7a2e0e', finish: 'matte', variant: 'throwback', text: '7' } },

  // ───────────────────────── UNDERSHIRT
  { id: 'under-compression', slot: 'undershirt', name: 'Compression Base Layer', rarity: 'common', ovr: 59, type: 'Undershirt · Long Sleeve',
    stats: { speed: 1, arm: 1 }, price: 70, icon: '🎽',
    visual: { primary: '#1b1f2a', finish: 'matte', variant: 'long' } },
  { id: 'under-thermal', slot: 'undershirt', name: 'April in Queens Thermal', rarity: 'uncommon', ovr: 67, type: 'Undershirt · Thermal',
    stats: { arm: 3, fielding: 1 }, perks: ['Cold-weather penalty removed.'], price: 210, icon: '🧣',
    visual: { primary: '#2f3b55', finish: 'matte', variant: 'thermal' } },
  { id: 'under-neon-sleeve', slot: 'undershirt', name: 'Neon Owl Sleeve', rarity: 'epic', ovr: 85, type: 'Undershirt · Arm Sleeve',
    stats: { arm: 5, speed: 3, swag: 5 }, perks: ['Throws from the hole gain +4 mph.'], flavor: 'One sleeve. Maximum statement.', price: 1500, icon: '💪',
    visual: { primary: '#ff2bd6', secondary: '#4ad7ff', finish: 'glow', variant: 'sleeve' } },

  // ───────────────────────── BATTING GLOVES
  { id: 'bg-tacky', slot: 'battingGloves', name: 'Tacky Grip Classics', rarity: 'uncommon', ovr: 70, type: 'Batting Gloves · Leather',
    stats: { contact: 3, power: 1 }, setName: 'Sandlot Classics', price: 260, icon: '🧤',
    visual: { primary: '#f2efe6', secondary: '#1f2a44', finish: 'leather' } },
  { id: 'bg-hyperlight', slot: 'battingGloves', name: 'Hyperlight Velcro Xs', rarity: 'rare', ovr: 79, type: 'Batting Gloves · Synthetic',
    stats: { contact: 4, power: 3 }, perks: ['Re-adjusting your gloves between pitches intimidates rookies.'], price: 620, icon: '🧤',
    visual: { primary: '#4ad7ff', secondary: '#0b0d18', finish: 'gloss' } },
  { id: 'bg-night-owl', slot: 'battingGloves', name: 'Night Owl Talons', rarity: 'legendary', ovr: 92, type: 'Batting Gloves · Kangaroo Leather',
    stats: { power: 6, contact: 6, clutch: 3 }, perks: ['Foul tips sting 100% less.'],
    flavor: 'The owl sees every pitch. The talons grip every one.', price: 4400, icon: '🦅',
    visual: { primary: '#0b0d18', secondary: '#ff2bd6', finish: 'leather' } },
  { id: 'bg-gold-leaf', slot: 'battingGloves', name: 'Gold Leaf Gamers', rarity: 'epic', ovr: 87, type: 'Batting Gloves · Cabretta',
    stats: { power: 4, contact: 4, swag: 6 }, price: 2000, icon: '✨',
    visual: { primary: '#e6c35c', secondary: '#111', finish: 'metal' } },

  // ───────────────────────── WRISTBAND
  { id: 'wb-terry', slot: 'wristband', name: 'Terry Cloth Sweatband', rarity: 'common', ovr: 55, type: 'Wristband · Cotton',
    stats: { contact: 1 }, flavor: 'Absorbs sweat and also tears.', price: 20, icon: '⭕',
    visual: { primary: '#ffffff', finish: 'matte' } },
  { id: 'wb-neon', slot: 'wristband', name: 'Glowstick Wristband', rarity: 'rare', ovr: 76, type: 'Wristband · Silicone',
    stats: { swag: 5, speed: 2 }, perks: ['Visible from the upper deck.'], price: 380, icon: '🟢',
    visual: { primary: '#39ff88', finish: 'glow' } },
  { id: 'wb-tape', slot: 'wristband', name: 'Pine Tar Tape Job', rarity: 'uncommon', ovr: 66, type: 'Wristband · Athletic Tape',
    stats: { power: 2, contact: 1 }, perks: ['Treatment: Pine Tar (+2 Power).'], price: 90, icon: '🩹',
    visual: { primary: '#d9c9a3', secondary: '#5a3a1a', finish: 'matte' } },

  // ───────────────────────── ELBOW GUARD
  { id: 'eg-standard', slot: 'elbowGuard', name: 'Standard Elbow Guard', rarity: 'common', ovr: 58, type: 'Elbow Guard · Hard Shell',
    stats: { clutch: 1 }, price: 80, icon: '🛡️',
    visual: { primary: '#1d2230', finish: 'matte' } },
  { id: 'eg-fortress', slot: 'elbowGuard', name: 'Inside Fastball Insurance', rarity: 'rare', ovr: 78, type: 'Elbow Guard · Molded Carbon',
    stats: { clutch: 4, power: 2 }, perks: ['Crowd the plate with zero fear.'], flavor: 'Pitchers hate this one trick.', price: 560, icon: '🛡️',
    visual: { primary: '#0f1218', secondary: '#4ad7ff', finish: 'gloss' } },
  { id: 'eg-armor', slot: 'elbowGuard', name: 'Mecha Arm Plate', rarity: 'epic', ovr: 84, type: 'Elbow Guard · Titanium',
    stats: { clutch: 5, power: 3, swag: 4 }, perks: ['HBP awards +1 extra base. (Not legal.)'], price: 1700, icon: '🦾',
    visual: { primary: '#9aa3b5', secondary: '#ff2bd6', finish: 'metal' } },

  // ───────────────────────── BELT
  { id: 'belt-team', slot: 'belt', name: 'Team Issue Belt', rarity: 'common', ovr: 57, type: 'Belt · Elastic',
    stats: { fielding: 1 }, price: 40, icon: '➖',
    visual: { primary: '#121a3a', secondary: '#c0c4cc', finish: 'leather' } },
  { id: 'belt-gator', slot: 'belt', name: 'Gator Skin Buckle', rarity: 'epic', ovr: 83, type: 'Belt · Exotic Leather',
    stats: { swag: 7, clutch: 2 }, flavor: 'Legally sourced. Allegedly.', price: 1600, icon: '🐊',
    visual: { primary: '#2b3a1e', secondary: '#e6c35c', finish: 'leather' } },
  { id: 'belt-championship', slot: 'belt', name: 'Championship Strap', rarity: 'mythic', ovr: 96, type: 'Belt · Title Belt',
    stats: { swag: 12, clutch: 6, power: 3 }, perks: ['October: all stats +5%.'], flavor: 'Wrong sport. Right energy.', price: 12000, icon: '🏆',
    visual: { primary: '#e6c35c', secondary: '#b5121b', finish: 'chrome' } },

  // ───────────────────────── PANTS
  { id: 'pants-classic', slot: 'pants', name: 'High Socks Knickers', rarity: 'uncommon', ovr: 71, type: 'Pants · Knicker Cut',
    stats: { speed: 3, swag: 2 }, setName: 'Sandlot Classics', flavor: 'Old school. Show the socks.', price: 300, icon: '👖',
    visual: { primary: '#f4f2ec', secondary: '#121a3a', finish: 'matte', variant: 'knicker' } },
  { id: 'pants-long', slot: 'pants', name: 'Pajama Cut Pants', rarity: 'common', ovr: 62, type: 'Pants · Full Length',
    stats: { speed: 1, fielding: 1 }, price: 120, icon: '👖',
    visual: { primary: '#f4f2ec', finish: 'matte', variant: 'long' } },
  { id: 'pants-midnight', slot: 'pants', name: 'Midnight Slide Pants', rarity: 'rare', ovr: 80, type: 'Pants · Reinforced',
    stats: { speed: 5, fielding: 2 }, perks: ['Headfirst slides deal no damage to your ego.'], price: 690, icon: '🌙',
    visual: { primary: '#0c0f24', secondary: '#ff2bd6', finish: 'matte', variant: 'long' } },

  // ───────────────────────── SOCKS
  { id: 'socks-stirrups', slot: 'socks', name: 'Vintage Stirrups', rarity: 'rare', ovr: 75, type: 'Socks · Stirrup',
    stats: { swag: 4, speed: 2 }, flavor: 'Grandpa approved.', price: 340, icon: '🧦',
    visual: { primary: '#121a3a', secondary: '#ffffff', finish: 'matte', variant: 'stirrup' } },
  { id: 'socks-crew', slot: 'socks', name: 'Crew Socks 6-Pack', rarity: 'common', ovr: 52, type: 'Socks · Crew',
    stats: { speed: 1 }, price: 15, icon: '🧦',
    visual: { primary: '#ffffff', finish: 'matte', variant: 'crew' } },
  { id: 'socks-tiedye', slot: 'socks', name: 'Coney Island Tie-Dye', rarity: 'epic', ovr: 82, type: 'Socks · Knee High',
    stats: { swag: 8, speed: 3 }, perks: ['Opposing pitchers lose focus staring at your ankles.'], price: 1300, icon: '🌈',
    visual: { primary: '#ff4dd2', secondary: '#4ad7ff', finish: 'matte', variant: 'knee' } },

  // ───────────────────────── CLEATS
  { id: 'cleats-low', slot: 'cleats', name: 'Turf Burners Low', rarity: 'uncommon', ovr: 72, type: 'Cleats · Low Top',
    stats: { speed: 4 }, price: 290, icon: '👟',
    visual: { primary: '#ffffff', secondary: '#121a3a', finish: 'gloss', variant: 'low' } },
  { id: 'cleats-night-owl', slot: 'cleats', name: 'Night Owl Nitro Spikes', rarity: 'legendary', ovr: 95, type: 'Cleats · Mid · Metal Spikes',
    stats: { speed: 9, fielding: 4, swag: 5 }, perks: ['First step after contact is 0.08s faster.'], setName: NOS,
    flavor: 'Leaves pink sparks on the basepaths.', price: 5600, icon: '⚡',
    visual: { primary: '#0b0d18', secondary: '#ff2bd6', finish: 'glow', variant: 'mid' } },
  { id: 'cleats-high', slot: 'cleats', name: 'Ankle Breakers High', rarity: 'rare', ovr: 79, type: 'Cleats · High Top',
    stats: { speed: 3, fielding: 4 }, perks: ['Pivot turns on double plays are cleaner.'], price: 640, icon: '👟',
    visual: { primary: '#ff4d2e', secondary: '#111', finish: 'gloss', variant: 'high' } },
  { id: 'cleats-gold', slot: 'cleats', name: 'Gold Glove Gala', rarity: 'epic', ovr: 88, type: 'Cleats · Mid',
    stats: { speed: 5, fielding: 5, swag: 6 }, price: 2400, icon: '🥇',
    visual: { primary: '#e6c35c', secondary: '#ffffff', finish: 'metal', variant: 'mid' } },

  // ───────────────────────── BAT (all 6 variants)
  { id: 'bat-ash-classic', slot: 'bat', name: 'Little League Louisville', rarity: 'common', ovr: 60, type: 'Ash Bat · 33in / 31oz',
    stats: { power: 3, contact: 3 }, flavor: 'Your name is written on the knob in Sharpie.', price: 90, icon: '🏏',
    visual: { primary: '#d9b27c', secondary: '#3a2614', finish: 'wood', variant: 'classic', text: 'GAUZ' } },
  { id: 'bat-thunder-barrel', slot: 'bat', name: 'Thunder Barrel', rarity: 'epic', ovr: 88, type: 'Maple Bat · 34in / 33oz',
    stats: { power: 12, contact: 2, clutch: 3 }, perks: ['Treatment: Pine Tar (+3 Power).', 'Exit velocity +3 mph on pulled balls.'],
    flavor: 'Sounds like a car door slamming.', price: 2600, icon: '🔨',
    visual: { primary: '#2a1a12', secondary: '#c08a4a', finish: 'wood', variant: 'barrel', text: 'THUNDER' } },
  { id: 'bat-slap-stick', slot: 'bat', name: 'The Slap Stick', rarity: 'rare', ovr: 79, type: 'Birch Bat · 32in / 29oz',
    stats: { contact: 9, speed: 2, eye: 2 }, perks: ['Opposite-field singles +12%.'], setName: 'Sandlot Classics',
    flavor: 'Hit \'em where they ain\'t.', price: 720, icon: '🥢',
    visual: { primary: '#efe2c8', secondary: '#1f2a44', finish: 'wood', variant: 'thin' } },
  { id: 'bat-fungo', slot: 'bat', name: 'Coach Sal\'s Fungo', rarity: 'uncommon', ovr: 68, type: 'Fungo · 37in / 22oz',
    stats: { fielding: 4, arm: 2, contact: 1 }, perks: ['Pregame infield practice grants +2 Fielding.'], flavor: 'Fifty years of pop-ups.', price: 260, icon: '🏑',
    visual: { primary: '#c79a5b', secondary: '#111111', finish: 'wood', variant: 'fungo' } },
  { id: 'bat-spiked', slot: 'bat', name: 'Gauntlet of Bad Intentions', rarity: 'legendary', ovr: 91, type: 'Novelty Bat · Not MLB Legal',
    stats: { power: 14, swag: 8 }, perks: ['Umpires check it twice. They never find anything.'],
    flavor: 'Confiscated by the commissioner three times.', price: 7000, icon: '🗡️',
    visual: { primary: '#1c1c22', secondary: '#c9ced8', finish: 'metal', variant: 'spiked' } },
  { id: 'bat-nitro-neon', slot: 'bat', name: 'NITRO Plasma Lumber', rarity: 'mythic', ovr: 99, type: 'Energy Bat · 34in / 32oz',
    stats: { power: 13, contact: 8, clutch: 6, swag: 10 }, perks: ['Home runs leave a magenta contrail.', 'Treatment: Overcharged (+4 Clutch).'], setName: NOS,
    flavor: 'They told him it was a prototype. He told them it was his.', price: 15000, icon: '⚡',
    visual: { primary: '#ff2bd6', secondary: '#4ad7ff', finish: 'glow', variant: 'neon', text: 'NITRO' } },

  // ───────────────────────── GLOVE
  { id: 'glove-infield', slot: 'glove', name: 'Quick Transfer 11.5"', rarity: 'rare', ovr: 81, type: 'Infield Glove · I-Web',
    stats: { fielding: 8, arm: 3 }, perks: ['Double-play turn time -0.1s.'], flavor: 'Broken in with shaving cream and a mattress.', price: 780, icon: '🧤',
    visual: { primary: '#8a4b20', secondary: '#1a0f08', finish: 'leather', variant: 'infield' } },
  { id: 'glove-outfield', slot: 'glove', name: 'Warning Track Snag', rarity: 'uncommon', ovr: 70, type: 'Outfield Glove · 12.75"',
    stats: { fielding: 5, speed: 1 }, price: 300, icon: '🧤',
    visual: { primary: '#c58a4a', secondary: '#2a1a0e', finish: 'leather', variant: 'outfield' } },
  { id: 'glove-catcher', slot: 'glove', name: 'Brick Wall Mitt', rarity: 'epic', ovr: 84, type: 'Catcher\'s Mitt · 33.5"',
    stats: { fielding: 7, arm: 4, clutch: 2 }, perks: ['Framing: borderline pitches called strikes +8%.'], price: 1650, icon: '🥊',
    visual: { primary: '#1a1a1a', secondary: '#b5121b', finish: 'leather', variant: 'catcher' } },
  { id: 'glove-first', slot: 'glove', name: 'Long Scoop First Base', rarity: 'common', ovr: 62, type: 'First Base Mitt · 12.5"',
    stats: { fielding: 3 }, price: 140, icon: '🧤',
    visual: { primary: '#d4a25e', finish: 'leather', variant: 'first-base' } },
  { id: 'glove-gold', slot: 'glove', name: 'Platinum Web Gold Glove', rarity: 'legendary', ovr: 95, type: 'Infield Glove · Pro Stock',
    stats: { fielding: 12, arm: 6, swag: 6 }, perks: ['Diving stops recover 40% faster.'],
    flavor: 'Awarded, not bought. (It was bought.)', price: 8800, icon: '🏅',
    visual: { primary: '#e6c35c', secondary: '#ffffff', finish: 'metal', variant: 'infield' } },

  // ───────────────────────── WALK-UP SONG
  { id: 'song-organ', slot: 'walkupSong', name: 'Stadium Organ Medley', rarity: 'common', ovr: 55, type: 'Walk-up Song · Public Domain',
    stats: { clutch: 1 }, flavor: 'Da-da-da-DUH-da-DAAA. Charge!', price: 0, icon: '🎹',
    visual: { primary: '#c0c4cc', variant: 'organ' } },
  { id: 'song-bk-drill', slot: 'walkupSong', name: 'Brooklyn Drill Anthem', rarity: 'epic', ovr: 87, type: 'Walk-up Song · 0:15 Clip',
    stats: { swag: 9, clutch: 4, power: 2 }, perks: ['Home crowd volume +25%.'], flavor: 'The bass drop hits on the first pitch.', price: 1900, icon: '🔊',
    visual: { primary: '#ff2bd6', variant: 'drill' } },
  { id: 'song-synthwave', slot: 'walkupSong', name: 'Nitro Boost (Synthwave Mix)', rarity: 'legendary', ovr: 92, type: 'Walk-up Song · Original',
    stats: { clutch: 7, swag: 7, speed: 2 }, perks: ['Pitcher\'s first-pitch strike rate -10%.'], flavor: 'Commissioned from a DJ who only works at 2am.', price: 4200, icon: '🎛️',
    visual: { primary: '#4ad7ff', variant: 'synthwave' } },
  { id: 'song-salsa', slot: 'walkupSong', name: 'Abuela\'s Salsa Favorite', rarity: 'rare', ovr: 78, type: 'Walk-up Song · Classic',
    stats: { clutch: 5, contact: 2 }, perks: ['Family section stands up every time.'], price: 600, icon: '💃',
    visual: { primary: '#ffb020', variant: 'salsa' } },
];

export const DEFAULT_LOADOUT: string[] = [
  'helm-night-owl', 'cap-backwards-bodega', 'eye-mirror-wrap', 'chain-cuban', 'jersey-midnight',
  'under-neon-sleeve', 'bg-hyperlight', 'wb-neon', /* elbowGuard empty */ 'belt-gator', 'pants-midnight',
  'socks-stirrups', 'cleats-night-owl', 'bat-nitro-neon', 'glove-infield', 'song-bk-drill',
];

export const SLOT_LABELS: Record<Slot, string> = {
  helmet: 'Helmet', cap: 'Cap', eyewear: 'Eyewear', chain: 'Chain', jersey: 'Jersey', undershirt: 'Undershirt',
  battingGloves: 'Batting Gloves', wristband: 'Wristband', elbowGuard: 'Elbow Guard', belt: 'Belt', pants: 'Pants',
  socks: 'Socks', cleats: 'Cleats', bat: 'Bat', glove: 'Glove', walkupSong: 'Walk-up Song',
};

/** Silhouette glyphs shown in empty slots. */
export const SLOT_GLYPHS: Record<Slot, string> = {
  helmet: '⛑️', cap: '🧢', eyewear: '🕶️', chain: '📿', jersey: '👕', undershirt: '🎽', battingGloves: '🧤',
  wristband: '⭕', elbowGuard: '🛡️', belt: '➖', pants: '👖', socks: '🧦', cleats: '👟', bat: '🏏', glove: '🧤', walkupSong: '🎵',
};
