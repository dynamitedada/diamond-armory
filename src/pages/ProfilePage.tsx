import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canEdit, getProfile, updateProfile, type ProfileRecord } from '../data/api';
import { useAuth } from '../data/auth';
import { setMyProfile } from '../state/account';
import { navigate, profilePath, useHashQuery } from '../router';
import { Highlights } from '../ui/film/Highlights';
import { openSignIn } from '../ui/SignIn';
import { useArmory } from '../state/store';
import { cacheProfile, cachedProfile, isFresh, clearFresh } from '../state/draft';
import {
  fieldsToInput, fieldsToPlayer, loadoutIds, nameParts, recordToFields, recordToPlayer, resolveLoadout, sameLoadout, validateFields,
  type ProfileFields,
} from '../lib/profile';
import { useTitle } from '../lib/hooks';
import { ArmoryView, MOBILE_QUERY } from './Armory';
import { BuilderPanel, fieldId } from '../ui/BuilderPanel';
import { ShareSheet } from '../ui/ShareSheet';
import { toast } from '../ui/Toast';
import { useMediaQuery, useUi } from '../ui/theme';
import { focusField, scrollPanelIntoView, useVisibleErrors } from './builderShared';
import { NotFound } from './NotFound';

type Load =
  | { status: 'loading' }
  | { status: 'ready'; record: ProfileRecord }
  | { status: 'notfound' }
  | { status: 'error'; message: string };

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg>
);
const FilmGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></svg>
);
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></svg>
);

export function ProfilePage({ slug }: { slug: string }) {
  const [load, setLoad] = useState<Load>(() => {
    const c = cachedProfile(slug);
    return c ? { status: 'ready', record: c } : { status: 'loading' };
  });
  const [retry, setRetry] = useState(0);
  const accountId = useAuth((s) => s.account?.id ?? null);

  useEffect(() => {
    let alive = true;
    const hadCache = Boolean(cachedProfile(slug));
    getProfile(slug)
      .then((rec) => {
        if (!alive) return;
        if (rec) {
          cacheProfile(rec);
          setLoad((cur) =>
            cur.status === 'ready' && cur.record.updated_at === rec.updated_at && cur.record.owner_id === rec.owner_id
              ? cur
              : { status: 'ready', record: rec });
        } else if (!hadCache) setLoad({ status: 'notfound' });
      })
      .catch((err) => {
        if (!alive || hadCache) return;
        setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Network error' });
      });
    return () => { alive = false; };
  }, [slug, retry, accountId]);

  if (load.status === 'notfound') return <NotFound kind="player" />;
  if (load.status === 'error') {
    return (
      <NotFound
        kind="error"
        detail={load.message}
        onRetry={() => { setLoad({ status: 'loading' }); setRetry((n) => n + 1); }}
      />
    );
  }
  return <ProfileView key={slug} slug={slug} record={load.status === 'ready' ? load.record : null} />;
}

