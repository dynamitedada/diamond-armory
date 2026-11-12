// #/film: a signed-in player's private film room. Upload MP4s, tag and title them, and pick the
// 4–8 that play as Highlights on the public profile.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CLIP_TAGS, MAX_CLIPS, MAX_FEATURED, type ClipTag, type ClipWithUrls } from '../data/film';
import { useAuth } from '../data/auth';
import { useMe } from '../state/account';
import {
  addFiles, discardRail, loadFilm, publishRail, publishedIds, railIds, railValid, toggleFeatured, useFilm,
} from '../state/film';
import { useActionBarSpacing, useTitle } from '../lib/hooks';
import { profilePath } from '../router';
import { openSignIn } from '../ui/SignIn';
import { toast } from '../ui/Toast';
import { ClipCard, ClipCardSkeleton } from '../ui/film/ClipCard';
import { ClipLightbox } from '../ui/film/ClipLightbox';
import { FeaturedRail, railStatus } from '../ui/film/FeaturedRail';
import { ChooseClipsButton, FilmIcon, UploadPanel } from '../ui/film/UploadPanel';
import { TAG_META, tagStyle } from '../ui/film/filmUi';

type Sort = 'new' | 'old' | 'long';
const SORTS: { v: Sort; label: string }[] = [
  { v: 'new', label: 'Newest' },
  { v: 'old', label: 'Oldest' },
  { v: 'long', label: 'Longest' },
];

export function FilmPage() {
  useTitle('My Film');
  const ready = useAuth((s) => s.ready);
  const account = useAuth((s) => s.account);
  if (!ready) return <main className="film"><FilmHeaderSkeleton /></main>;
  if (!account) return <FilmSignedOut />;
  return <FilmRoom key={account.id} />;
}

// ───────────────────────────── signed out

function FilmSignedOut() {
  return (
    <main className="film film-locked">
      <section className="lock-card">
        <div className="lock-art" aria-hidden>
          <span className="lock-reel"><FilmIcon size={64} /></span>
          <span className="lock-badge">
            <svg width="18" height="18" viewBox="0 0 12 12"><rect x="2" y="5.2" width="8" height="5.6" rx="1.3" fill="currentColor" /><path d="M3.9 5.4V3.9a2.1 2.1 0 014.2 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
          </span>
        </div>
        <p className="kicker">Diamond Armory · My Film</p>
        <h1 className="lock-title">Your private film room</h1>
        <p className="lock-lede">Keep your game clips in one place, then put your best plays on your player card.</p>
        <ul className="lock-points">
          <li><span aria-hidden>▲</span><div><b>Upload from your phone.</b> MP4 clips straight from your camera roll, up to {MAX_CLIPS}.</div></li>
          <li><span aria-hidden>★</span><div><b>Feature 4–8 highlights.</b> They play in your order on your public profile.</div></li>
          <li><span aria-hidden>●</span><div><b>Private until you publish.</b> Only you can see your film room.</div></li>
        </ul>
        <div className="lock-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => openSignIn({ mode: 'create', reason: 'Create an account to start your film room.' })}>
            Create account
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => openSignIn({ reason: 'Sign in to open your film room.' })}>
            Sign in
          </button>
        </div>
        <p className="lock-foot">Building a player doesn't need an account. <a href="#/new">Build one now</a>.</p>
      </section>
    </main>
  );
}

function FilmHeaderSkeleton() {
  return (
    <div className="film-head" aria-busy>
      <span className="sk" style={{ width: 220, height: 46 }} />
      <span className="sk sk-line" style={{ width: 300 }} />
    </div>
  );
}

// ───────────────────────────── signed in

function useFileDrop(enabled: boolean) {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => Boolean(e.dataTransfer && [...e.dataTransfer.types].includes('Files'));
    const enter = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; setDragging(true); };
    const over = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer!.dropEffect = 'copy'; };
    const leave = (e: DragEvent) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const files = [...(e.dataTransfer?.files ?? [])];
      if (files.length) addFiles(files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [enabled]);
  return dragging;
}

