import type { Slot } from '../data/types';
import { EquipmentSlot } from './EquipmentSlot';
import { BOTTOM_SLOTS, LEFT_SLOTS, RIGHT_SLOTS } from './theme';

/** All slots in one 2-column grid (phone builder), bat & glove first: "pick your bat". */
const GRID_SLOTS: Slot[] = [...BOTTOM_SLOTS, ...LEFT_SLOTS, ...RIGHT_SLOTS];

export function SlotGrid() {
  return (
    <div className="slot-grid">
      {GRID_SLOTS.map((s, i) => <EquipmentSlot key={s} slot={s} side="left" index={i} />)}
    </div>
  );
}