function ProfileView({ slug, record }: { slug: string; record: ProfileRecord | null }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const accountId = useAuth((s) => s.account?.id ?? null);
  const ownerId = record?.owner_id ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- canEdit reads the signed-in account
  const owner = useMemo(() => canEdit(slug, record), [slug, record, accountId]);
  const linked = Boolean(ownerId && ownerId === accountId);
  const query = useHashQuery();
  const equipped = useArmory((s) => s.equipped);
  const pickerSlot = useUi((s) => s.pickerSlot);
  const [saved, setSaved] = useState<ProfileRecord | null>(record);
  const [fields, setFields] = useState<ProfileFields | null>(record ? recordToFields(record) : null);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fresh] = useState(() => isFresh(slug));
  const [shareOpen, setShareOpen] = useState(fresh);
  const { errors, touch, revealAll, reset: resetErrors } = useVisibleErrors(fields ?? recordToFieldsFallback);

  useEffect(() => { if (fresh) clearFresh(slug); }, [fresh, slug]);

  // visitors inspect gear; owners swap it
  useEffect(() => {
    useUi.getState().setSlotClick(owner ? 'pick' : 'inspect');
  }, [owner]);
  useEffect(() => () => useUi.getState().setSlotClick('pick'), []);

  // #/p/<slug>?edit=1 (the nav's "Edit your player"): open the editor, then tidy the URL
  const wantsEdit = query.get('edit') === '1';
  useEffect(() => {
    if (!wantsEdit || !saved) return;
    if (owner) {
      setEditing(true);
      scrollPanelIntoView();
    }
    navigate(profilePath(slug), { replace: true });
  }, [wantsEdit, owner, saved, slug]);

  const apply = useCallback((rec: ProfileRecord) => {
    const a = useArmory.getState();
    a.setPlayer(recordToPlayer(rec));
    a.setLoadout(rec.loadout);
    setFields(recordToFields(rec));
  }, []);

  // first data (or a newer copy from the server while untouched) → model + header
  const appliedAt = useRef<string | null>(null);
  const lastDirty = useRef(false);
  useEffect(() => {
    if (!record) return;
    if (appliedAt.current === null) {
      appliedAt.current = record.updated_at;
      setSaved(record);
      apply(record);
      if (!fresh) useArmory.getState().setAnimation('idle');
    } else if (record.updated_at !== appliedAt.current && !saving && !lastDirty.current) {
      appliedAt.current = record.updated_at;
      setSaved(record);
      apply(record);
    }
  }, [record, apply, fresh, saving]);

  // live preview while the owner edits fields
  const livePlayer = useMemo(() => (fields && editing ? fieldsToPlayer(fields) : null), [fields, editing]);
  useEffect(() => { if (livePlayer) useArmory.getState().setPlayer(livePlayer); }, [livePlayer]);

  const displayName = saved ? recordToPlayer(saved).name : null;
  useTitle(displayName ?? 'Loading player');

  // ── dirty tracking (ignore transient picker previews)
  // compare against the stored loadout as the model shows it (unknown/retired ids are dropped)
  const savedLoadout = useMemo(() => (saved ? loadoutIds(resolveLoadout(saved.loadout)) : {}), [saved]);
  const loadoutChanged = Boolean(saved) && !sameLoadout(loadoutIds(equipped), savedLoadout);
  const fieldsChanged = Boolean(saved && fields) &&
    JSON.stringify(fieldsToInput(fields!, {})) !== JSON.stringify(fieldsToInput(recordToFields(saved!), {}));
  const dirtyNow = loadoutChanged || (owner && fieldsChanged);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (pickerSlot) return; // hold steady while hovering through picker previews
    lastDirty.current = dirtyNow;
    setDirty(dirtyNow);
  }, [pickerSlot, dirtyNow]);

  const discard = () => {
    if (!saved) return;
    apply(saved);
    resetErrors();
    setSaveError(null);
  };

  const saveChanges = async () => {
    if (!saved || !fields || saving) return;
    const errs = validateFields(fields);
    const firstBad = (Object.keys(errs) as (keyof ProfileFields)[])[0];
    if (firstBad) {
      setEditing(true);
      revealAll();
      setStep(0);
      focusField(fieldId(firstBad));
      return;
    }
    const input = fieldsToInput(fields, loadoutIds(useArmory.getState().equipped));
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile(slug, input);
      const next: ProfileRecord = { ...saved, ...input, updated_at: new Date().toISOString() };
      appliedAt.current = next.updated_at;
      cacheProfile(next);
      if (next.owner_id && next.owner_id === accountId) setMyProfile(next);
      setSaved(next);
      setFields(recordToFields(next));
      useArmory.getState().setPlayer(recordToPlayer(next));
      toast('Changes saved');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Try again?');
    } finally {
      setSaving(false);
    }
  };

  const first = displayName ? nameParts(displayName).first : '';

  const bio = saved?.bio?.trim();
  const toolbar = saved ? (
    <>
      {bio && (
        <p className="profile-bio">
          <span className="profile-bio-mark" aria-hidden>“</span>
          {bio}
        </p>
      )}
      <div className={`profile-bar ${owner ? 'is-owner' : 'is-visitor'}`}>
        {owner ? (
          <p className="profile-note">
            <span className="pill pill-gold">Your player</span>{' '}
            {linked ? (
              'Linked to your account. Edit it from any device.'
            ) : accountId ? (
              'Saved on this device.'
            ) : (
              <>
                Only this device can edit this player.{' '}
                <button type="button" className="linkish" onClick={() => openSignIn({ reason: 'Sign in to link this player to your account and add highlights.' })}>
                  Sign in
                </button>{' '}
                to keep it safe and add highlights.
              </>
            )}
          </p>
        ) : (
          <p className="profile-note">
            <span className="pill">Visiting</span> Tap any gear for the full card. Try-ons here aren't saved.
          </p>
        )}
        <div className={`profile-actions ${owner ? 'n3' : ''}`}>
          {owner ? (
            <>
              <button type="button" className={`btn ${editing ? 'btn-ghost on' : 'btn-ghost'}`} aria-pressed={editing} onClick={() => { setEditing((e) => !e); if (!editing) scrollPanelIntoView(); }}>
                <EditIcon /> {editing ? <>Done<span className="lbl-long"> editing</span></> : <>Edit<span className="lbl-long"> player</span></>}
              </button>
              <a className="btn btn-ghost" href="#/film">
                <FilmGlyph /> <span className="lbl-long">Manage film</span><span className="lbl-short">Film</span>
              </a>
            </>
          ) : (
            <a className="btn btn-primary" href="#/new">Build your own</a>
          )}
          <button type="button" className="btn btn-ghost" data-share-trigger onClick={() => setShareOpen(true)}>
            <ShareIcon /> Share
          </button>
        </div>
      </div>
    </>
  ) : null;

  const panel = owner && editing && fields ? (
    <BuilderPanel
      title="Edit player"
      fields={fields}
      onChange={(patch) => { setFields((f) => (f ? { ...f, ...patch } : f)); setSaveError(null); }}
      errors={errors}
      onBlurField={touch}
      isMobile={isMobile}
      step={step}
      onStep={(n) => { setStep(n); scrollPanelIntoView(); }}
      footer={isMobile ? undefined : (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setEditing(false)}>Done editing</button>
      )}
    />
  ) : undefined;

  let bottomBar: React.ReactNode;
  if (saved && owner && (dirty || saving)) {
    bottomBar = (
      <div className="actionbar" role="region" aria-label="Unsaved changes">
        {saveError && <p className="form-error" role="alert">Couldn't save: {saveError}</p>}
        <div className="actionbar-row">
          <span className="actionbar-note">Unsaved changes</span>
          <button type="button" className="btn btn-ghost btn-lg" onClick={discard} disabled={saving}>Discard</button>
          <button type="button" className="btn btn-primary btn-lg" onClick={saveChanges} disabled={saving} aria-busy={saving}>
            {saving ? <><span className="spinner" aria-hidden /> Saving…</> : 'Save changes'}
          </button>
        </div>
      </div>
    );
  } else if (saved && !owner && dirty) {
    bottomBar = (
      <div className="actionbar" role="region" aria-label="Trying on gear">
        <div className="actionbar-row">
          <span className="actionbar-note">Just trying it on. This isn't saved to {first}'s player.</span>
          <button type="button" className="btn btn-ghost btn-lg" onClick={discard}>Reset</button>
          <a className="btn btn-primary btn-lg" href="#/new">Build your own</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <ArmoryView
        loading={!saved}
        kicker="Player Card"
        toolbar={toolbar}
        panel={panel}
        slotsInPanel={Boolean(panel)}
        stickyViewer={Boolean(panel) && step > 0}
        bottomBar={bottomBar}
        canEdit={owner}
        after={saved ? (
          <Highlights ownerId={ownerId} isOwner={owner} firstName={first || 'Player'} />
        ) : undefined}
      />
      {saved && (
        <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} slug={slug} name={displayName!} fresh={fresh} />
      )}
    </>
  );
}

const recordToFieldsFallback: ProfileFields = {
  name: '', nickname: '', team: '', number: '0', position: 'Utility', bats: 'R', throws: 'R', skin_tone: '#c68a5e', hair_color: '#141010', bio: '',
};
