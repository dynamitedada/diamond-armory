// Tiny hash router: works on GitHub Pages with no server rewrites.
//   #/          → Clubhouse (home)
//   #/new       → Build your player
//   #/p/<slug>  → a saved player profile (?edit=1 opens the editor for its owner)
//   #/film      → My Film (private clip library; signed-in players)
//   #/signin    → sign in / create account (?next=/path to return to, ?mode=create)
import { useMemo, useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'profile'; slug: string }
  | { name: 'film' }
  | { name: 'signin' }
  | { name: 'notfound' };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '').split('?')[0];
  const path = ('/' + raw.replace(/^\/+/, '')).replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'home' };
  if (path === '/new') return { name: 'new' };
  if (path === '/film') return { name: 'film' };
  if (path === '/signin') return { name: 'signin' };
  const m = path.match(/^\/p\/([^/]+)$/);
  if (m) {
    try {
      return { name: 'profile', slug: decodeURIComponent(m[1]) };
    } catch {
      return { name: 'notfound' };
    }
  }
  return { name: 'notfound' };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return useMemo(() => parseHash(hash), [hash]);
}

/** Query string of the hash route (`#/signin?next=/film` → next=/film). */
export function useHashQuery(): URLSearchParams {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return useMemo(() => new URLSearchParams(hash.split('?')[1] ?? ''), [hash]);
}

/** The current in-app path, e.g. "/p/abc" (no query). */
export const currentPath = () => ('/' + window.location.hash.replace(/^#/, '').split('?')[0].replace(/^\/+/, '')) || '/';

/** Only in-app paths are allowed as a post-sign-in destination. */
export const safeNext = (next: string | null | undefined, fallback = '/film') =>
  next && /^\/[a-z0-9/_%.-]*(\?[\w=&%-]*)?$/i.test(next) && !next.startsWith('/signin') ? next : fallback;

export const signinPath = (next?: string, mode?: 'create') => {
  const q = new URLSearchParams();
  if (next) q.set('next', next);
  if (mode) q.set('mode', mode);
  const qs = q.toString();
  return `/signin${qs ? `?${qs}` : ''}`;
};

/** Navigate to an in-app path like "/p/abc". `replace` keeps the current entry out of history. */
export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const hash = `#${path}`;
  if (window.location.hash === hash) return;
  if (opts.replace) window.location.replace(hash);
  else window.location.hash = path;
}

export const profilePath = (slug: string) => `/p/${encodeURIComponent(slug)}`;

/** Absolute, shareable link to a profile. */
export const profileUrl = (slug: string) =>
  `${window.location.origin}${window.location.pathname}#${profilePath(slug)}`;
