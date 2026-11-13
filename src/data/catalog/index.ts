// Expanded catalog: every item added after the original 60 (see LEGACY_CATALOG in ../items.ts).
// Sets nod to popular real gear by product-line nickname only: no brand names, no logos.
// Each file in this folder exports one slot group; this index concatenates them.

import type { Item } from '../types';
import type { SetBonus } from '../items';
import { SHOWCASE_ITEMS, SHOWCASE_SETS } from './showcase';

export const NEW_ITEMS: Item[] = [...SHOWCASE_ITEMS];

export const NEW_SET_BONUSES: Record<string, SetBonus[]> = {
  ...SHOWCASE_SETS,
};
