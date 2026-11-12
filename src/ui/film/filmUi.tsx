import type { CSSProperties } from 'react';
import type { ClipTag } from '../../data/film';

export const TAG_META: Record<ClipTag, { label: string; color: string; icon: string }> = {
  hitting: { label: 'Hitting', color: '#ff4d6d', icon: '💥' },
  fielding: { label: 'Fielding', color: '#39ff88', icon: '🧤' },
  pitching: { label: 'Pitching', color: '#4ad7ff', icon: '🎯' },
  catching: { label: 'Catching', color: '#ffb020', icon: '🛡️' },
  baserunning: { label: 'Baserunning', color: '#9d7bff', icon: '💨' },
  other: { label: 'Other', color: '#c9cede', icon: '🎬' },
};

export const tagStyle = (tag: ClipTag) => ({ '--tc': TAG_META[tag]?.color ?? '#c9cede' }) as CSSProperties;

/** 0:07, 1:23, 12:04 */
export function fmtDuration(s: number | null | undefined): string | null {
  if (s == null || !Number.isFinite(s)) return null;
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function TagPill({ tag }: { tag: ClipTag }) {
  const m = TAG_META[tag] ?? TAG_META.other;
  return (
    <span className="tag-pill" style={tagStyle(tag)}>
      <span className="tag-dot" aria-hidden />
      {m.label}
    </span>
  );
}

/** Poster image, or a night-game placeholder when the browser couldn't grab a frame. */
export function ClipPoster({ url, title, tag }: { url: string | null; title: string; tag: ClipTag }) {
  if (url) return <img className="clip-poster" src={url} alt="" loading="lazy" decoding="async" draggable={false} />;
  return (
    <span className="clip-poster clip-poster-ph" style={tagStyle(tag)} aria-hidden>
      <span className="ph-diamond" />
      <span className="ph-title">{title}</span>
    </span>
  );
}

export const PlayGlyph = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
);
