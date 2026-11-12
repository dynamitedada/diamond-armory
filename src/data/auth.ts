// Player accounts: email + password through Supabase Auth (or a fake account in local mode).

import { create } from 'zustand';
import { DATA_MODE, fail, randomHex, readJson, supabase, writeJson } from './supabase';

export interface Account {
  id: string;
  email: string;
}

interface AuthState {
  /** False until the stored session has been checked. */
  ready: boolean;
  account: Account | null;
}

export const useAuth = create<AuthState>(() => ({ ready: false, account: null }));

/** The signed-in account id, or null. Synchronous, for render-time checks. */
export const currentAccountId = () => useAuth.getState().account?.id ?? null;

const LOCAL_ACCOUNTS_KEY = 'diamond-armory:local-accounts';
const LOCAL_SESSION_KEY = 'diamond-armory:local-session';

type LocalAccount = Account & { password: string };

function setAccount(account: Account | null) {
  useAuth.setState({ ready: true, account });
}

// Restore the session once at startup and follow later changes (sign in/out, token refresh).
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user;
    setAccount(u ? { id: u.id, email: u.email ?? '' } : null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    setAccount(u ? { id: u.id, email: u.email ?? '' } : null);
  });
} else {
  setAccount(readJson<Account | null>(LOCAL_SESSION_KEY, null));
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export interface SignUpResult {
  /** True when the account is signed in now; false when Supabase sent a confirmation email first. */
  signedIn: boolean;
}

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  email = normalizeEmail(email);
  if (DATA_MODE === 'local') {
    const all = readJson<LocalAccount[]>(LOCAL_ACCOUNTS_KEY, []);
    if (all.some((a) => a.email === email)) throw new Error('An account with this email already exists. Sign in instead.');
    const account = { id: crypto.randomUUID?.() ?? randomHex(16), email };
    writeJson(LOCAL_ACCOUNTS_KEY, [...all, { ...account, password }]);
    writeJson(LOCAL_SESSION_KEY, account);
    setAccount(account);
    return { signedIn: true };
  }
  const { data, error } = await supabase!.auth.signUp({ email, password });
  if (error) fail(error);
  // Supabase hides "already registered" behind an empty identities list.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error('An account with this email already exists. Sign in instead.');
  }
  return { signedIn: Boolean(data.session) };
}

export async function signIn(email: string, password: string): Promise<void> {
  email = normalizeEmail(email);
  if (DATA_MODE === 'local') {
    const match = readJson<LocalAccount[]>(LOCAL_ACCOUNTS_KEY, []).find((a) => a.email === email && a.password === password);
    if (!match) throw new Error('Wrong email or password.');
    const account = { id: match.id, email: match.email };
    writeJson(LOCAL_SESSION_KEY, account);
    setAccount(account);
    return;
  }
  const { error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new Error('Wrong email or password.');
    if (/email not confirmed/i.test(error.message)) throw new Error('Confirm your email first, using the link we sent you.');
    fail(error);
  }
}

export async function signOut(): Promise<void> {
  if (DATA_MODE === 'local') {
    writeJson(LOCAL_SESSION_KEY, null);
    setAccount(null);
    return;
  }
  await supabase!.auth.signOut();
}

/** Resolves once the stored session has been checked. */
export function whenAuthReady(): Promise<Account | null> {
  const s = useAuth.getState();
  if (s.ready) return Promise.resolve(s.account);
  return new Promise((resolve) => {
    const unsub = useAuth.subscribe((st) => {
      if (st.ready) {
        unsub();
        resolve(st.account);
      }
    });
  });
}

/** Access token for raw REST/Storage calls (upload progress needs XHR). */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
