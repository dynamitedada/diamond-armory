// My Film state: the signed-in player's clip library, the unsaved "On your profile" rail and the
// upload queue. Lives outside the page so uploads keep going while the player browses elsewhere.
import { create } from 'zustand';
import {
  MAX_CLIPS, MAX_FEATURED, MIN_FEATURED, deleteClip, listMyClips, setFeaturedClips, updateClip, uploadClip, validateClipFile,
  type ClipTag, type ClipWithUrls,
} from '../data/film';
import { useAuth } from '../data/auth';
import { toast } from '../ui/Toast';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  file: File | null;
  /** 0..1 of the video upload; stays 0 while the browser reads the clip. */
  progress: number;
  status: UploadStatus;
  error?: string;
}

interface FilmState {
  /** Account the data below belongs to. */
  owner: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  clips: ClipWithUrls[];
  /** Unsaved featured order; null while the rail matches what's published. */
  draft: string[] | null;
  publishing: boolean;
  uploads: UploadItem[];
}

const initial = (): Omit<FilmState, 'owner'> => ({ status: 'idle', error: undefined, clips: [], draft: null, publishing: false, uploads: [] });

export const useFilm = create<FilmState>(() => ({ owner: null, ...initial() }));

const MAX_PARALLEL = 2;
const me = () => useAuth.getState().account?.id ?? null;

// ───────────────────────────── selectors

const byFeatureOrder = (a: ClipWithUrls, b: ClipWithUrls) =>
  (a.feature_order ?? 99) - (b.feature_order ?? 99) || a.created_at.localeCompare(b.created_at);

/** What the public profile shows right now, in order. */
export const publishedIds = (clips: ClipWithUrls[]) => clips.filter((c) => c.featured).sort(byFeatureOrder).map((c) => c.id);

/** The rail as the player is arranging it (unsaved changes included). */
export const railIds = (s: Pick<FilmState, 'clips' | 'draft'>) => s.draft ?? publishedIds(s.clips);

/** Saving is allowed for an empty rail or 4–8 clips. */
export const railValid = (n: number) => n === 0 || (n >= MIN_FEATURED && n <= MAX_FEATURED);

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

function setRail(next: string[]) {
  const { clips } = useFilm.getState();
  useFilm.setState({ draft: sameOrder(next, publishedIds(clips)) ? null : next });
}

// ───────────────────────────── loading

let loadSeq = 0;

export async function loadFilm(opts: { force?: boolean } = {}) {
  const owner = me();
  if (!owner) return;
  const s = useFilm.getState();
  if (!opts.force && s.owner === owner && (s.status === 'ready' || s.status === 'loading')) return;
  const seq = ++loadSeq;
  useFilm.setState({ owner, status: s.owner === owner && s.status === 'ready' ? 'ready' : 'loading', error: undefined });
  try {
    const clips = await listMyClips();
    if (seq !== loadSeq || me() !== owner) return;
    // keep a draft only while every clip in it still exists
    const ids = new Set(clips.map((c) => c.id));
    const draft = useFilm.getState().draft;
    useFilm.setState({ clips, status: 'ready', draft: draft && draft.every((id) => ids.has(id)) ? draft : null });
  } catch (err) {
    if (seq !== loadSeq) return;
    useFilm.setState({ status: 'error', error: err instanceof Error ? err.message : 'Could not load your film.' });
  }
}

// a different account (or signing out) starts from a clean slate
useAuth.subscribe((st) => {
  const id = st.account?.id ?? null;
  if (useFilm.getState().owner !== id) {
    loadSeq++;
    useFilm.setState({ owner: id, ...initial() });
  }
});

// ───────────────────────────── uploads

