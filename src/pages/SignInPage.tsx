import { useEffect, useState } from 'react';
import { useAuth } from '../data/auth';
import { useTitle } from '../lib/hooks';
import { navigate, safeNext, useHashQuery } from '../router';
import { SignInForm, type AuthMode } from '../ui/SignIn';

export function SignInPage() {
  const query = useHashQuery();
  const next = safeNext(query.get('next'));
  const [mode, setMode] = useState<AuthMode>(query.get('mode') === 'create' ? 'create' : 'signin');
  const ready = useAuth((s) => s.ready);
  const account = useAuth((s) => s.account);
  const [done, setDone] = useState(false);
  useTitle(mode === 'create' ? 'Create account' : 'Sign in');

  // already signed in (e.g. opened the link in a second tab): go straight on
  useEffect(() => {
    if (ready && account && !done) navigate(next, { replace: true });
  }, [ready, account, next, done]);

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card-glow" aria-hidden />
        <p className="kicker">Diamond Armory · Account</p>
        <h1 className="auth-title">{mode === 'create' ? 'Join the club' : 'Welcome back'}</h1>
        <p className="auth-lede">
          {mode === 'create'
            ? 'An account keeps your player safe on any device and unlocks My Film, your private highlight room.'
            : 'Sign in to edit your player from any device and manage your film.'}
        </p>
        {ready ? (
          <SignInForm
            mode={mode}
            onMode={setMode}
            autoFocus
            onDone={() => {
              setDone(true);
              navigate(next, { replace: true });
            }}
          />
        ) : (
          <div className="auth-loading" role="status"><span className="spinner" aria-hidden /> Checking your session…</div>
        )}
        <p className="auth-foot">
          No account needed to <a href="#/new">build a player</a>. Accounts are for keeping it and adding film.
        </p>
      </div>
    </main>
  );
}