function FilmRoom() {
  const status = useFilm((s) => s.status);
  const error = useFilm((s) => s.error);
  const clips = useFilm((s) => s.clips);
  const draft = useFilm((s) => s.draft);
  const publishing = useFilm((s) => s.publishing);
  const me = useMe((s) => s.profile);
  const [lightbox, setLightbox] = useState<{ list: ClipWithUrls[]; index: number; label: string; numbered?: boolean } | null>(null);

  useEffect(() => { void loadFilm(); }, []);
  const dragging = useFileDrop(status !== 'error');

  const rail = useMemo(() => railIds({ clips, draft }), [clips, draft]);
  const byId = useMemo(() => new Map(clips.map((c) => [c.id, c])), [clips]);
  const railClips = useMemo(() => rail.map((id) => byId.get(id)).filter((c): c is ClipWithUrls => Boolean(c)), [rail, byId]);
  const liveCount = useMemo(() => publishedIds(clips).length, [clips]);
  const dirty = draft !== null;
  const valid = railValid(rail.length);
  useActionBarSpacing(dirty);

  // leaving with an unpublished rail: let the browser ask
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const loading = status === 'idle' || status === 'loading';
  const st = railStatus(rail.length, dirty, liveCount);

  return (
    <main className={`film ${dirty ? 'has-bar' : ''}`}>
      <header className="film-head">
        <div className="film-head-copy">
          <p className="kicker">Diamond Armory · Private</p>
          <h1 className="film-title">My Film</h1>
          <p className="film-lede">Only you can see this room. Feature 4–8 clips to show Highlights on your player card.</p>
        </div>
        <div className="film-head-side">
          <div className="film-stats">
            <span className="film-stat"><b className="tnum">{loading ? '–' : clips.length}</b><span>/{MAX_CLIPS} clips</span></span>
            <span className="film-stat gold"><b className="tnum">{loading ? '–' : liveCount}</b><span>/{MAX_FEATURED} featured</span></span>
          </div>
          {me === undefined ? (
            <span className="sk" style={{ width: 200, height: 40, borderRadius: 10 }} aria-hidden />
          ) : me ? (
            <a className="btn btn-ghost" href={`#${profilePath(me.slug)}`}>
              View my public profile
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M9 7h8v8" /></svg>
            </a>
          ) : (
            <a className="btn btn-ghost btn-warn" href="#/new">Build your player first</a>
          )}
        </div>
        {me === null && (
          <p className="film-note" role="note">
            Your film works now, but Highlights only show publicly once you have a player. <a href="#/new">Build your player</a>, it takes a minute.
          </p>
        )}
      </header>

      {status === 'error' ? (
        <div className="state-card" role="alert">
          <p className="state-title">The projector's jammed.</p>
          <p className="muted">{error ?? "We couldn't load your film."}</p>
          <button type="button" className="btn btn-primary" onClick={() => void loadFilm({ force: true })}>Try again</button>
        </div>
      ) : (
        <>
          <UploadPanel clipCount={clips.length} />
          {!loading && clips.length > 0 && (
            <FeaturedRail
              clips={railClips}
              dirty={dirty}
              liveCount={liveCount}
              onPlay={(i) => setLightbox({ list: railClips, index: i, label: 'On your profile', numbered: true })}
            />
          )}
          <Library
            loading={loading}
            clips={clips}
            rail={rail}
            onOpen={(list, i) => setLightbox({ list, index: i, label: 'My Film' })}
          />
        </>
      )}

      {dirty && (
        <div className="actionbar" role="region" aria-label="Unpublished highlight changes">
          <div className="actionbar-row">
            <span className={`actionbar-note rail-note tone-${st.tone}`}>
              <span className="unsaved-dot" aria-hidden /> Unpublished changes · {st.text}
            </span>
            <button type="button" className="btn btn-ghost btn-lg" onClick={discardRail} disabled={publishing}>Discard</button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => void publishRail()}
              disabled={!valid || publishing}
              aria-busy={publishing}
              title={!valid ? `Feature ${4 - rail.length} more to publish` : undefined}
            >
              {publishing ? <><span className="spinner" aria-hidden /> Publishing…</> : 'Publish to profile'}
            </button>
          </div>
        </div>
      )}

      {dragging && createPortal(
        <div className="drop-overlay" aria-hidden>
          <div className="drop-card">
            <FilmIcon size={64} />
            <p className="drop-title">Drop to add clips</p>
            <p className="drop-sub">MP4 · up to 50 MB each</p>
          </div>
        </div>,
        document.body,
      )}

      <ClipLightbox
        clips={lightbox?.list ?? []}
        index={lightbox?.index ?? null}
        onIndex={(i) => setLightbox((l) => (l ? { ...l, index: i } : l))}
        onClose={() => setLightbox(null)}
        label={lightbox?.label}
        numbered={lightbox?.numbered}
      />
    </main>
  );
}

// ───────────────────────────── library

