import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { CLIP_TAGS, type ClipTag, type ClipWithUrls } from '../../data/film';
import { removeClip, saveClip } from '../../state/film';
import { toast } from '../Toast';
import { ClipPoster, PlayGlyph, TAG_META, fmtDuration, tagStyle } from './filmUi';

const TITLE_MAX = 80;

const TrashIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
  </svg>
);
const Star = ({ filled }: { filled: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 3.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.5l6.1-.7z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

interface Props {
  clip: ClipWithUrls;
  /** Position on the (unsaved) profile rail, or -1. */
  railIndex: number;
  railFull: boolean;
  onOpen: () => void;
  onToggleFeature: () => void;
  index: number;
}

export function ClipCard({ clip, railIndex, railFull, onOpen, onToggleFeature, index }: Props) {
  const id = useId();
  const [title, setTitle] = useState(clip.title);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const delBtnRef = useRef<HTMLButtonElement>(null);
  const skipBlur = useRef(false);
  const featured = railIndex >= 0;
  const dur = fmtDuration(clip.duration_s);

  // follow outside changes (e.g. a failed save rolled back)
  useEffect(() => setTitle(clip.title), [clip.title]);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(t);
  }, [saved]);
  useEffect(() => { if (confirming) keepRef.current?.focus(); }, [confirming]);

  const commitTitle = async () => {
    const next = title.trim().replace(/\s+/g, ' ').slice(0, TITLE_MAX);
    if (!next) {
      setTitle(clip.title);
      toast('A clip needs a title', 'info');
      return;
    }
    setTitle(next);
    if (next === clip.title) return;
    setSaving(true);
    try {
      await saveClip(clip.id, { title: next });
      setSaved(true);
    } catch {
      setTitle(clip.title);
    } finally {
      setSaving(false);
    }
  };

  const changeTag = async (tag: ClipTag) => {
    try {
      await saveClip(clip.id, { tag });
      setSaved(true);
    } catch {
      // rolled back + toast in the store
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await removeClip(clip);
      toast('Clip deleted');
    } catch (err) {
      setDeleting(false);
      setConfirming(false);
      toast(err instanceof Error ? `Couldn't delete: ${err.message}` : "Couldn't delete that clip.", 'error');
    }
  };

  const cancelDelete = () => {
    setConfirming(false);
    requestAnimationFrame(() => delBtnRef.current?.focus());
  };

  return (
    <article
      className={`clip-card ${featured ? 'is-featured' : ''} ${deleting ? 'is-deleting' : ''}`}
      style={{ ...tagStyle(clip.tag), '--i': index } as CSSProperties}
      aria-labelledby={`${id}-t`}
    >
      <button type="button" className="clip-thumb" onClick={onOpen} aria-label={`Play ${clip.title}`}>
        <ClipPoster url={clip.posterUrl} title={clip.title} tag={clip.tag} />
        <span className="clip-shade" aria-hidden />
        <span className="clip-play" aria-hidden><PlayGlyph /></span>
        {dur && <span className="clip-dur tnum" aria-hidden>{dur}</span>}
        {featured && <span className="clip-feat" aria-hidden><Star filled /> {railIndex + 1}</span>}
      </button>

      <div className="clip-body">
        <label className="visually-hidden" htmlFor={`${id}-t`}>Clip title</label>
        <div className="clip-title-wrap">
          <input
            id={`${id}-t`}
            className="clip-title-input"
            value={title}
            maxLength={TITLE_MAX}
            enterKeyHint="done"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
              else if (e.key === 'Escape') { e.preventDefault(); skipBlur.current = true; setTitle(clip.title); e.currentTarget.blur(); }
            }}
            onBlur={() => {
              if (skipBlur.current) { skipBlur.current = false; return; }
              void commitTitle();
            }}
          />
        </div>

        <div className="clip-row">
          <div className="tag-select">
            <span className="tag-dot" aria-hidden />
            <label className="visually-hidden" htmlFor={`${id}-tag`}>Tag for {clip.title}</label>
            <select id={`${id}-tag`} value={clip.tag} onChange={(e) => void changeTag(e.target.value as ClipTag)}>
              {CLIP_TAGS.map((t) => <option key={t} value={t}>{TAG_META[t].label}</option>)}
            </select>
          </div>
          <span className={`clip-saved ${saving ? 'busy' : saved ? 'ok' : ''}`} aria-live="polite">
            {saving ? 'Saving…' : saved ? 'Saved' : ''}
          </span>
        </div>

        <div className="clip-actions">
          <button
            type="button"
            className={`feat-toggle ${featured ? 'on' : ''}`}
            aria-pressed={featured}
            onClick={onToggleFeature}
            disabled={!featured && railFull}
            title={!featured && railFull ? 'Your profile rail is full (8). Remove a clip first.' : undefined}
          >
            <Star filled={featured} />
            {featured ? <>On profile <span className="feat-n tnum">#{railIndex + 1}</span></> : 'Feature'}
          </button>
          <button ref={delBtnRef} type="button" className="icon-btn clip-del" aria-label={`Delete ${clip.title}`} onClick={() => setConfirming(true)}>
            <TrashIcon />
          </button>
        </div>
      </div>

      {confirming && (
        <div
          className="clip-confirm"
          role="alertdialog"
          aria-labelledby={`${id}-cq`}
          aria-describedby={`${id}-cd`}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); cancelDelete(); } }}
        >
          <p id={`${id}-cq`} className="clip-confirm-q">Delete this clip?</p>
          <p id={`${id}-cd`} className="clip-confirm-d">
            “{clip.title}” {clip.featured ? 'comes off your profile and ' : ''}is gone for good.
          </p>
          <div className="clip-confirm-actions">
            <button ref={keepRef} type="button" className="btn btn-ghost btn-sm" onClick={cancelDelete} disabled={deleting}>Keep</button>
            <button type="button" className="btn btn-danger btn-sm" onClick={doDelete} disabled={deleting} aria-busy={deleting}>
              {deleting ? <><span className="spinner" aria-hidden /> Deleting…</> : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function ClipCardSkeleton() {
  return (
    <div className="clip-card clip-sk" aria-hidden>
      <span className="clip-thumb sk" />
      <div className="clip-body">
        <span className="sk sk-line" style={{ width: '80%', marginTop: 4 }} />
        <span className="sk sk-line short" />
        <span className="sk" style={{ height: 36, marginTop: 14, borderRadius: 10 }} />
      </div>
    </div>
  );
}
