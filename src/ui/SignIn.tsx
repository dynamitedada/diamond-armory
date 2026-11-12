// Email + password accounts: one form, used both on #/signin and as a modal for gated actions.
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { create } from 'zustand';
import { signIn, signUp } from '../data/auth';
import { claimDeviceProfile, getProfile, toPlayerProfile } from '../data/api';
import { refreshMe } from '../state/account';
import { navigate } from '../router';
import { Modal } from './Modal';
import { toast } from './Toast';

export type AuthMode = 'signin' | 'create';
const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ───────────────────────────── modal host state

interface SignInPrompt {
  open: boolean;
  mode: AuthMode;
  /** Shown above the form: why we're asking. */
  reason?: string;
  /** In-app path to go to after signing in (stays on the page when unset). */
  next?: string;
}

export const useSignInPrompt = create<SignInPrompt>(() => ({ open: false, mode: 'signin' }));

/** Ask for an account before a gated action. */
export function openSignIn(opts: { mode?: AuthMode; reason?: string; next?: string } = {}) {
  useSignInPrompt.setState({ open: true, mode: opts.mode ?? 'signin', reason: opts.reason, next: opts.next });
}

/** After any successful sign-in: link this device's player and say so. */
async function afterSignIn() {
  try {
    const slug = await claimDeviceProfile();
    if (slug) {
      const rec = await getProfile(slug).catch(() => null);
      toast(rec ? `Linked ${toPlayerProfile(rec).name} to your account` : 'Linked your player to your account');
    } else {
      toast('Signed in');
    }
  } catch {
    toast('Signed in');
  }
  await refreshMe();
}

// ───────────────────────────── form

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

interface FormProps {
  mode: AuthMode;
  onMode: (m: AuthMode) => void;
  /** Called once signed in (after the device player has been claimed). */
  onDone: () => void;
  /** Focus the email field on mount. */
  autoFocus?: boolean;
}

export function SignInForm({ mode, onMode, onDone, autoFocus }: FormProps) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const creating = mode === 'create';

  useEffect(() => {
    if (autoFocus) emailRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const emailError = !email.trim()
    ? 'Enter your email.'
    : !EMAIL_RE.test(email.trim())
      ? "That doesn't look like an email address."
      : null;
  const passwordError = !password
    ? creating ? `Pick a password (${MIN_PASSWORD}+ characters).` : 'Enter your password.'
    : creating && password.length < MIN_PASSWORD
      ? `Use at least ${MIN_PASSWORD} characters (${MIN_PASSWORD - password.length} more).`
      : null;
  const showEmailErr = (touched.email || submitted) && emailError;
  const showPassErr = (touched.password || submitted) && passwordError;

  const switchMode = (m: AuthMode) => {
    if (busy) return;
    onMode(m);
    setServerError(null);
    setSubmitted(false);
    setTouched({});
    setConfirmSent(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    setServerError(null);
    if (emailError) return emailRef.current?.focus();
    if (passwordError) return passRef.current?.focus();
    setBusy(true);
    try {
      if (creating) {
        const { signedIn } = await signUp(email, password);
        if (!signedIn) {
          setConfirmSent(email.trim());
          setPassword('');
          return;
        }
      } else {
        await signIn(email, password);
      }
      await afterSignIn();
      onDone();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="auth-sent" role="status">
        <div className="auth-sent-art" aria-hidden>
          <svg viewBox="0 0 64 48" width="72" height="54"><rect x="3" y="5" width="58" height="38" rx="6" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M5 9l27 20L59 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /></svg>
        </div>
        <p className="auth-sent-title">Check your email</p>
        <p className="auth-sent-text">Check your email to confirm, then sign in. We sent a link to <b>{confirmSent}</b>.</p>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => { switchMode('signin'); setEmail(confirmSent); }}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
      <div className="auth-tabs" role="tablist" aria-label="Account">
        {(['signin', 'create'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            id={`${id}-tab-${m}`}
            aria-selected={mode === m}
            aria-controls={`${id}-panel`}
            tabIndex={mode === m ? 0 : -1}
            className={`auth-tab ${mode === m ? 'on' : ''}`}
            onClick={() => switchMode(m)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const other = m === 'signin' ? 'create' : 'signin';
                switchMode(other);
                document.getElementById(`${id}-tab-${other}`)?.focus();
              }
            }}
          >
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${mode}`} className="auth-panel">
        {serverError && <p className="form-error" role="alert">{serverError}</p>}

        <div className={`field ${showEmailErr ? 'has-error' : ''}`}>
          <label className="field-label" htmlFor={`${id}-email`}>Email</label>
          <input
            ref={emailRef}
            id={`${id}-email`}
            data-autofocus
            className="input"
            type="email"
            inputMode="email"
            autoComplete={creating ? 'email' : 'username'}
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setServerError(null); }}
            onBlur={() => email && setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={Boolean(showEmailErr)}
            aria-describedby={showEmailErr ? `${id}-email-err` : undefined}
            readOnly={busy}
          />
          {showEmailErr && <p className="field-error" id={`${id}-email-err`}>{emailError}</p>}
        </div>

        <div className={`field ${showPassErr ? 'has-error' : ''}`}>
          <label className="field-label" htmlFor={`${id}-pass`}>Password</label>
          <div className="pass-wrap">
            <input
              ref={passRef}
              id={`${id}-pass`}
              className="input pass-input"
              type={show ? 'text' : 'password'}
              autoComplete={creating ? 'new-password' : 'current-password'}
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              minLength={creating ? MIN_PASSWORD : undefined}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setServerError(null); }}
              onBlur={() => password && setTouched((t) => ({ ...t, password: true }))}
              aria-invalid={Boolean(showPassErr)}
              aria-describedby={`${id}-pass-help`}
              readOnly={busy}
            />
            <button
              type="button"
              className="pass-toggle"
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
              aria-controls={`${id}-pass`}
              onClick={() => setShow((v) => !v)}
            >
              <EyeIcon off={show} />
            </button>
          </div>
          {showPassErr ? (
            <p className="field-error" id={`${id}-pass-help`}>{passwordError}</p>
          ) : (
            <p className="field-help" id={`${id}-pass-help`}>
              {creating ? `At least ${MIN_PASSWORD} characters.` : ' '}
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy} aria-busy={busy}>
          {busy ? <><span className="spinner" aria-hidden /> {creating ? 'Creating account…' : 'Signing in…'}</> : creating ? 'Create account' : 'Sign in'}
        </button>
        <p className="auth-switch">
          {creating ? 'Already have an account? ' : 'New here? '}
          <button type="button" className="linkish" onClick={() => switchMode(creating ? 'signin' : 'create')}>
            {creating ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </form>
  );
}

// ───────────────────────────── modal

/** Rendered once at the app root; opened with openSignIn(). */
export function SignInHost() {
  const { open, mode, reason, next } = useSignInPrompt();
  const close = () => useSignInPrompt.setState({ open: false });
  return (
    <Modal
      open={open}
      onClose={close}
      className="auth-modal"
      title={mode === 'create' ? 'Create your account' : 'Welcome back'}
      subtitle={reason ?? 'Sign in to keep your player and your film in one place.'}
    >
      {open && (
        <SignInForm
          mode={mode}
          onMode={(m) => useSignInPrompt.setState({ mode: m })}
          onDone={() => {
            close();
            if (next) navigate(next);
          }}
        />
      )}
    </Modal>
  );
}
