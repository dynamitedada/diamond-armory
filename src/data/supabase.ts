// Shared Supabase client. Null in local mode, where every data module keeps its data in this browser.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const DATA_MODE: 'remote' | 'local' =
  import.meta.env.VITE_DATA_MODE === 'local' || !URL_BASE || !KEY ? 'local' : 'remote';

export const supabase: SupabaseClient | null =
  DATA_MODE === 'remote'
    ? createClient(URL_BASE!, KEY!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // The site routes on the URL hash, so never let auth parse it.
          detectSessionInUrl: false,
          storageKey: 'diamond-armory:auth',
        },
      })
    : null;

export const SUPABASE_URL = URL_BASE ?? '';
export const SUPABASE_KEY = KEY ?? '';

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode etc.): nothing is remembered on this device.
  }
}

export const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');

/** Turns a Supabase/PostgREST error into an Error with a readable message. */
export function fail(error: { message?: string } | null | undefined, fallback = 'Something went wrong. Try again.'): never {
  throw new Error(error?.message || fallback);
}
