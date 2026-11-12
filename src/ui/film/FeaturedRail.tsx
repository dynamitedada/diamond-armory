import { useState, type DragEvent } from 'react';
import { MAX_FEATURED, MIN_FEATURED, type ClipWithUrls } from '../../data/film';
import { moveFeatured, toggleFeatured } from '../../state/film';
import { ClipPoster, PlayGlyph, fmtDuration } from './filmUi';

const DRAG_TYPE = 'application/x-da-rail';

interface Props {
  /** Rail clips in order (unsaved changes included). */
  clips: ClipWithUrls[];
  dirty: boolean;
  /** How many clips the public profile shows right now. */
  liveCount: number;
  onPlay: (i: number) => void;
}

export function railStatus(n: number, dirty: boolean, liveCount: number): { text: string; tone: 'muted' | 'warn' | 'ok' | 'live' } {
  if (n === 0) {
    return dirty && liveCount > 0
      ? { text: 'Publishing an empty rail hides Highlights from your profile.', tone: 'warn' }
      : { text: `Feature ${MIN_FEATURED} clips to go live on your profile.`, tone: 'muted' };
  }
  if (n < MIN_FEATURED) return { text: `${n} of ${MIN_FEATURED} to go live · add ${MIN_FEATURED - n} more`, tone: 'warn' };
  if (dirty) return { text: `Ready to publish · ${n} ${n === 1 ? 'clip' : 'clips'}`, tone: 'ok' };
  return { text: `Live on your profile · ${n} clips`, tone: 'live' };
}

const focusCtrl = (id: string, ctrl: string) =>
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLButtonElement>(`[data-rail-id="${id}"] [data-ctrl="${ctrl}"]`);
    if (el && !el.disabled) el.focus();
    else document.querySelector<HTMLElement>(`[data-rail-id="${id}"] .rail-thumb`)?.focus();
  });

export function FeaturedRail({ clips, dirty, liveCount, onPlay }: Props) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const n = clips.length;
  const status = railStatus(n, dirty, liveCount);

  const isRailDrag = (e: DragEvent) => e.dataTransfer.types.includes(DRAG_TYPE);
  const onDrop = (e: DragEvent, to: number) => {
    if (!isRailDrag(e)) return;
    e.preventDefault();
    const from = Number(e.dataTransfer.getData(DRAG_TYPE));
    if (Number.isFinite(from)) moveFeatured(from, Math.min(to, n - 1));
    setDragFrom(null);
    setOver(null);
  };

  return (
    <section className="rail-sec" aria-labelledby="rail-h">
      <div className="section-head">
        <h2 id="rail-h" className="section-h">On your profile</h2>
        <span className={`rail-status tone-${status.tone}`} role="status">
          {dirty && <span className="unsaved-dot" aria-hidden />}
          {status.text}
        </span>
      </div>
      <div className="rail-meter" aria-hidden>
        {Array.from({ length: MAX_FEATURED }, (_, i) => (
          <span key={i} className={`${i < n ? 'on' : ''} ${i < MIN_FEATURED ? 'need' : ''}`} />
        ))}
        <span className="rail-meter-min" style={{ left: `${(MIN_FEATURED / MAX_FEATURED) * 100}%` }}>min {MIN_FEATURED}</span>
      </div>
      <p className="rail-help">
        Pick {MIN_FEATURED}–{MAX_FEATURED} clips with <b>Feature</b>. They play in this order on your profile.
        <span className="rail-help-desk"> Drag to reorder.</span>
      </p>
      <ol className="rail" aria-label={`Featured clips, ${n} of ${MAX_FEATURED}`}>
        {Array.from({ length: MAX_FEATURED }, (_, i) => {
          const c = clips[i];
          if (!c) {
            return (
              <li
                key={`empty-${i}`}
                className={`rail-slot empty ${i < MIN_FEATURED ? 'need' : ''} ${over === i ? 'over' : ''}`}
                onDragOver={(e) => { if (isRailDrag(e)) { e.preventDefault(); setOver(i); } }}
                onDragLeave={() => setOver((o) => (o === i ? null : o))}
                onDrop={(e) => onDrop(e, i)}
              >
                <span className="rail-num">{i + 1}</span>
                <span className="rail-empty-label">{i < MIN_FEATURED ? 'Needed' : 'Optional'}</span>
              </li>
            );
          }
          const dur = fmtDuration(c.duration_s);
          return (
            <li
              key={c.id}
              data-rail-id={c.id}
              className={`rail-slot filled ${dragFrom === i ? 'dragging' : ''} ${over === i && dragFrom !== i ? 'over' : ''}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, String(i));
                e.dataTransfer.effectAllowed = 'move';
                setDragFrom(i);
              }}
              onDragEnd={() => { setDragFrom(null); setOver(null); }}
              onDragOver={(e) => { if (isRailDrag(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(i); } }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={(e) => onDrop(e, i)}
            >
              <span className="rail-num">{i + 1}</span>
              <button type="button" className="rail-thumb" onClick={() => onPlay(i)} aria-label={`Play ${c.title}`}>
                <ClipPoster url={c.posterUrl} title={c.title} tag={c.tag} />
                <span className="rail-play" aria-hidden><PlayGlyph size={16} /></span>
                {dur && <span className="clip-dur tnum" aria-hidden>{dur}</span>}
              </button>
              <span className="rail-title" title={c.title}>{c.title}</span>
              <span className="rail-ctrls">
                <button
                  type="button"
                  data-ctrl="left"
                  className="rail-btn"
                  aria-label={`Move ${c.title} earlier`}
                  disabled={i === 0}
                  onClick={() => { moveFeatured(i, i - 1); focusCtrl(c.id, i - 1 === 0 ? 'right' : 'left'); }}
                >
                  ←
                </button>
                <button
                  type="button"
                  data-ctrl="remove"
                  className="rail-btn rail-remove"
                  aria-label={`Remove ${c.title} from your profile`}
                  onClick={() => {
                    const nextId = clips[i + 1]?.id ?? clips[i - 1]?.id;
                    toggleFeatured(c.id);
                    if (nextId) focusCtrl(nextId, 'remove');
                  }}
                >
                  ✕
                </button>
                <button
                  type="button"
                  data-ctrl="right"
                  className="rail-btn"
                  aria-label={`Move ${c.title} later`}
                  disabled={i === n - 1}
                  onClick={() => { moveFeatured(i, i + 1); focusCtrl(c.id, i + 1 === n - 1 ? 'left' : 'right'); }}
                >
                  →
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
