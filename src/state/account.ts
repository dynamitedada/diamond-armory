// The signed-in account's own player (if any), kept in sync with sign-in / sign-out.
// Drives the nav ("Edit your player" vs "Build"), the account menu and the My Film header.
import { create } from 'zustand';
import { getMyProfile, type ProfileRecord } from '../data/api';
import { useAuth } from '../data/auth';
import { cacheProfile } from './draft';

interface MeState {
  /** undefined while unknown (auth not ready / loading), null when the account has no player. */
  profile: ProfileRecord | null | undefined;
  /** Account id the profile above belongs to. */
  forAccount: string | null;
}

export const useMe = create<MeState>(() => ({ profile: undefined, forAccount: null }));

let seq = 0;

/** Re-reads the signed-in account's player (call after creating or claiming one). */
export async function refreshMe(): Promise<ProfileRecord | null> {
  const { ready, account } = useAuth.getState();
  const id = account?.id ?? null;
  const mine = ++seq;
  if (!ready) return null;
  if (!id) {
    useMe.setState({ profile: null, forAccount: null });
    return null;
  }
  if (useMe.getState().forAccount !== id) useMe.setState({ profile: undefined, forAccount: id });
  try {
    const rec = await getMyProfile();
    if (mine === seq) {
      if (rec) cacheProfile(rec);
      useMe.setState({ profile: rec, forAccount: id });
    }
    return rec;
  } catch {
    if (mine === seq) useMe.setState({ profile: null, forAccount: id });
    return null;
  }
}

/** Local patch after the player is saved elsewhere (keeps the nav in sync without a refetch). */
export function setMyProfile(rec: ProfileRecord | null) {
  const id = useAuth.getState().account?.id ?? null;
  if (id) useMe.setState({ profile: rec, forAccount: id });
}

// follow sign-in / sign-out
let lastId: string | null | undefined;
let lastReady = false;
const sync = () => {
  const { ready, account } = useAuth.getState();
  const id = account?.id ?? null;
  if (ready === lastReady && id === lastId) return;
  lastReady = ready;
  lastId = id;
  void refreshMe();
};
useAuth.subscribe(sync);
sync();
