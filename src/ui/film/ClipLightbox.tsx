import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ClipTag } from '../../data/film';
import { useDialog } from '../../lib/useDialog';
import { TagPill, fmtDuration } from './filmUi';

export interface LightboxClip {
  id: string;
  title: string;
  tag: ClipTag;
  duration_s: number | null;
  videoUrl: string | null;
  posterUrl: string | null;
}

interface Props {
  clips: LightboxClip[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** "Highlights · Manny Gauz" etc. */
  label?: string;
  /** Shown before the title (e.g. the rail number). */
  numbered?: boolean;
}

const Arrow = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {dir === 'l' ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
  </svg>
);

/** Full-screen clip player: prev/next buttons, ←/→ keys, Esc to close, focus trapped inside. */
export function ClipLightbox({ clips, index, onIndex, onClose, label, numbered }: Props) {
  const open = index !== null && clips.length > 0;
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(ref, open, { onClose, firstSelector: '.lb-close' });

  const i = open ? Math.min(index!, clips.length - 1) : 0;
  const clip = open ? clips[i] : null;
  const many = clips.length > 1;
  const go = (d: number) => onIndex((i + d + clips.length) % clips.length);
  const goRef = useRef(go);
  useLayoutEffect(() => { goRef.current = go; });

  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, select, textarea')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goRef.current(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goRef.current(1); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, many]);

  if (!open || !clip) return null;
  const dur = fmtDuration(clip.duration_s);

  return createPortal(
    <div className="lightbox" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <div className="lb-backdrop" onClick={onClose} aria-hidden />
      <div className="lb-top">
        <span className="lb-count tnum" aria-live="polite">{label ? `${label} · ` : ''}{i + 1} / {clips.length}</span>
        <button type="button" className="icon-btn lb-close" onClick={onClose} aria-label="Close player">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="lb-stage">
        {many && (
          <button type="button" className="lb-nav lb-prev" onClick={() => go(-1)} aria-label="Previous clip">
            <Arrow dir="l" />
          </button>
        )}
        <div className="lb-frame">
          {clip.videoUrl ? (
            <video
              key={clip.id}
              className="lb-video"
              src={clip.videoUrl}
              poster={clip.posterUrl ?? undefined}
              controls
              playsInline
              autoPlay
              preload="auto"
              aria-label={clip.title}
            />
          ) : (
            <div className="lb-missing">This clip isn't available right now. Try again in a minute.</div>
          )}
        </div>
        {many && (
          <button type="button" className="lb-nav lb-next" onClick={() => go(1)} aria-label="Next clip">
            <Arrow dir="r" />
          </button>
        )}
      </div>
      <div className="lb-info">
        <h2 id={titleId} className="lb-title">
          {numbered && <span className="lb-num">{i + 1}</span>}
          {clip.title}
        </h2>
        <div className="lb-meta">
          <TagPill tag={clip.tag} />
          {dur && <span className="lb-dur tnum">{dur}</span>}
          {many && <span className="lb-hint">← → to browse · Esc to close</span>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
