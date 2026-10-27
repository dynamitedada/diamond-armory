import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { create } from 'zustand';
import { sendFeedback } from '../data/api';
import { Modal } from './Modal';
import { useUi } from './theme';

const PROMPTED_KEY = 'diamond-armory:feedback-prompted';
const PROMPT_DELAY_MS = 20_000;

const FEATURES = ['3D player', 'Swing animation', 'Gear & bats', 'Look & style', 'Building my player', 'Speed on my phone'];
const RATING_LABELS = ['', 'Strikeout', 'Foul ball', 'Base hit', 'Double', 'Home run!'];

function flagSet(): boolean {
  try {
    return localStorage.getItem(PROMPTED_KEY) === '1';
  } catch {
    return true; // storage blocked: never nag
  }
}
function setFlag() {
  try {
    localStorage.setItem(PROMPTED_KEY, '1');
  } catch {
    // ignore
  }
}

interface FeedbackState {
  open: boolean;
  prompt: boolean;
  openForm: () => void;
  close: () => void;
  dismissPrompt: () => void;
}

export const useFeedback = create<FeedbackState>((set) => ({
  open: false,
  prompt: false,
  openForm: () => {
    setFlag();
    set({ open: true, prompt: false });
  },
  close: () => set({ open: false }),
  dismissPrompt: () => set({ prompt: false }),
}));

let promptTimer: number | undefined;

/** One gentle nudge ~20s after someone saves their first player (once per device). */
export function scheduleFeedbackPrompt() {
  if (flagSet() || promptTimer) return;
  const tryShow = () => {
    promptTimer = undefined;
    if (flagSet()) return;
    // wait while another dialog (e.g. the share sheet) is open
    if (useFeedback.getState().open || document.querySelector('.modal-layer')) {
      promptTimer = window.setTimeout(tryShow, 4000);
      return;
    }
    setFlag();
    useFeedback.setState({ prompt: true });
  };
  promptTimer = window.setTimeout(tryShow, PROMPT_DELAY_MS);
}

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    let next = value;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, (value || 0) + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, (value || 2) - 1);
    else return;
    e.preventDefault();
    onChange(next);
    refs.current[next - 1]?.focus();
  };
  return (
    <div className="field">
      <span className="field-label" id={labelId}>How's Diamond Armory so far?</span>
      <div className="rating" role="radiogroup" aria-labelledby={labelId} onKeyDown={onKey}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            ref={(el) => { refs.current[n - 1] = el; }}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 5: ${RATING_LABELS[n]}`}
            tabIndex={value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1}
            className={`rating-ball ${n <= value ? 'on' : ''}`}
            onClick={() => onChange(n)}
          >
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden>
              <circle cx="16" cy="16" r="13.5" className="rb-fill" />
              <path d="M8.2 6.6c2.8 2.6 4.2 5.8 4.2 9.4s-1.4 6.8-4.2 9.4M23.8 6.6c-2.8 2.6-4.2 5.8-4.2 9.4s1.4 6.8 4.2 9.4" className="rb-seam" />
            </svg>
          </button>
        ))}
        <span className="rating-label" aria-hidden>{RATING_LABELS[value] ?? ''}</span>
      </div>
    </div>
  );
}

function FeedbackForm({ profileSlug, onDone }: { profileSlug?: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState('');
  const [improve, setImprove] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const ids = { liked: useId(), improve: useId(), contact: useId(), tags: useId() };

  useEffect(() => { if (status === 'sent') doneRef.current?.focus(); }, [status]);

  const toggle = (f: string) => setFeatures((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating && !liked.trim() && !improve.trim() && !features.length) {
      setError('Tap a rating or jot a quick note first.');
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      await sendFeedback({
        profile_slug: profileSlug ?? null,
        ...(rating ? { rating } : {}),
        ...(liked.trim() ? { liked: liked.trim() } : {}),
        ...(improve.trim() ? { improve: improve.trim() } : {}),
        ...(features.length ? { features } : {}),
        ...(contact.trim() ? { contact: contact.trim() } : {}),
      });
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? `Couldn't send that: ${err.message}` : "Couldn't send that. Try again?");
    }
  };

  if (status === 'sent') {
    return (
      <div className="fb-thanks">
        <div className="fb-thanks-ball" aria-hidden>⚾</div>
        <p className="fb-thanks-title">Thanks, that's a home run.</p>
        <p className="muted">Every note gets read. Keep building!</p>
        <button ref={doneRef} type="button" className="btn btn-primary btn-lg btn-block" onClick={onDone}>Back to the game</button>
      </div>
    );
  }

  return (
    <form className="fb-form" onSubmit={submit} noValidate>
      <RatingInput value={rating} onChange={(v) => { setRating(v); setError(null); }} />
      <div className="field">
        <label className="field-label" htmlFor={ids.liked}>What did you like?</label>
        <textarea id={ids.liked} className="input textarea" rows={2} maxLength={2000} value={liked} onChange={(e) => setLiked(e.target.value)} placeholder="The swing, the gear, the vibe…" />
      </div>
      <div className="field">
        <label className="field-label" htmlFor={ids.improve}>What should we change or add?</label>
        <textarea id={ids.improve} className="input textarea" rows={2} maxLength={2000} value={improve} onChange={(e) => setImprove(e.target.value)} placeholder="More bats, a pitching animation, team logos…" />
      </div>
      <div className="field">
        <span className="field-label" id={ids.tags}>What's this about? <span className="field-opt">pick any</span></span>
        <div className="tagset" role="group" aria-labelledby={ids.tags}>
          {FEATURES.map((f) => (
            <button key={f} type="button" className={`tag ${features.includes(f) ? 'on' : ''}`} aria-pressed={features.includes(f)} onClick={() => toggle(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={ids.contact}>Name or contact <span className="field-opt">optional</span></label>
        <input id={ids.contact} className="input" maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="So we can follow up" autoComplete="name" />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={status === 'sending'}>
        {status === 'sending' ? <><span className="spinner" aria-hidden /> Sending…</> : 'Send feedback'}
      </button>
    </form>
  );
}

/** Floating "Give feedback" button, the feedback sheet, and the one-time prompt. */
export function Feedback({ profileSlug }: { profileSlug?: string }) {
  const open = useFeedback((s) => s.open);
  const prompt = useFeedback((s) => s.prompt);
  const { openForm, close, dismissPrompt } = useFeedback.getState();
  const lifted = useUi((s) => s.bottomBar);
  // remount the form each time the sheet opens so it starts fresh
  const [formKey, setFormKey] = useState(0);
  const start = () => { setFormKey((k) => k + 1); openForm(); };

  return (
    <>
      <div className={`fb-dock ${lifted ? 'lifted' : ''}`}>
        {prompt && !open && (
          <div className="fb-prompt" role="dialog" aria-label="Feedback request">
            <p><b>Got 30 seconds?</b> Tell us what you think of Diamond Armory.</p>
            <div className="fb-prompt-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={start}>Give feedback</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={dismissPrompt}>Not now</button>
            </div>
          </div>
        )}
        <button type="button" className="fb-fab" onClick={start} aria-haspopup="dialog" aria-label="Give feedback">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" /></svg>
          <span className="fb-fab-long">Give feedback</span>
          <span className="fb-fab-short">Feedback</span>
        </button>
      </div>
      <Modal
        open={open}
        onClose={close}
        className="fb-sheet"
        title="Give feedback"
        subtitle="Help shape Diamond Armory. Takes about 30 seconds."
      >
        <FeedbackForm key={formKey} profileSlug={profileSlug} onDone={close} />
      </Modal>
    </>
  );
}
