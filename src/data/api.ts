// Data layer for shared player profiles and feedback.
// Remote mode talks to Supabase's REST API (PostgREST) with the public key; local mode keeps
// everything in this browser so development and tests never touch the real database.

import type { PlayerProfile, Slot } from './types';

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
  created_at: string;
  updated_at: string;
}

export type ProfileInput = Omit<ProfileRecord, 'slug' | 'created_at' | 'updated_at'>;

export interface FeedbackInput {
  profile_slug?: string | null;
  rating?: number;
  liked?: string;
  improve?: string;
  features?: string[];
  contact?: string;
}

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
export const DATA_MODE: 'remote' | 'local' =
  import.meta.env.VITE_DATA_MODE === 'local' || !URL_BASE || !KEY ? 'local' : 'remote';

const TOKENS_KEY = 'diamond-armory:edit-tokens';
const LOCAL_PROFILES_KEY = 'diamond-armory:local-profiles';
const LOCAL_FEEDBACK_KEY = 'diamond-armory:local-feedback';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode etc.): edits just won't be remembered on this device.
  }
}

function tokens(): Record<string, string> {
  return readJson<Record<string, string>>(TOKENS_KEY, {});
}

/** True when this browser created the profile and may edit it. */
export function canEdit(slug: string): boolean {
  return Boolean(tokens()[slug]);
}

/** Slugs of the profiles created on this device, newest first. */
export function myProfileSlugs(): string[] {
  return Object.keys(tokens()).reverse();
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY!, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');

export async function listProfiles(limit = 48): Promise<ProfileRecord[]> {
  if (DATA_MODE === 'local') return readJson<ProfileRecord[]>(LOCAL_PROFILES_KEY, []).slice(0, limit);
  return rest<ProfileRecord[]>(`profiles?select=*&order=created_at.desc&limit=${limit}`);
}

export async function getProfile(slug: string): Promise<ProfileRecord | null> {
  if (DATA_MODE === 'local') return readJson<ProfileRecord[]>(LOCAL_PROFILES_KEY, []).find((p) => p.slug === slug) ?? null;
  const rows = await rest<ProfileRecord[]>(`profiles?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return rows[0] ?? null;
}

export async function createProfile(input: ProfileInput): Promise<string> {
  let slug: string;
  let token: string;
  if (DATA_MODE === 'local') {
    slug = randomHex(5);
    token = randomHex(18);
    const now = new Date().toISOString();
    const all = readJson<ProfileRecord[]>(LOCAL_PROFILES_KEY, []);
    writeJson(LOCAL_PROFILES_KEY, [{ ...input, slug, created_at: now, updated_at: now }, ...all]);
  } else {
    const res = await rest<{ slug: string; edit_token: string }>('rpc/create_profile', {
      method: 'POST',
      body: JSON.stringify({ p: input }),
    });
    slug = res.slug;
    token = res.edit_token;
  }
  writeJson(TOKENS_KEY, { ...tokens(), [slug]: token });
  return slug;
}

export async function updateProfile(slug: string, patch: Partial<ProfileInput>): Promise<void> {
  const token = tokens()[slug];
  if (!token) throw new Error('Only the device that created this player can edit it.');
  if (DATA_MODE === 'local') {
    const all = readJson<ProfileRecord[]>(LOCAL_PROFILES_KEY, []);
    writeJson(
      LOCAL_PROFILES_KEY,
      all.map((p) => (p.slug === slug ? { ...p, ...patch, updated_at: new Date().toISOString() } : p)),
    );
    return;
  }
  await rest<void>('rpc/update_profile', {
    method: 'POST',
    body: JSON.stringify({ p_slug: slug, p_token: token, p: patch }),
  });
}

export async function sendFeedback(input: FeedbackInput): Promise<void> {
  const row = { ...input, device: navigator.userAgent.slice(0, 300) };
  if (DATA_MODE === 'local') {
    writeJson(LOCAL_FEEDBACK_KEY, [{ ...row, created_at: new Date().toISOString() }, ...readJson<unknown[]>(LOCAL_FEEDBACK_KEY, [])]);
    return;
  }
  await rest<void>('feedback', { method: 'POST', body: JSON.stringify(row), headers: { Prefer: 'return=minimal' } });
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
