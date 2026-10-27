import { useCallback, useEffect, useState } from 'react';
import { getProfile, listProfiles, myProfileSlugs, type ProfileRecord } from '../data/api';
import { cacheProfile } from '../state/draft';
import { useTitle } from '../lib/hooks';
import { PlayerCard, PlayerCardSkeleton } from '../ui/PlayerCard';
import { prefetchViewer } from '../viewer/ViewerHost';

type Load = { status: 'loading' } | { status: 'ready'; all: ProfileRecord[]; mine: ProfileRecord[] } | { status: 'error'; message: string };

async function loadClubhouse(): Promise<{ all: ProfileRecord[]; mine: ProfileRecord[] }> {
  const slugs = myProfileSlugs();
  const all = await listProfiles(48);
  const bySlug = new Map(all.map((r) => [r.slug, r]));
  const missing = slugs.filter((s) => !bySlug.has(s)).slice(0, 8);
  const extra = await Promise.all(missing.map((s) => getProfile(s).catch(() => null)));
  for (const r of extra) if (r) bySlug.set(r.slug, r);
  for (const r of bySlug.values()) cacheProfile(r);
  const mine = slugs.map((s) => bySlug.get(s)).filter((r): r is ProfileRecord => Boolean(r));
  return { all, mine };
}

function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 420 340" aria-hidden>
      <defs>
        <radialGradient id="ha-field" cx="50%" cy="85%" r="75%">
          <stop offset="0" stopColor="#1e8c50" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1e8c50" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ha-arc" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ff2bd6" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ff2bd6" />
          <stop offset="1" stopColor="#4ad7ff" />
        </linearGradient>
        <filter id="ha-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M210 318 L44 152 A236 236 0 0 1 376 152 Z" fill="url(#ha-field)" />
      <path d="M210 318 L44 152 A236 236 0 0 1 376 152 Z" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
      <path d="M210 304 L290 224 L210 144 L130 224 Z" fill="rgba(201,140,80,.10)" stroke="#ffd100" strokeOpacity=".55" strokeWidth="2" />
      <circle cx="210" cy="224" r="12" fill="rgba(201,140,80,.25)" />
      {[[210, 304], [290, 224], [210, 144], [130, 224]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 6} y={y - 6} width="12" height="12" transform={`rotate(45 ${x} ${y})`} fill="#fff" opacity=".9" />
      ))}
      <path className="hero-arc" d="M210 300 Q 300 40 392 70" fill="none" stroke="url(#ha-arc)" strokeWidth="4" strokeLinecap="round" filter="url(#ha-glow)" />
      <g className="hero-ball" filter="url(#ha-glow)">
        <circle cx="392" cy="70" r="11" fill="#fff" />
        <path d="M385 63c3 2.5 4 5 4 7s-1 4.5-4 7M399 63c-3 2.5-4 5-4 7s1 4.5 4 7" stroke="#e0263c" strokeWidth="1.6" fill="none" />
      </g>
      {[40, 110, 310, 380].map((x, i) => (
        <g key={x} opacity=".8">
          <circle cx={x} cy={18 + (i % 2) * 10} r="3" fill="#fff" />
          <circle cx={x} cy={18 + (i % 2) * 10} r="12" fill="#bfe8ff" opacity=".12" />
        </g>
      ))}
    </svg>
  );
}

export function HomePage() {
  useTitle('Clubhouse');
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const run = useCallback(() => {
    let alive = true;
    loadClubhouse()
      .then((d) => alive && setLoad({ status: 'ready', ...d }))
      .catch((err) => alive && setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Network error' }));
    return () => { alive = false; };
  }, []);
  useEffect(() => run(), [run, attempt]);

  // warm up the 3D player while people read the page (it's what they tap next)
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const t = window.setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(prefetchViewer) : prefetchViewer()), 2500);
    return () => clearTimeout(t);
  }, []);

  const mine = load.status === 'ready' ? load.mine : [];
  const mineSet = new Set(myProfileSlugs());

  return (
    <main className="home">
      <section className="hero">
        <HeroArt />
        <div className="hero-copy">
          <p className="kicker">Diamond Armory</p>
          <h1 className="hero-title">Build your baseball player.</h1>
          <p className="hero-lede">Pick your bat. Watch him swing.</p>
          <p className="hero-sub">Name your player, gear up, and text the link to your team. No account. Takes about a minute.</p>
          <div className="hero-cta">
            <a className="btn btn-primary btn-xl" href="#/new" onPointerEnter={prefetchViewer} onTouchStart={prefetchViewer} onFocus={prefetchViewer}>
              Build your player
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
        </div>
      </section>

      {mine.length > 0 && (
        <section className="home-section" aria-labelledby="mine-h">
          <div className="section-head">
            <h2 id="mine-h" className="section-h">Your players</h2>
            <span className="section-meta">Saved on this device</span>
          </div>
          <div className="card-grid">
            {mine.map((r, i) => <PlayerCard key={r.slug} rec={r} index={i} />)}
          </div>
        </section>
      )}

      <section className="home-section" aria-labelledby="club-h" aria-busy={load.status === 'loading'}>
        <div className="section-head">
          <h2 id="club-h" className="section-h">The Clubhouse</h2>
          {load.status === 'ready' && load.all.length > 0 && (
            <span className="section-meta">{load.all.length} {load.all.length === 1 ? 'player' : 'players'} · newest first</span>
          )}
        </div>

        {load.status === 'loading' && (
          <div className="card-grid">
            {Array.from({ length: 6 }, (_, i) => <PlayerCardSkeleton key={i} />)}
          </div>
        )}

        {load.status === 'error' && (
          <div className="state-card" role="alert">
            <p className="state-title">The clubhouse lights are out.</p>
            <p className="muted">We couldn't load players right now. Check your connection and try again.</p>
            <button type="button" className="btn btn-primary" onClick={() => { setLoad({ status: 'loading' }); setAttempt((n) => n + 1); }}>
              Try again
            </button>
          </div>
        )}

        {load.status === 'ready' && load.all.length === 0 && (
          <div className="state-card empty">
            <div className="empty-art" aria-hidden>
              <span className="pcard-shirt" />
              <span className="empty-num">00</span>
            </div>
            <p className="state-title">The dugout's empty.</p>
            <p className="muted">No one has built a player yet. Be the first one on the field.</p>
            <a className="btn btn-primary btn-lg" href="#/new">Build the first player</a>
          </div>
        )}

        {load.status === 'ready' && load.all.length > 0 && (
          <div className="card-grid">
            {load.all.map((r, i) => <PlayerCard key={r.slug} rec={r} mine={mineSet.has(r.slug)} index={i} />)}
          </div>
        )}
      </section>
    </main>
  );
}
