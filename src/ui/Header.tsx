import { useArmory } from '../state/store';
import { PLAYER_ROLE } from '../data/items';
import { POSITION_COLOR, fmt, useCountUp, useUi } from './theme';

export function Header() {
  const player = useArmory((s) => s.player);
  const equipped = useArmory((s) => s.equipped);
  const ready = useUi((s) => s.ready);
  const items = Object.values(equipped);
  const ovr = items.length ? Math.round(items.reduce((a, i) => a + (i?.ovr ?? 0), 0) / items.length) : 0;
  const value = items.reduce((a, i) => a + (i?.price ?? 0), 0);
  const shown = useCountUp(ready ? ovr : 0, 1200);
  const shownValue = useCountUp(ready ? value : 0, 1200);
  const [first, ...restName] = player.name.split(' ');
  const nick = player.name.match(/'(.+)'/)?.[1];
  const last = restName.filter((p) => !p.startsWith("'")).join(' ');

  return (
    <header className="header">
      <div className="header-backdrop" aria-hidden />
      <div className="header-inner">
        <div className="avatar" aria-hidden>
          <span className="avatar-num">{player.number}</span>
          <span className="avatar-ring" />
        </div>
        <div className="id">
          <div className="id-kicker">Diamond Armory · Player Card</div>
          <h1 className="id-name" style={{ color: POSITION_COLOR[player.position] ?? '#fff' }}>
            {first} {nick && <span className="id-nick">“{nick}”</span>} {last}
          </h1>
          <div className="id-sub">
            Lv {player.level} · {player.position} · {PLAYER_ROLE} · Bats {player.bats} / Throws {player.throws}
          </div>
          <div className="id-team">&lt;{player.team}&gt; <span className="id-dot">●</span> #{player.number}</div>
        </div>
        <div className="ovr">
          <div className="ovr-num tnum">{Math.round(shown)}</div>
          <div className="ovr-meta">
            <div className="ovr-label">Overall</div>
            <div className="ovr-value tnum">{fmt(Math.round(shownValue))} <span className="coin">◉</span></div>
            <div className="ovr-sub">loadout value</div>
          </div>
        </div>
      </div>
    </header>
  );
}
