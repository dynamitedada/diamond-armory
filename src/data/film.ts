// "My Film": a signed-in player's private clip library, plus the 4–8 clips featured on their public profile.
// Remote: files live in the private `film` storage bucket under `<account id>/`, metadata in `clips`.
// Local mode: metadata in localStorage, files in IndexedDB.

import { accessToken, currentAccountId } from './auth';
import { DATA_MODE, SUPABASE_KEY, SUPABASE_URL, fail, readJson, supabase, writeJson } from './supabase';

export const CLIP_TAGS = ['hitting', 'fielding', 'pitching', 'catching', 'baserunning', 'other'] as const;
export type ClipTag = (typeof CLIP_TAGS)[number];

export const MAX_FEATURED = 8;
export const MIN_FEATURED = 4;
export const MAX_CLIPS = 40;
export const MAX_CLIP_BYTES = 50 * 1024 * 1024;

export interface Clip {
  id: string;
  owner_id: string;
  video_path: string;
  poster_path: string | null;
  title: string;
  tag: ClipTag;
  duration_s: number | null;
  size_bytes: number | null;
  featured: boolean;
  feature_order: number | null;
  created_at: string;
}

/** A clip with playable URLs (signed and short-lived in remote mode). */
export interface ClipWithUrls extends Clip {
  videoUrl: string | null;
  posterUrl: string | null;
}

const BUCKET = 'film';
const SIGNED_URL_SECONDS = 60 * 60 * 4;
const LOCAL_CLIPS_KEY = 'diamond-armory:local-clips';

// ---------------------------------------------------------------------------------------------------------
// Local-mode file store (IndexedDB)

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('diamond-armory-film', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbOp<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction('files', mode).objectStore('files'));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

const objectUrls = new Map<string, string>();
async function localUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const cached = objectUrls.get(path);
  if (cached) return cached;
  const blob = await idbOp<Blob | undefined>('readonly', (s) => s.get(path));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrls.set(path, url);
  return url;
}

const localClips = () => readJson<Clip[]>(LOCAL_CLIPS_KEY, []);

// ---------------------------------------------------------------------------------------------------------
// URLs

async function withUrls(clips: Clip[]): Promise<ClipWithUrls[]> {
  if (DATA_MODE === 'local') {
    return Promise.all(clips.map(async (c) => ({ ...c, videoUrl: await localUrl(c.video_path), posterUrl: await localUrl(c.poster_path) })));
  }
  const paths = clips.flatMap((c) => [c.video_path, c.poster_path].filter((p): p is string => Boolean(p)));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await supabase!.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (error) fail(error);
    for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  }
  return clips.map((c) => ({
    ...c,
    videoUrl: urls.get(c.video_path) ?? null,
    posterUrl: c.poster_path ? urls.get(c.poster_path) ?? null : null,
  }));
}

const byFeatureOrder = (a: Clip, b: Clip) => (a.feature_order ?? 99) - (b.feature_order ?? 99) || a.created_at.localeCompare(b.created_at);

// ---------------------------------------------------------------------------------------------------------
// Reads

/** Every clip in the signed-in account's film room, newest first. */
export async function listMyClips(): Promise<ClipWithUrls[]> {
  const me = currentAccountId();
  if (!me) throw new Error('Sign in to see your film.');
  if (DATA_MODE === 'local') {
    return withUrls(localClips().filter((c) => c.owner_id === me).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  const { data, error } = await supabase!.from('clips').select('*').eq('owner_id', me).order('created_at', { ascending: false });
  if (error) fail(error);
  return withUrls(data as Clip[]);
}

/** The featured clips shown on a player's public profile, in the order the player chose. */
export async function listFeaturedClips(ownerId: string): Promise<ClipWithUrls[]> {
  if (DATA_MODE === 'local') {
    return withUrls(localClips().filter((c) => c.owner_id === ownerId && c.featured).sort(byFeatureOrder));
  }
  const { data, error } = await supabase!
    .from('clips')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('featured', true)
    .order('feature_order', { ascending: true, nullsFirst: false });
  if (error) fail(error);
  return withUrls(data as Clip[]);
}

// ---------------------------------------------------------------------------------------------------------
// Upload

export interface VideoInfo {
  duration: number | null;
  poster: Blob | null;
}

/**
 * Reads the duration and grabs a poster frame (about 1s in) in the browser.
 * Returns nulls for codecs this browser can't decode (e.g. some HEVC iPhone clips); the upload still works.
 */
export function inspectVideo(file: Blob): Promise<VideoInfo> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    let duration: number | null = null;
    const done = (poster: Blob | null) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
      resolve({ duration, poster });
    };
    const timer = setTimeout(() => done(null), 12000);
    video.onerror = () => done(null);
    video.onloadedmetadata = () => {
      duration = Number.isFinite(video.duration) ? video.duration : null;
      video.currentTime = Math.min(1, (duration ?? 2) / 3);
    };
    video.onseeked = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return done(null);
      const scale = Math.min(1, 640 / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return done(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => done(b), 'image/jpeg', 0.82);
    };
    video.src = url;
  });
}

