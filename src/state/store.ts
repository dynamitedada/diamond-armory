import { create } from 'zustand';
import type { AnimationName, Item, PlayerProfile, Slot } from '../data/types';
import { CATALOG, DEFAULT_LOADOUT, PLAYER } from '../data/items';

interface ArmoryState {
  player: PlayerProfile;
  /** Currently equipped item per slot (undefined = empty slot). */
  equipped: Partial<Record<Slot, Item>>;
  animation: AnimationName;
  /** Bumped every time an animation is (re)selected so one-shot clips can replay. */
  animationNonce: number;
  autoRotate: boolean;
  /** Item currently hovered in the UI (3D layer may highlight it). */
  hovered?: Item;
  equip: (item: Item) => void;
  unequip: (slot: Slot) => void;
  setAnimation: (a: AnimationName) => void;
  setAutoRotate: (v: boolean) => void;
  setHovered: (i?: Item) => void;
  /** Bumped by resetView(); the 3D viewer eases the camera back to its default framing. */
  viewResetNonce: number;
  resetView: () => void;
}

export const optionsFor = (slot: Slot): Item[] => CATALOG.filter((i) => i.slot === slot);

export const useArmory = create<ArmoryState>((set) => ({
  player: PLAYER,
  equipped: Object.fromEntries(
    DEFAULT_LOADOUT.map((id) => CATALOG.find((i) => i.id === id)!).map((i) => [i.slot, i]),
  ),
  animation: 'idle',
  animationNonce: 0,
  autoRotate: false,
  hovered: undefined,
  equip: (item) => set((s) => ({ equipped: { ...s.equipped, [item.slot]: item } })),
  unequip: (slot) => set((s) => { const e = { ...s.equipped }; delete e[slot]; return { equipped: e }; }),
  setAnimation: (animation) => set((s) => ({ animation, animationNonce: s.animationNonce + 1 })),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setHovered: (hovered) => set({ hovered }),
  viewResetNonce: 0,
  resetView: () => set((s) => ({ viewResetNonce: s.viewResetNonce + 1 })),
}));
