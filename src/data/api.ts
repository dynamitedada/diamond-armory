// Data layer for shared player profiles and feedback.
// Remote mode talks to Supabase (requests carry the signed-in account when there is one); local mode keeps
// everything in this browser so development and tests never touch the real database.

import type { PlayerProfile, Slot } from './types';
import { currentAccountId } from './auth';
import { DATA_MODE, fail, randomHex, readJson, supabase, writeJson } from './supabase';

export { DATA_MODE } from './supabase';

export interface ProfileRecord {
  slug: string;
  name: string;
  nickname: string | null;
  team: string;
  position: string;
  number: number;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  skin_tone: string;
  hair_color: string;
  /** Equipped item id per slot. */
  loadout: Partial<Record<Slot, string>>;
  /** Short public bio, up to 280 characters. */
  bio: string | null;
  /** Account that owns this player; null for players built without signing in. */
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInput = Omit<ProfileRecord, 'slug' | 'owner_id' | 'created_at' | 'updated_at' | 'bio'> & {
  bio?: string | null;
};

export interface FeedbackInput {
  profile_slug?: string | null;
  rating?: number;
  liked?: string;
  improve?: string;
  features?: string[];
  contact?: string;
}

const TOKENS_KEY = 'diamond-armory:edit-tokens';
const LOCAL_PROFILES_KEY = 'diamond-armory:local-profiles';
const LOCAL_FEEDBACK_KEY = 'diamond-armory:local-feedback';

function tokens(): Record<string, string> {
  return readJson<Record<string, string>>(TOKENS_KEY, {});
}

/**
 * True when the viewer may edit this player: the signed-in account owns it, or this browser created it.
 * Pass the record when you have it so account ownership counts.
 */
export function canEdit(slug: string, rec?: Pick<ProfileRecord, 'owner_id'> | null): boolean {
  const me = currentAccountId();
  if (rec?.owner_id && me && rec.owner_id === me) return true;
  return Boolean(tokens()[slug]);
}

/** Slugs of the profiles created on this device, newest first. */
export function myProfileSlugs(): string[] {
  return Object.keys(tokens()).reverse();
}

function localProfiles(): ProfileRecord[] {
  return readJson<ProfileRecord[]>(LOCAL_PROFILES_KEY, []).map((p) => ({ ...p, bio: p.bio ?? null, owner_id: p.owner_id ?? null }));
}

export async function listProfiles(limit = 48): Promise<ProfileRecord[]> {
  if (DATA_MODE === 'local') return localProfiles().slice(0, limit);
  const { data, error } = await supabase!.from('profiles').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) fail(error);
  return data as ProfileRecord[];
}

export async function getProfile(slug: string): Promise<ProfileRecord | null> {
  if (DATA_MODE === 'local') return localProfiles().find((p) => p.slug === slug) ?? null;
  const { data, error } = await supabase!.from('profiles').select('*').eq('slug', slug).maybeSingle();
  if (error) fail(error);
  return (data as ProfileRecord | null) ?? null;
}

/** The signed-in account's player, or null. */
export async function getMyProfile(): Promise<ProfileRecord | null> {
  const me = currentAccountId();
  if (!me) return null;
  if (DATA_MODE === 'local') return localProfiles().find((p) => p.owner_id === me) ?? null;
  const { data, error } = await supabase!.from('profiles').select('*').eq('owner_id', me).maybeSingle();
  if (error) fail(error);
  return (data as ProfileRecord | null) ?? null;
}

export async function createProfile(input: ProfileInput): Promise<string> {
  let slug: string;
  let token: string;
  if (DATA_MODE === 'local') {
    const me = currentAccountId();
    const all = localProfiles();
    if (me && all.some((p) => p.owner_id === me)) throw new Error('Your account already has a player. Edit that one instead.');
    slug = randomHex(5);
    token = randomHex(18);
    const now = new Date().toISOString();
    writeJson(LOCAL_PROFILES_KEY, [{ bio: null, ...input, slug, owner_id: me, created_at: now, updated_at: now }, ...all]);
  } else {
    const { data, error } = await supabase!.rpc('create_profile', { p: input });
    if (error) fail(error);
    ({ slug, edit_token: token } = data as { slug: string; edit_token: string });
  }
  writeJson(TOKENS_KEY, { ...tokens(), [slug]: token });
  return slug;
}

export async function updateProfile(slug: string, patch: Partial<ProfileInput>): Promise<void> {
  const token = tokens()[slug] ?? null;
  if (DATA_MODE === 'local') {
    const me = currentAccountId();
    const all = localProfiles();
    const rec = all.find((p) => p.slug === slug);
    if (!rec || !(token || (me && rec.owner_id === me))) throw new Error('You can only edit your own player.');
    writeJson(
      LOCAL_PROFILES_KEY,
      all.map((p) => (p.slug === slug ? { ...p, ...patch, updated_at: new Date().toISOString() } : p)),
    );
    return;
  }
  const { error } = await supabase!.rpc('update_profile', { p_slug: slug, p_token: token, p: patch });
  if (error) fail(error);
}

/**
 * After sign-in: attach the newest player this browser built without an account to the account,
 * if the account has none yet. Returns the claimed slug, or null when there was nothing to claim.
 */
export async function claimDeviceProfile(): Promise<string | null> {
  const me = currentAccountId();
  if (!me) return null;
  if (await getMyProfile()) return null;
  for (const slug of myProfileSlugs()) {
    const token = tokens()[slug];
    if (DATA_MODE === 'local') {
      const all = localProfiles();
      const rec = all.find((p) => p.slug === slug && !p.owner_id);
      if (!rec) continue;
      writeJson(LOCAL_PROFILES_KEY, all.map((p) => (p.slug === slug ? { ...p, owner_id: me } : p)));
      return slug;
    }
    const { error } = await supabase!.rpc('claim_profile', { p_slug: slug, p_token: token });
    if (!error) return slug;
  }
  return null;
}

export async function sendFeedback(input: FeedbackInput): Promise<void> {
  const row = { ...input, device: navigator.userAgent.slice(0, 300) };
  if (DATA_MODE === 'local') {
    writeJson(LOCAL_FEEDBACK_KEY, [{ ...row, created_at: new Date().toISOString() }, ...readJson<unknown[]>(LOCAL_FEEDBACK_KEY, [])]);
    return;
  }
  const { error } = await supabase!.from('feedback').insert(row);
  if (error) fail(error);
}

/** Maps a stored profile onto the shape the header and 3D layer already use. */
export function toPlayerProfile(p: ProfileRecord): PlayerProfile {
  const [first, ...rest] = p.name.trim().split(/\s+/);
  const name = p.nickname ? [first, `'${p.nickname}'`, ...rest].join(' ') : p.name;
  return {
    name,
    team: p.team,
    position: p.position,
    bats: p.bats,
    throws: p.throws,
    number: p.number,
    level: 1,
    skinTone: p.skin_tone,
    hairColor: p.hair_color,
  };
}
