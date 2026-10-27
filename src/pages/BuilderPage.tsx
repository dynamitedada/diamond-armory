import { useEffect, useMemo, useRef, useState } from 'react';
import { createProfile } from '../data/api';
import { useArmory } from '../state/store';
import { cacheProfile, markFresh, useDraft } from '../state/draft';
import { fieldsToInput, fieldsToPlayer, loadoutIds, validateFields, type ProfileFields } from '../lib/profile';
import { useTitle } from '../lib/hooks';
import { navigate, profilePath } from '../router';
import { ArmoryView, MOBILE_QUERY } from './Armory';
import { BuilderPanel, STEPS, fieldId } from '../ui/BuilderPanel';
import { scheduleFeedbackPrompt } from '../ui/Feedback';
import { useMediaQuery } from '../ui/theme';
import { focusField, scrollPanelIntoView, useVisibleErrors } from './builderShared';

export function BuilderPage() {
  useTitle('Build your player');
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const fields = useDraft((s) => s.fields);
  const step = useDraft((s) => s.step);
  const { setFields, setStep } = useDraft.getState();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const saved = useRef(false);
  const { errors, allErrors, touch, revealAll } = useVisibleErrors(fields);

  // Load the draft onto the model; remember gear changes when leaving.
  useEffect(() => {
    const a = useArmory.getState();
    a.setLoadout(useDraft.getState().loadout);
    a.setAnimation('idle');
    return () => {
      // saved → start the next player fresh; otherwise keep the gear for when they come back
      if (saved.current) useDraft.getState().reset();
      else useDraft.getState().setLoadout(loadoutIds(useArmory.getState().equipped));
    };
  }, []);

  // Live preview: every keystroke / swatch updates the header and the 3D player.
  const player = useMemo(() => fieldsToPlayer(fields), [fields]);
  useEffect(() => useArmory.getState().setPlayer(player), [player]);

  const goStep = (n: number) => {
    setStep(n);
    scrollPanelIntoView();
  };

  const onChange = (patch: Partial<ProfileFields>) => {
    setFields(patch);
    setServerError(null);
  };

  const save = async () => {
    if (saving) return;
    const errs = validateFields(fields);
    const firstBad = (Object.keys(errs) as (keyof ProfileFields)[])[0];
    if (firstBad) {
      revealAll();
      if (isMobile && step !== 0) setStep(0);
      focusField(fieldId(firstBad));
      return;
    }
    setSaving(true);
    setServerError(null);
    const input = fieldsToInput(fields, loadoutIds(useArmory.getState().equipped));
    try {
      const slug = await createProfile(input);
      const now = new Date().toISOString();
      cacheProfile({ ...input, slug, created_at: now, updated_at: now });
      markFresh(slug);
      saved.current = true;
      scheduleFeedbackPrompt();
      navigate(profilePath(slug), { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Try again?');
      setSaving(false);
    }
  };

  const missing = Object.keys(allErrors).length > 0;
  const saveButton = (block: boolean) => (
    <button type="button" className={`btn btn-primary btn-lg ${block ? 'btn-block' : ''}`} onClick={save} disabled={saving} aria-busy={saving}>
      {saving ? <><span className="spinner" aria-hidden /> Saving…</> : 'Save player'}
    </button>
  );
  const errorLine = serverError ? (
    <p className="form-error" role="alert">Couldn't save: {serverError}</p>
  ) : errors.name || errors.number ? (
    <p className="form-error" role="alert">{errors.name ?? errors.number}</p>
  ) : null;

  const panel = (
    <BuilderPanel
      title="Build your player"
      fields={fields}
      onChange={onChange}
      errors={errors}
      onBlurField={touch}
      isMobile={isMobile}
      step={step}
      onStep={goStep}
      footer={isMobile ? undefined : (
        <>
          {errorLine}
          {saveButton(true)}
          <p className="field-help center">{missing ? 'Add a name to save.' : 'You get a link to share with your team.'}</p>
        </>
      )}
    />
  );

  const bottomBar = isMobile ? (
    <div className="actionbar" role="region" aria-label="Save">
      {errorLine}
      <div className="actionbar-row">
        {step < STEPS.length - 1 && (
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => goStep(step + 1)}>
            Next: {STEPS[step + 1]}
          </button>
        )}
        {saveButton(step === STEPS.length - 1)}
      </div>
    </div>
  ) : undefined;

  return (
    <ArmoryView
      kicker="New Player"
      panel={panel}
      slotsInPanel
      stickyViewer={step > 0}
      bottomBar={bottomBar}
    />
  );
}
