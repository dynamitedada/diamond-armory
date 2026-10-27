// Tiny hash router: works on GitHub Pages with no server rewrites.
//   #/          → Clubhouse (home)
//   #/new       → Build your player
//   #/p/<slug>  → a saved player profile
import { useMemo, useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'profile'; slug: string }
  | { name: 'notfound' };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '').split('?')[0];
  const path = ('/' + raw.replace(/^\/+/, '')).replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'home' };
  if (path === '/new') return { name: 'new' };
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
