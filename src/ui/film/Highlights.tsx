// Profile "Highlights": the player's featured clips in their chosen order.
import { useEffect, useState, type CSSProperties } from 'react';
import { listFeaturedClips, type ClipWithUrls } from '../../data/film';
import { ClipLightbox } from './ClipLightbox';
import { ClipPoster, PlayGlyph, TagPill, fmtDuration } from './filmUi';
import { FilmIcon } from './UploadPanel';

interface Props {
  ownerId: string | null;
  /** The viewer owns this player (shows "Manage film" and an empty-state prompt). */
  isOwner: boolean;
  firstName: string;
  /** Bumped by the page to refetch. */
  refreshKey?: number;
}

type Load = { status: 'loading' } | { status: 'ready'; clips: ClipWithUrls[] } | { status: 'error' };

export function Highlights({ ownerId, isOwner, firstName, refreshKey = 0 }: Props) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!ownerId) return;
    let alive = true;
    listFeaturedClips(ownerId)
      .then((clips) => alive && setLoad({ status: 'ready', clips }))
      .catch(() => alive && setLoad({ status: 'error' }));
    return () => { alive = false; };
  }, [ownerId, refreshKey]);

  const clips = load.status === 'ready' ? load.clips : [];

  if (!ownerId || load.status === 'error' || (load.status === 'ready' && clips.length === 0)) {
    if (!isOwner) return null;
    // owner with nothing featured yet: point them at My Film
    return (
      <section className="hl hl-empty" aria-labelledby="hl-h">
        <span className="hl-empty-art" aria-hidden><FilmIcon size={40} /></span>
        <div className="hl-empty-copy">
          <h2 id="hl-h" className="hl-empty-title">Add Highlights to your card</h2>
          <p className="muted">
            {ownerId
              ? 'Upload clips in My Film and feature 4–8 of them. They play right here for everyone who visits.'
              : 'Sign in to link this player to an account, then add clips in My Film.'}
          </p>
        </div>
        <a className="btn btn-primary" href="#/film">Manage film</a>
      </section>
    );
  }

  return (
    <section className="hl" aria-labelledby="hl-h" aria-busy={load.status === 'loading'}>
      <div className="section-head">
        <h2 id="hl-h" className="section-h">Highlights</h2>
        <span className="hl-head-side">
          {load.status === 'ready' && <span className="section-meta">{clips.length} {clips.length === 1 ? 'clip' : 'clips'}</span>}
          {isOwner && <a className="btn btn-ghost btn-sm" href="#/film">Manage film</a>}
        </span>
      </div>
      <ol className="hl-grid">
        {load.status === 'loading'
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="hl-card hl-sk" aria-hidden><span className="hl-thumb sk" /><span className="sk sk-line" /></li>
            ))
          : clips.map((c, i) => {
              const dur = fmtDuration(c.duration_s);
              return (
                <li key={c.id} className="hl-card" style={{ '--i': i } as CSSProperties}>
                  <button type="button" className="hl-thumb" onClick={() => setOpen(i)} aria-label={`Play highlight ${i + 1}: ${c.title}`}>
                    <ClipPoster url={c.posterUrl} title={c.title} tag={c.tag} />
                    <span className="clip-shade" aria-hidden />
                    <span className="hl-num" aria-hidden>{i + 1}</span>
                    <span className="clip-play" aria-hidden><PlayGlyph /></span>
                    {dur && <span className="clip-dur tnum" aria-hidden>{dur}</span>}
                  </button>
                  <div className="hl-meta">
                    <span className="hl-title">{c.title}</span>
                    <TagPill tag={c.tag} />
                  </div>
                </li>
              );
            })}
      </ol>
      <ClipLightbox
        clips={clips}
        index={open}
        onIndex={setOpen}
        onClose={() => setOpen(null)}
        label={`${firstName}'s highlights`}
        numbered
      />
    </section>
  );
}
