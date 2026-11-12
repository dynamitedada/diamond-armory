import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { signOut, useAuth } from '../data/auth';
import { useMe } from '../state/account';
import { currentPath, profilePath, signinPath, type Route } from '../router';
import { toast } from './Toast';

const Caret = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** Where "Sign in" should come back to: the page you're on, or My Film from the home page. */
function nextFor(route: Route): string | undefined {
  if (route.name === 'home' || route.name === 'notfound' || route.name === 'signin') return undefined;
  return currentPath();
}

/** Top-right account control: "Sign in" link, or a compact menu once signed in. */
export function AccountMenu({ route }: { route: Route }) {
  const ready = useAuth((s) => s.ready);
  const account = useAuth((s) => s.account);
  const me = useMe((s) => s.profile);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // close on outside click, route change and Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onHash = () => setOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('hashchange', onHash);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('hashchange', onHash);
    };
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  if (!ready) return <span className="acct-skel" aria-hidden />;

  if (!account) {
    return (
      <a className="acct-signin" href={`#${signinPath(nextFor(route))}`} aria-current={route.name === 'signin' ? 'page' : undefined}>
        Sign in
      </a>
    );
  }

  const initial = (account.email.trim()[0] ?? '?').toUpperCase();
  const items = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  const onMenuKey = (e: KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const doSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
      toast('Signed out');
    } catch {
      toast("Couldn't sign out. Try again.", 'error');
    }
  };

  return (
    <div className="acct">
      <button
        ref={btnRef}
        type="button"
        className={`acct-btn ${open ? 'on' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account: ${account.email}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="acct-avatar" aria-hidden>{initial}</span>
        <Caret />
      </button>
      {open && (
        <div ref={menuRef} id={menuId} className="acct-menu" role="menu" aria-label="Account" onKeyDown={onMenuKey}>
          <div className="acct-head" role="presentation">
            <span className="acct-avatar lg" aria-hidden>{initial}</span>
            <span className="acct-who">
              <span className="acct-label">Signed in as</span>
              <span className="acct-email">{account.email}</span>
            </span>
          </div>
          {me ? (
            <a role="menuitem" className="acct-item" href={`#${profilePath(me.slug)}`} onClick={() => setOpen(false)}>
              <span className="acct-ico" aria-hidden>◆</span> My player
            </a>
          ) : (
            <a role="menuitem" className="acct-item" href="#/new" onClick={() => setOpen(false)}>
              <span className="acct-ico" aria-hidden>＋</span> Build your player
            </a>
          )}
          <a role="menuitem" className="acct-item" href="#/film" onClick={() => setOpen(false)}>
            <span className="acct-ico" aria-hidden>▶</span> My Film
          </a>
          <div className="acct-sep" role="separator" />
          <button role="menuitem" type="button" className="acct-item danger" onClick={doSignOut}>
            <span className="acct-ico" aria-hidden>⏻</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
