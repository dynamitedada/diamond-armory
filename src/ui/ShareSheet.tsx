import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { profileUrl } from '../router';

interface Props {
  open: boolean;
  onClose: () => void;
  slug: string;
  /** Display name for the share text. */
  name: string;
  /** True right after the player was created on this device. */
  fresh?: boolean;
}

async function copyText(text: string, fallbackInput: HTMLInputElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the selection fallback
  }
  if (!fallbackInput) return false;
  fallbackInput.focus();
  fallbackInput.select();
  fallbackInput.setSelectionRange(0, text.length);
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

export function ShareSheet({ open, onClose, slug, name, fresh }: Props) {
  const url = profileUrl(slug);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState<'yes' | 'select' | null>(null);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const text = fresh ? `Check out my baseball player, ${name}!` : `Check out ${name} on Diamond Armory`;

  const onCopy = async () => {
    const ok = await copyText(url, inputRef.current);
    setCopied(ok ? 'yes' : 'select');
    if (!ok) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.setTimeout(() => setCopied(null), 2400);
  };

  const onShare = async () => {
    try {
      await navigator.share({ title: `${name} · Diamond Armory`, text, url });
    } catch {
      // user cancelled or share failed; the copy button is still there
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      initialFocus={copyRef}
      fallbackFocus={() => document.querySelector<HTMLElement>('[data-share-trigger]')}
      className="share-sheet"
      title={fresh ? 'Your player is live!' : 'Share this player'}
      subtitle={fresh ? 'Text this link to your team so they can watch your player swing.' : 'Anyone with the link can see this player.'}
    >
      {fresh && (
        <div className="share-hero" aria-hidden>
          <span className="share-ball">⚾</span>
        </div>
      )}
      <label className="field-label" htmlFor="share-url">Player link</label>
      <div className="share-row">
        <input
          id="share-url"
          ref={inputRef}
          className="input share-input"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button ref={copyRef} type="button" className={`btn btn-primary share-copy ${copied === 'yes' ? 'ok' : ''}`} onClick={onCopy}>
          {copied === 'yes' ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="field-help" aria-live="polite">
        {copied === 'select' ? 'Press and hold the link to copy it.' : copied === 'yes' ? 'Link copied. Paste it in a text or group chat.' : ' '}
      </p>
      <div className="share-actions">
        {canShare && (
          <button type="button" className="btn btn-ghost btn-lg" onClick={onShare}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg>
            Share…
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>
          {fresh ? 'See my player' : 'Done'}
        </button>
      </div>
    </Modal>
  );
}
