import type { CSSProperties } from 'react';
import type { ProfileRecord } from '../data/api';
import { POSITION_ABBR, jerseyColors, loadoutOvr, nameParts, recordToPlayer } from '../lib/profile';
import { profilePath } from '../router';
import { POSITION_COLOR } from './theme';

export function PlayerCard({ rec, mine, index = 0 }: { rec: ProfileRecord; mine?: boolean; index?: number }) {
  const { primary, secondary } = jerseyColors(rec.loadout);
  const { first, nick, last } = nameParts(recordToPlayer(rec).name);
  const ovr = loadoutOvr(rec.loadout);
  const style = {
    '--jp': primary,
    '--js': secondary,
    '--pc': POSITION_COLOR[rec.position] ?? '#fff',
    '--i': index,
  } as CSSProperties;
  return (
    <a className="pcard" href={`#${profilePath(rec.slug)}`} style={style}>
      <span className="pcard-jersey" aria-hidden>
        <span className="pcard-shirt" />
        <span className="pcard-num">{rec.number}</span>
      </span>
      <span className="pcard-body">
        <span className="pcard-name">
          {first}
          {nick && <> <span className="pcard-nick">“{nick}”</span></>}
          {last && <> {last}</>}
        </span>
        <span className="pcard-meta">
          <span className="pcard-pos">{POSITION_ABBR[rec.position] ?? rec.position}</span>
          <span className="pcard-num-sm">#{rec.number}</span>
          <span className="pcard-team">{rec.team || 'Free Agent'}</span>
        </span>
      </span>
      <span className="pcard-ovr" aria-label={`Overall ${ovr}`}>
        <span className="pcard-ovr-n tnum">{ovr}</span>
        <span className="pcard-ovr-l">OVR</span>
      </span>
      {mine && <span className="pcard-badge">Yours</span>}
    </a>
  );
}

export function PlayerCardSkeleton() {
  return (
    <div className="pcard pcard-sk" aria-hidden>
      <span className="pcard-jersey sk" />
      <span className="pcard-body">
        <span className="sk sk-line" style={{ width: '70%' }} />
        <span className="sk sk-line short" />
      </span>
      <span className="sk sk-ovr" />
    </div>
  );
}
