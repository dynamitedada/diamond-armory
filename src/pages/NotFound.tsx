import { useTitle } from '../lib/hooks';

interface Props {
  kind: 'player' | 'page' | 'error';
  detail?: string;
  onRetry?: () => void;
}

/** Friendly dead-end: missing player, unknown route, or a failed load with retry. */
export function NotFound({ kind, detail, onRetry }: Props) {
  useTitle(kind === 'error' ? "Couldn't load player" : kind === 'player' ? 'Player not found' : 'Page not found');
  return (
    <main className="app notfound">
      <div className="nf-card">
        <div className="nf-art" aria-hidden>
          <svg viewBox="0 0 120 120" width="120" height="120">
            <path d="M60 14 106 60 60 106 14 60Z" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 7" />
            <circle cx="60" cy="60" r="16" className="nf-ball" />
            <path d="M51 49c3 3 4 7 4 11s-1 8-4 11M69 49c-3 3-4 7-4 11s1 8 4 11" className="nf-seam" />
          </svg>
        </div>
        {kind === 'error' ? (
          <>
            <h1 className="nf-title">Rain delay</h1>
            <p className="nf-text">We couldn't load this player right now. Check your connection and give it another swing.</p>
            {detail && <p className="nf-detail">{detail}</p>}
            <div className="nf-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={onRetry}>Try again</button>
              <a className="btn btn-ghost btn-lg" href="#/">Go to the Clubhouse</a>
            </div>
          </>
        ) : (
          <>
            <h1 className="nf-title">{kind === 'player' ? 'Player not found' : 'Foul ball'}</h1>
            <p className="nf-text">
              {kind === 'player'
                ? "That link doesn't match any player. It may have a typo, or the player was never saved."
                : "There's nothing at this address."}
            </p>
            <div className="nf-actions">
              <a className="btn btn-primary btn-lg" href="#/new">Build your player</a>
              <a className="btn btn-ghost btn-lg" href="#/">Go to the Clubhouse</a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
