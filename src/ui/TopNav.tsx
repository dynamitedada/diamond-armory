import type { Route } from '../router';
import { prefetchViewer } from '../viewer/ViewerHost';

export function TopNav({ route }: { route: Route }) {
  const at = (name: Route['name']) => (route.name === name ? 'page' : undefined);
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
          <a
            className={`navlink navcta ${route.name === 'new' ? 'on' : ''}`}
            href="#/new"
            aria-current={at('new')}
            onPointerEnter={prefetchViewer}
            onFocus={prefetchViewer}
          >
            <span className="navcta-long">Build your player</span>
            <span className="navcta-short">Build</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
