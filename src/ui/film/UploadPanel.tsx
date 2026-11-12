import { useRef, type CSSProperties } from 'react';
import { MAX_CLIPS } from '../../data/film';
import { addFiles, clearUploadErrors, dismissUpload, useFilm, type UploadItem } from '../../state/film';
import { fmtSize } from './filmUi';

export const FilmIcon = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <rect x="5" y="9" width="38" height="30" rx="5" stroke="currentColor" strokeWidth="2.6" />
    <path d="M5 16h38M5 32h38" stroke="currentColor" strokeWidth="2.2" opacity=".55" />
    {[10, 18, 26, 34].map((x) => <rect key={x} x={x} y="11" width="4" height="3" rx="1" fill="currentColor" opacity=".7" />)}
    {[10, 18, 26, 34].map((x) => <rect key={`b${x}`} x={x} y="34" width="4" height="3" rx="1" fill="currentColor" opacity=".7" />)}
    <path d="M20.5 19.5v9l7.5-4.5z" fill="currentColor" />
  </svg>
);

/** Hidden file input + the button that opens it (on phones: the camera roll). */
export function ChooseClipsButton({ className = 'btn btn-primary btn-lg', label = 'Choose clips' }: { className?: string; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="video/mp4,.mp4"
        multiple
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden
        data-testid="clip-input"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) addFiles(files);
        }}
      />
      <button type="button" className={className} onClick={() => ref.current?.click()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
        {label}
      </button>
    </>
  );
}

function QueueRow({ u }: { u: UploadItem }) {
  const pct = Math.round(u.progress * 100);
  const preparing = u.status === 'uploading' && u.progress === 0;
  const meta =
    u.status === 'error' ? u.error
      : u.status === 'done' ? 'Added to your film'
        : u.status === 'queued' ? 'Waiting…'
          : preparing ? 'Reading clip…'
            : `Uploading · ${pct}%`;
  return (
    <li className={`uq-item is-${u.status}`}>
      <span className="uq-icon" aria-hidden>
        {u.status === 'error' ? '!' : u.status === 'done' ? '✓' : u.status === 'queued' ? '·' : <span className="spinner" />}
      </span>
      <div className="uq-main">
        <div className="uq-top">
          <span className="uq-name">{u.name}</span>
          <span className="uq-size tnum">{fmtSize(u.size)}</span>
        </div>
        <span className="uq-meta" role={u.status === 'error' ? 'alert' : undefined}>{meta}</span>
        {u.status !== 'error' && (
          <span
            className={`uq-bar ${preparing || u.status === 'queued' ? 'indeterminate' : ''}`}
            role="progressbar"
            aria-label={`Upload ${u.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={u.status === 'queued' || preparing ? undefined : pct}
          >
            <span style={{ '--p': `${u.status === 'done' ? 100 : pct}%` } as CSSProperties} />
          </span>
        )}
      </div>
      {(u.status === 'error' || u.status === 'done') && (
        <button type="button" className="uq-dismiss" onClick={() => dismissUpload(u.id)} aria-label={`Dismiss ${u.name}`}>✕</button>
      )}
    </li>
  );
}

/** `hideZone`: the library's empty state already offers the picker, so only the queue shows. */
export function UploadPanel({ clipCount, hideZone = false }: { clipCount: number; hideZone?: boolean }) {
  const uploads = useFilm((s) => s.uploads);
  const active = uploads.filter((u) => u.status === 'queued' || u.status === 'uploading').length;
  const errors = uploads.filter((u) => u.status === 'error').length;
  const left = Math.max(0, MAX_CLIPS - clipCount);

  if (hideZone && uploads.length === 0) return null;
  return (
    <section className="upload" aria-labelledby={hideZone ? undefined : 'upload-h'} aria-label={hideZone ? 'Uploads' : undefined}>
      {!hideZone && <div className="upload-zone">
        <span className="uz-art" aria-hidden><FilmIcon /></span>
        <div className="uz-copy">
          <h2 id="upload-h" className="uz-title">
            <span className="uz-desk">Drop MP4 clips anywhere on this page</span>
            <span className="uz-touch">Add clips from your camera roll</span>
          </h2>
          <p className="uz-sub">MP4 only · up to 50 MB each · {left} of {MAX_CLIPS} spots left</p>
        </div>
        <ChooseClipsButton />
      </div>}
      {uploads.length > 0 && (
        <div className="uq-wrap">
          <div className="uq-head">
            <span className="uq-headline" aria-live="polite">
              {active > 0 ? `Uploading ${active} ${active === 1 ? 'clip' : 'clips'}…` : errors ? `${errors} ${errors === 1 ? 'file' : 'files'} couldn't be added` : 'All done'}
            </span>
            {errors > 0 && <button type="button" className="linkish" onClick={clearUploadErrors}>Clear errors</button>}
          </div>
          <ul className="uq">
            {uploads.map((u) => <QueueRow key={u.id} u={u} />)}
          </ul>
        </div>
      )}
    </section>
  );
}
