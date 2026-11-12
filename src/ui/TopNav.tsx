import type { Route } from '../router';
import { profilePath } from '../router';
import { prefetchViewer } from '../viewer/ViewerHost';
import { useAuth } from '../data/auth';
import { useMe } from '../state/account';
import { AccountMenu } from './AccountMenu';

const Lock = () => (
  <svg className="nav-lock" width="11" height="11" viewBox="0 0 12 12" aria-hidden>
    <rect x="2" y="5.2" width="8" height="5.6" rx="1.3" fill="currentColor" />
    <path d="M3.9 5.4V3.9a2.1 2.1 0 014.2 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export function TopNav({ route }: { route: Route }) {
  const account = useAuth((s) => s.account);
  const me = useMe((s) => s.profile);
  const at = (name: Route['name']) => (route.name === name ? 'page' : undefined);
  // signed in with a player: the Build tab edits that player instead of starting a new one
  const mine = account && me ? me : null;
  const onMine = Boolean(mine && route.name === 'profile' && route.slug === mine.slug);
  const buildHref = mine ? `#${profilePath(mine.slug)}?edit=1` : '#/new';
  const buildOn = route.name === 'new' || onMine;

  return (
    <nav className="topnav" aria-label="Main">
      <div className="topnav-inner">
        <a className="brand" href="#/" aria-label="Diamond Armory home">
          <svg className="brand-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden>
            <path d="M16 3 29 16 16 29 3 16Z" fill="none" stroke="url(#bm)" strokeWidth="2.4" />
            <circle cx="16" cy="16" r="5.2" fill="#fff" />
            <path d="M13.2 12.6c1 1 1.5 2.1 1.5 3.4s-.5 2.4-1.5 3.4M18.8 12.6c-1 1-1.5 2.1-1.5 3.4s.5 2.4 1.5 3.4" stroke="#e0263c" strokeWidth="1" fill="none" />
            <defs>
              <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ff2bd6" />
                <stop offset="1" stopColor="#4ad7ff" />
              </linearGradient>
            </defs>
          </svg>
          <span className="brand-word">Diamond <span>Armory</span></span>
        </a>
        <div className="topnav-links">
          <a className="navlink" href="#/" aria-current={at('home')}>Clubhouse</a>
          <a className="navlink navfilm" href="#/film" aria-current={at('film')}>
            My Film{!account && <Lock />}
            {!account && <span className="visually-hidden"> (sign in required)</span>}
          </a>
          <a
            className={`navlink navcta ${buildOn ? 'on' : ''}`}
            href={buildHref}
            aria-current={buildOn ? 'page' : undefined}
            onPointerEnter={prefetchViewer}
            onFocus={prefetchViewer}
          >
            <span className="navcta-long">{mine ? 'Edit your player' : 'Build your player'}</span>
            <span className="navcta-short">{mine ? 'My player' : 'Build'}</span>
          </a>
        </div>
        <div className="topnav-acct">
          <AccountMenu route={route} />
        </div>
      </div>
    </nav>
  );
}