function Library({ loading, clips, rail, onOpen }: {
  loading: boolean;
  clips: ClipWithUrls[];
  rail: string[];
  onOpen: (list: ClipWithUrls[], i: number) => void;
}) {
  const [tag, setTag] = useState<ClipTag | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('new');

  const counts = useMemo(() => {
    const m = new Map<ClipTag, number>();
    for (const c of clips) m.set(c.tag, (m.get(c.tag) ?? 0) + 1);
    return m;
  }, [clips]);
  // a filter whose last clip was re-tagged or deleted falls back to All
  const activeTag = tag !== 'all' && !counts.get(tag) ? 'all' : tag;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = clips.filter((c) => (activeTag === 'all' || c.tag === activeTag) && (!q || c.title.toLowerCase().includes(q)));
    const t = (c: ClipWithUrls) => c.created_at;
    if (sort === 'new') list.sort((a, b) => t(b).localeCompare(t(a)));
    else if (sort === 'old') list.sort((a, b) => t(a).localeCompare(t(b)));
    else list.sort((a, b) => (b.duration_s ?? -1) - (a.duration_s ?? -1) || t(b).localeCompare(t(a)));
    return list;
  }, [clips, activeTag, query, sort]);

  const railFull = rail.length >= MAX_FEATURED;
  const filtered = activeTag !== 'all' || query.trim() !== '';

  const onToggle = (c: ClipWithUrls) => {
    if (!toggleFeatured(c.id)) toast(`Your profile rail is full (${MAX_FEATURED}). Remove a clip first.`, 'info');
  };

  return (
    <section className="library" aria-labelledby="lib-h" aria-busy={loading}>
      <div className="section-head">
        <h2 id="lib-h" className="section-h">Library</h2>
        {!loading && clips.length > 0 && (
          <span className="section-meta" aria-live="polite">
            {filtered ? `${shown.length} of ${clips.length} clips` : `${clips.length} ${clips.length === 1 ? 'clip' : 'clips'}`}
          </span>
        )}
      </div>

      {!loading && clips.length > 0 && (
        <div className="lib-tools">
          <div className="lib-chips" role="group" aria-label="Filter by tag">
            <button type="button" className={`fchip ${activeTag === 'all' ? 'on' : ''}`} aria-pressed={activeTag === 'all'} onClick={() => setTag('all')}>
              All <span className="fchip-n tnum">{clips.length}</span>
            </button>
            {CLIP_TAGS.filter((t) => counts.get(t)).map((t) => (
              <button
                key={t}
                type="button"
                className={`fchip ${activeTag === t ? 'on' : ''}`}
                style={tagStyle(t)}
                aria-pressed={activeTag === t}
                onClick={() => setTag(activeTag === t ? 'all' : t)}
              >
                <span className="tag-dot" aria-hidden />
                {TAG_META[t].label} <span className="fchip-n tnum">{counts.get(t)}</span>
              </button>
            ))}
          </div>
          <div className="lib-search">
            <label className="visually-hidden" htmlFor="lib-q">Search clips by title</label>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input id="lib-q" className="input" type="search" placeholder="Search titles" value={query} onChange={(e) => setQuery(e.target.value)} enterKeyHint="search" autoComplete="off" />
          </div>
          <div className="lib-sort select-wrap">
            <label className="visually-hidden" htmlFor="lib-sort">Sort clips</label>
            <select id="lib-sort" className="input select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="clip-grid">{Array.from({ length: 6 }, (_, i) => <ClipCardSkeleton key={i} />)}</div>
      ) : clips.length === 0 ? (
        <div className="film-empty">
          <div className="film-empty-art" aria-hidden>
            <span className="fe-frame f1" /><span className="fe-frame f2" /><span className="fe-frame f3"><FilmIcon size={44} /></span>
          </div>
          <p className="state-title">The film room is empty.</p>
          <p className="muted">Add your first clips: a big swing, a diving catch, a strikeout. Drag MP4s onto this page or pick them from your phone.</p>
          <ChooseClipsButton label="Add your first clips" />
        </div>
      ) : shown.length === 0 ? (
        <div className="state-card">
          <p className="state-title">No clips match.</p>
          <p className="muted">Nothing {activeTag !== 'all' ? `tagged ${TAG_META[activeTag].label}` : ''}{query.trim() ? ` titled “${query.trim()}”` : ''}.</p>
          <button type="button" className="btn btn-ghost" onClick={() => { setTag('all'); setQuery(''); }}>Clear filters</button>
        </div>
      ) : (
        <div className="clip-grid">
          {shown.map((c, i) => (
            <ClipCard
              key={c.id}
              clip={c}
              index={i}
              railIndex={rail.indexOf(c.id)}
              railFull={railFull}
              onOpen={() => onOpen(shown, i)}
              onToggleFeature={() => onToggle(c)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
