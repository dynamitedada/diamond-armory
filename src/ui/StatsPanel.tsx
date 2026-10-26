import type { CSSProperties } from 'react';
import type { StatKey } from '../data/types';
import { CATALOG, SET_BONUSES } from '../data/items';
import { useArmory } from '../state/store';
import { BASE_STATS, PRIMARY_STATS, SECONDARY_STATS, STAT_COLOR, STAT_LABEL, sumStats, useCountUp, useUi } from './theme';

const BAR_MAX = 140;

function StatRow({ k, gear, i }: { k: StatKey; gear: number; i: number }) {
  const ready = useUi((s) => s.ready);
  const total = BASE_STATS[k] + gear;
  const shown = useCountUp(ready ? total : 0, 700);
  const pct = ready ? Math.min(100, (total / BAR_MAX) * 100) : 0;
  const basePct = Math.min(100, (BASE_STATS[k] / BAR_MAX) * 100);
  return (
    <div className="stat" style={{ '--sc': STAT_COLOR[k], '--i': i } as CSSProperties}>
      <span className="stat-label">{STAT_LABEL[k]}</span>
      <span className="stat-val tnum">{Math.round(shown)}</span>
      <span className="stat-gear tnum">{gear ? `+${gear}` : '—'}</span>
      <span className="stat-bar">
        <span className="stat-fill" style={{ width: `${pct}%` }} />
        <span className="stat-base" style={{ left: `${basePct}%` }} />
      </span>
    </div>
  );
}

export function StatsPanel() {
  const equipped = useArmory((s) => s.equipped);
  const gear = sumStats(Object.values(equipped));
  const sets = Object.entries(SET_BONUSES).map(([name, bonuses]) => {
    const pieces = CATALOG.filter((i) => i.setName === name);
    const owned = pieces.filter((p) => equipped[p.slot]?.id === p.id).length;
    return { name, bonuses, total: pieces.length, owned };
  }).filter((s) => s.owned > 0);

  return (
    <section className="stats" aria-label="Stats">
      <div className="panel">
        <h2 className="panel-title">Tools <span>base + gear</span></h2>
        {PRIMARY_STATS.map((k, i) => <StatRow key={k} k={k} gear={gear[k]} i={i} />)}
      </div>
      <div className="panel">
        <h2 className="panel-title">Intangibles <span>base + gear</span></h2>
        {SECONDARY_STATS.map((k, i) => <StatRow key={k} k={k} gear={gear[k]} i={i + 5} />)}
      </div>
      <div className="panel">
        <h2 className="panel-title">Signature Sets <span>active bonuses</span></h2>
        {sets.length === 0 && <p className="muted">No signature pieces equipped.</p>}
        {sets.map((s) => (
          <div key={s.name} className="setcard">
            <div className="setcard-head">
              <span>{s.name}</span>
              <span className="tnum">{s.owned}/{s.total}</span>
            </div>
            <div className="setcard-pips">
              {Array.from({ length: s.total }, (_, i) => <span key={i} className={i < s.owned ? 'on' : ''} />)}
            </div>
            {s.bonuses.map((b) => (
              <div key={b.pieces} className={`setcard-bonus ${s.owned >= b.pieces ? 'on' : ''}`}>({b.pieces}) {b.text}</div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
