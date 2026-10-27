import { useArmory } from '../state/store';
import { equippedOvr, nameParts, roleFor } from '../lib/profile';
import { POSITION_COLOR, fmt, useCountUp, useUi } from './theme';

export function Header({ skeleton = false, kicker = 'Player Card' }: { skeleton?: boolean; kicker?: string }) {
  const player = useArmory((s) => s.player);
  const equipped = useArmory((s) => s.equipped);
  const ready = useUi((s) => s.ready) && !skeleton;
  const items = Object.values(equipped);
  const ovr = equippedOvr(equipped);
  const value = items.reduce((a, i) => a + (i?.price ?? 0), 0);
  const shown = useCountUp(ready ? ovr : 0, 1200);
  const shownValue = useCountUp(ready ? value : 0, 1200);
  const { first, nick, last } = nameParts(player.name);

  return (
    <header className={`header ${skeleton ? 'is-skeleton' : ''}`} aria-busy={skeleton}>
      <div className="header-backdrop" aria-hidden />
      <div className="header-inner">
        <div className="avatar" aria-hidden>
          <span className="avatar-num">{skeleton ? '' : player.number}</span>
          <span className="avatar-ring" />
        </div>
        <div className="id">
          <div className="id-kicker">Diamond Armory · {kicker}</div>
          {skeleton ? (
            <>
              <div className="sk sk-name" />
              <div className="sk sk-line" />
              <div className="sk sk-line short" />
            </>
          ) : (
            <>
              <h1 className="id-name" style={{ color: POSITION_COLOR[player.position] ?? '#fff' }}>
                {first}{nick && <> <span className="id-nick">“{nick}”</span></>}{last && <> {last}</>}
              </h1>
              <div className="id-sub">
                {player.position} · {roleFor(equipped)} · Bats {player.bats} / Throws {player.throws}
              </div>
              <div className="id-team">&lt;{player.team || 'Free Agent'}&gt; <span className="id-dot">●</span> #{player.number}</div>
            </>
          )}
        </div>
        <div className="ovr" aria-label={skeleton ? undefined : `Overall ${ovr}`}>
          <div className="ovr-num tnum">{skeleton ? '' : Math.round(shown)}</div>
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
