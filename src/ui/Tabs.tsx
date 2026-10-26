import { useState } from 'react';

const TABS = ['Overview', 'Stats', 'Career', 'Collections'] as const;

export function Tabs() {
  const [active, setActive] = useState<(typeof TABS)[number]>('Overview');
  return (
    <nav className="tabs" role="tablist">
      {TABS.map((t) => (
        <button
          key={t}
          role="tab"
          type="button"
          aria-selected={active === t}
          aria-disabled={t !== 'Overview'}
          className={`tab ${active === t ? 'on' : ''}`}
          onClick={() => t === 'Overview' && setActive(t)}
          title={t === 'Overview' ? undefined : 'Coming soon'}
        >
          {t}
          {t !== 'Overview' && <span className="tab-soon">soon</span>}
        </button>
      ))}
    </nav>
  );
}
