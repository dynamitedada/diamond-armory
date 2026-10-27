// The in-progress "Build your player" draft. Lives for the session so hopping to the Clubhouse
// and back doesn't lose anything; cleared once the player is saved.
import { create } from 'zustand';
import { DEFAULT_LOADOUT_MAP, newFields, type Loadout, type ProfileFields } from '../lib/profile';
import type { ProfileRecord } from '../data/api';

interface DraftState {
  fields: ProfileFields;
  loadout: Loadout;
  /** Builder step on phones. */
  step: number;
  setFields: (patch: Partial<ProfileFields>) => void;
  setLoadout: (l: Loadout) => void;
  setStep: (n: number) => void;
  reset: () => void;
}

export const useDraft = create<DraftState>((set) => ({
  fields: newFields(),
  loadout: DEFAULT_LOADOUT_MAP,
  step: 0,
  setFields: (patch) => set((s) => ({ fields: { ...s.fields, ...patch } })),
  setLoadout: (loadout) => set({ loadout }),
  setStep: (step) => set({ step }),
  reset: () => set({ fields: newFields(), loadout: DEFAULT_LOADOUT_MAP, step: 0 }),
}));

// ───────────────────────────── profile cache
// Records we already have (from the Clubhouse list or a fresh save) open instantly; the page
// still revalidates in the background.
const cache = new Map<string, ProfileRecord>();
export const cacheProfile = (r: ProfileRecord) => cache.set(r.slug, r);
export const cachedProfile = (slug: string) => cache.get(slug);

/** Set right after a save so the profile page greets the creator with the share sheet. */
let freshSlug: string | null = null;
export const markFresh = (slug: string) => { freshSlug = slug; };
export const isFresh = (slug: string) => freshSlug === slug;
export const clearFresh = (slug: string) => { if (freshSlug === slug) freshSlug = null; };