const patchUpload = (id: string, patch: Partial<UploadItem>) =>
  useFilm.setState((s) => ({ uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));

const pending = (s: FilmState) => s.uploads.filter((u) => u.status === 'queued' || u.status === 'uploading').length;

/** Queue files from the picker or a drop. Bad files show an error row; the rest upload two at a time. */
export function addFiles(files: File[]) {
  const s = useFilm.getState();
  let room = MAX_CLIPS - s.clips.length - pending(s);
  const rows: UploadItem[] = files.map((file) => {
    const base = { id: crypto.randomUUID(), name: file.name, size: file.size, progress: 0 };
    const problem = validateClipFile(file);
    if (problem) return { ...base, file: null, status: 'error', error: problem };
    if (room <= 0) {
      return { ...base, file: null, status: 'error', error: `${file.name}: your film room is full (${MAX_CLIPS} clips). Delete a clip to add another.` };
    }
    room--;
    return { ...base, file, status: 'queued' };
  });
  useFilm.setState({ uploads: [...s.uploads, ...rows] });
  pump();
}

function pump() {
  const s = useFilm.getState();
  const free = MAX_PARALLEL - s.uploads.filter((u) => u.status === 'uploading').length;
  s.uploads.filter((u) => u.status === 'queued').slice(0, Math.max(0, free)).forEach((u) => void run(u));
}

async function run(u: UploadItem) {
  const owner = me();
  patchUpload(u.id, { status: 'uploading', progress: 0 });
  try {
    const clip = await uploadClip(u.file!, { onProgress: (p) => patchUpload(u.id, { progress: p }) });
    if (me() !== owner || useFilm.getState().owner !== owner) return;
    useFilm.setState((s) => ({ clips: [clip, ...s.clips.filter((c) => c.id !== clip.id)] }));
    patchUpload(u.id, { status: 'done', progress: 1, file: null });
    window.setTimeout(() => dismissUpload(u.id), 2200);
  } catch (err) {
    patchUpload(u.id, { status: 'error', file: null, error: err instanceof Error ? err.message : 'Upload failed. Try again.' });
  } finally {
    pump();
  }
}

export const dismissUpload = (id: string) => useFilm.setState((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) }));
export const clearUploadErrors = () => useFilm.setState((s) => ({ uploads: s.uploads.filter((u) => u.status !== 'error') }));

// ───────────────────────────── edits

export async function saveClip(id: string, patch: { title?: string; tag?: ClipTag }) {
  const before = useFilm.getState().clips.find((c) => c.id === id);
  if (!before) return;
  useFilm.setState((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  try {
    await updateClip(id, patch);
  } catch (err) {
    useFilm.setState((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, title: before.title, tag: before.tag } : c)) }));
    toast(err instanceof Error ? `Couldn't save: ${err.message}` : "Couldn't save that change.", 'error');
    throw err;
  }
}

export async function removeClip(clip: ClipWithUrls) {
  await deleteClip(clip);
  useFilm.setState((s) => {
    const draft = s.draft?.filter((id) => id !== clip.id) ?? null;
    const clips = s.clips.filter((c) => c.id !== clip.id);
    return { clips, draft: draft && !sameOrder(draft, publishedIds(clips)) ? draft : null };
  });
}

// ───────────────────────────── featured rail

/** Library "Feature" toggle: adds to the end of the rail, or takes it off. Returns false when the rail is full. */
export function toggleFeatured(id: string): boolean {
  const rail = railIds(useFilm.getState());
  if (rail.includes(id)) {
    setRail(rail.filter((x) => x !== id));
    return true;
  }
  if (rail.length >= MAX_FEATURED) return false;
  setRail([...rail, id]);
  return true;
}

export function moveFeatured(from: number, to: number) {
  const rail = [...railIds(useFilm.getState())];
  if (from < 0 || from >= rail.length) return;
  const target = Math.max(0, Math.min(rail.length - 1, to));
  if (target === from) return;
  const [id] = rail.splice(from, 1);
  rail.splice(target, 0, id);
  setRail(rail);
}

export const discardRail = () => useFilm.setState({ draft: null });

export async function publishRail(): Promise<boolean> {
  const s = useFilm.getState();
  const rail = railIds(s);
  if (!s.draft || !railValid(rail.length) || s.publishing) return false;
  useFilm.setState({ publishing: true });
  try {
    await setFeaturedClips(rail);
    const order = new Map(rail.map((id, i) => [id, i]));
    useFilm.setState((st) => ({
      clips: st.clips.map((c) => ({ ...c, featured: order.has(c.id), feature_order: order.get(c.id) ?? null })),
      draft: null,
    }));
    toast(rail.length ? `Highlights published · ${rail.length} clips on your profile` : 'Highlights removed from your profile');
    return true;
  } catch (err) {
    toast(err instanceof Error ? `Couldn't publish: ${err.message}` : "Couldn't publish. Try again.", 'error');
    return false;
  } finally {
    useFilm.setState({ publishing: false });
  }
}