/** Explains why a file can't be added, or null when it's fine. */
export function validateClipFile(file: File): string | null {
  const isMp4 = file.type === 'video/mp4' || /\.mp4$/i.test(file.name);
  if (!isMp4) return `${file.name} isn't an MP4 video.`;
  if (file.size > MAX_CLIP_BYTES) return `${file.name} is over 50 MB. Trim it or export at a lower quality.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

function putWithProgress(path: string, body: Blob, contentType: string, token: string, onProgress?: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', SUPABASE_KEY);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Upload failed (${xhr.status}).`;
      try {
        message = JSON.parse(xhr.responseText).message || message;
      } catch {
        // keep the generic message
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    xhr.send(body);
  });
}

const titleFromFile = (name: string) =>
  name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

/** Uploads one MP4 and adds it to the film room. `onProgress` gets 0..1 for the video upload. */
export async function uploadClip(
  file: File,
  opts: { title?: string; tag?: ClipTag; onProgress?: (fraction: number) => void } = {},
): Promise<ClipWithUrls> {
  const me = currentAccountId();
  if (!me) throw new Error('Sign in to add film.');
  const problem = validateClipFile(file);
  if (problem) throw new Error(problem);

  const info = await inspectVideo(file);
  const id = crypto.randomUUID();
  const videoPath = `${me}/${id}.mp4`;
  const posterPath = info.poster ? `${me}/${id}.jpg` : null;
  const row = {
    video_path: videoPath,
    poster_path: posterPath,
    title: opts.title ?? titleFromFile(file.name),
    tag: opts.tag ?? 'other',
    duration_s: info.duration,
    size_bytes: file.size,
  };

  if (DATA_MODE === 'local') {
    if (localClips().filter((c) => c.owner_id === me).length >= MAX_CLIPS) {
      throw new Error(`Your film room is full (${MAX_CLIPS} clips). Delete a clip to add another.`);
    }
    await idbOp('readwrite', (s) => s.put(file, videoPath));
    if (info.poster && posterPath) await idbOp('readwrite', (s) => s.put(info.poster, posterPath));
    opts.onProgress?.(1);
    const clip: Clip = { ...row, id, owner_id: me, featured: false, feature_order: null, created_at: new Date().toISOString() };
    writeJson(LOCAL_CLIPS_KEY, [clip, ...localClips()]);
    return (await withUrls([clip]))[0];
  }

  const token = await accessToken();
  if (!token) throw new Error('Your session expired. Sign in again.');
  await putWithProgress(videoPath, file, 'video/mp4', token, opts.onProgress);
  if (info.poster && posterPath) {
    await putWithProgress(posterPath, info.poster, 'image/jpeg', token).catch(() => undefined);
  }
  const { data, error } = await supabase!.from('clips').insert(row).select('*').single();
  if (error) {
    // Don't leave orphaned files behind when the row is refused (e.g. the 40-clip limit).
    await supabase!.storage.from(BUCKET).remove([videoPath, ...(posterPath ? [posterPath] : [])]);
    fail(error);
  }
  return (await withUrls([data as Clip]))[0];
}

// ---------------------------------------------------------------------------------------------------------
// Edits

export async function updateClip(id: string, patch: Partial<Pick<Clip, 'title' | 'tag'>>): Promise<void> {
  if (DATA_MODE === 'local') {
    writeJson(LOCAL_CLIPS_KEY, localClips().map((c) => (c.id === id ? { ...c, ...patch } : c)));
    return;
  }
  const { error } = await supabase!.from('clips').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function deleteClip(clip: Pick<Clip, 'id' | 'video_path' | 'poster_path'>): Promise<void> {
  const paths = [clip.video_path, ...(clip.poster_path ? [clip.poster_path] : [])];
  if (DATA_MODE === 'local') {
    for (const p of paths) await idbOp('readwrite', (s) => s.delete(p));
    writeJson(LOCAL_CLIPS_KEY, localClips().filter((c) => c.id !== clip.id));
    return;
  }
  const { error } = await supabase!.from('clips').delete().eq('id', clip.id);
  if (error) fail(error);
  await supabase!.storage.from(BUCKET).remove(paths);
}

/**
 * Sets exactly which clips are featured on the public profile, in display order (max 8).
 * Clips not listed are un-featured.
 */
export async function setFeaturedClips(orderedIds: string[]): Promise<void> {
  if (orderedIds.length > MAX_FEATURED) throw new Error(`You can feature up to ${MAX_FEATURED} clips.`);
  const me = currentAccountId();
  if (!me) throw new Error('Sign in to change your film.');
  const order = new Map(orderedIds.map((id, i) => [id, i]));

  if (DATA_MODE === 'local') {
    writeJson(
      LOCAL_CLIPS_KEY,
      localClips().map((c) =>
        c.owner_id === me ? { ...c, featured: order.has(c.id), feature_order: order.get(c.id) ?? null } : c,
      ),
    );
    return;
  }
  // Un-feature first so the 8-clip limit never trips mid-update.
  const { error: clearError } = await supabase!
    .from('clips')
    .update({ featured: false, feature_order: null })
    .eq('owner_id', me)
    .eq('featured', true)
    .not('id', 'in', `(${orderedIds.length ? orderedIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
  if (clearError) fail(clearError);
  for (const [id, i] of order) {
    const { error } = await supabase!.from('clips').update({ featured: true, feature_order: i }).eq('id', id);
    if (error) fail(error);
  }
}
