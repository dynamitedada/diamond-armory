import { useId, type ReactNode } from 'react';
import {
  HAIR_COLORS, LIMITS, POSITIONS, SKIN_TONES, validateFields,
  type FieldErrors, type ProfileFields,
} from '../lib/profile';
import { useArmory } from '../state/store';
import { SlotGrid } from './SlotGrid';
import { useUi } from './theme';

export const STEPS = ['Identity', 'Look', 'Gear'] as const;

/** Stable ids so pages can focus the first invalid field. */
export const fieldId = (k: keyof ProfileFields) => `bf-${k}`;

interface Props {
  title: string;
  fields: ProfileFields;
  onChange: (patch: Partial<ProfileFields>) => void;
  /** Errors to show right now (already filtered to touched fields / after a save attempt). */
  errors: FieldErrors;
  onBlurField: (k: keyof ProfileFields) => void;
  isMobile: boolean;
  step: number;
  onStep: (n: number) => void;
  /** Desktop footer (e.g. the Save button). */
  footer?: ReactNode;
}

function Field({ k, label, error, hint, optional, children, counter }: {
  k: keyof ProfileFields; label: string; error?: string; hint?: ReactNode; optional?: boolean; children: ReactNode; counter?: ReactNode;
}) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <div className="field-top">
        <label className="field-label" htmlFor={fieldId(k)}>
          {label} {optional && <span className="field-opt">optional</span>}
        </label>
        {counter}
      </div>
      {children}
      {error ? (
        <p className="field-error" id={`${fieldId(k)}-err`} role="alert">{error}</p>
      ) : hint ? (
        <p className="field-help">{hint}</p>
      ) : null}
    </div>
  );
}

const Counter = ({ value, max }: { value: string; max: number }) =>
  value.length > max * 0.7 ? <span className={`field-count ${value.length >= max ? 'max' : ''}`}>{value.length}/{max}</span> : null;

function Segmented<T extends string>({ name, label, value, options, onChange }: {
  name: string; label: string; value: T; options: { v: T; label: string; title: string }[]; onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <span className="field-label" id={id}>{label}</span>
      <div className="segmented" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <label key={o.v} className={`seg ${value === o.v ? 'on' : ''}`} title={o.title}>
            <input type="radio" name={name} value={o.v} checked={value === o.v} onChange={() => onChange(o.v)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Swatches({ name, label, value, options, onChange }: {
  name: string; label: string; value: string; options: { hex: string; label: string }[]; onChange: (hex: string) => void;
}) {
  const id = useId();
  const custom = !options.some((o) => o.hex.toLowerCase() === value.toLowerCase());
  return (
    <div className="field">
      <span className="field-label" id={id}>{label}</span>
      <div className="swatches" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <label key={o.hex} className="swatch" title={o.label}>
            <input type="radio" name={name} value={o.hex} checked={value.toLowerCase() === o.hex.toLowerCase()} onChange={() => onChange(o.hex)} aria-label={o.label} />
            <span className="swatch-dot" style={{ background: o.hex }} />
          </label>
        ))}
        <label className={`swatch swatch-custom ${custom ? 'is-custom' : ''}`} title="Custom color">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`Custom ${label.toLowerCase()}`} />
          <span className="swatch-dot" style={custom ? { background: value } : undefined}>{custom ? '' : '+'}</span>
        </label>
      </div>
    </div>
  );
}

const SKIN_OPTIONS = SKIN_TONES.map((hex, i) => ({ hex, label: `Skin tone ${i + 1} of ${SKIN_TONES.length}` }));

export function BuilderPanel({ title, fields, onChange, errors, onBlurField, isMobile, step, onStep, footer }: Props) {
  const setAnimation = useArmory((s) => s.setAnimation);
  const openPicker = useUi((s) => s.openPicker);
  const identityOk = Object.keys(validateFields(fields)).length === 0;
  const show = (n: number) => !isMobile || step === n;
  const describe = (k: keyof ProfileFields) => (errors[k] ? `${fieldId(k)}-err` : undefined);

  return (
    <section className={`builder ${isMobile ? 'is-stepper' : ''}`} aria-label={title}>
      <div className="builder-head">
        <h2 className="builder-title">{title}</h2>
        {!isMobile && <p className="builder-sub">Every change shows up on your player live.</p>}
      </div>

      {isMobile && (
        <ol className="stepper">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button type="button" className={`step ${step === i ? 'on' : ''} ${i === 0 && identityOk ? 'done' : ''}`} aria-current={step === i ? 'step' : undefined} onClick={() => onStep(i)}>
                <span className="step-n" aria-hidden>{i === 0 && identityOk && step !== 0 ? '✓' : i + 1}</span>
                {s}
              </button>
            </li>
          ))}
        </ol>
      )}

      {show(0) && (
        <div className="builder-section">
          {!isMobile && <h3 className="section-title"><span>1</span> Identity</h3>}
          <Field k="name" label="Player name" error={errors.name} counter={<Counter value={fields.name} max={LIMITS.name} />}>
            <input
              id={fieldId('name')}
              className="input input-lg"
              value={fields.name}
              maxLength={LIMITS.name}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="e.g. Manny Gauz"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describe('name')}
              aria-required
              onChange={(e) => onChange({ name: e.target.value })}
              onBlur={() => onBlurField('name')}
            />
          </Field>
          <Field k="nickname" label="Nickname" optional error={errors.nickname} hint="Shows up in quotes on your card." counter={<Counter value={fields.nickname} max={LIMITS.nickname} />}>
            <input
              id={fieldId('nickname')}
              className="input"
              value={fields.nickname}
              maxLength={LIMITS.nickname}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="e.g. Nitro"
              aria-invalid={Boolean(errors.nickname)}
              aria-describedby={describe('nickname')}
              onChange={(e) => onChange({ nickname: e.target.value })}
              onBlur={() => onBlurField('nickname')}
            />
          </Field>
          <Field k="team" label="Team" optional error={errors.team} counter={<Counter value={fields.team} max={LIMITS.team} />}>
            <input
              id={fieldId('team')}
              className="input"
              value={fields.team}
              maxLength={LIMITS.team}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="e.g. Brooklyn Night Owls"
              aria-invalid={Boolean(errors.team)}
              aria-describedby={describe('team')}
              onChange={(e) => onChange({ team: e.target.value })}
              onBlur={() => onBlurField('team')}
            />
          </Field>
          <div className="field-row">
            <Field k="number" label="Number" error={errors.number}>
              <input
                id={fieldId('number')}
                className="input input-num"
                value={fields.number}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                autoComplete="off"
                enterKeyHint="done"
                placeholder="0–99"
                aria-invalid={Boolean(errors.number)}
                aria-describedby={describe('number')}
                aria-required
                onChange={(e) => onChange({ number: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                onBlur={() => onBlurField('number')}
              />
            </Field>
            <Field k="position" label="Position" error={errors.position}>
              <div className="select-wrap">
                <select
                  id={fieldId('position')}
                  className="input select"
                  value={fields.position}
                  aria-invalid={Boolean(errors.position)}
                  aria-describedby={describe('position')}
                  onChange={(e) => onChange({ position: e.target.value })}
                  onBlur={() => onBlurField('position')}
                >
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </Field>
          </div>
          <div className="field-row">
            <Segmented
              name="bats"
              label="Bats"
              value={fields.bats}
              onChange={(bats) => onChange({ bats })}
              options={[{ v: 'L', label: 'L', title: 'Left' }, { v: 'R', label: 'R', title: 'Right' }, { v: 'S', label: 'S', title: 'Switch' }]}
            />
            <Segmented
              name="throws"
              label="Throws"
              value={fields.throws}
              onChange={(throws) => onChange({ throws })}
              options={[{ v: 'L', label: 'L', title: 'Left' }, { v: 'R', label: 'R', title: 'Right' }]}
            />
          </div>
        </div>
      )}

      {show(1) && (
        <div className="builder-section">
          {!isMobile && <h3 className="section-title"><span>2</span> Look</h3>}
          <Swatches name="skin" label="Skin tone" value={fields.skin_tone} options={SKIN_OPTIONS} onChange={(skin_tone) => onChange({ skin_tone })} />
          <Swatches name="hair" label="Hair color" value={fields.hair_color} options={HAIR_COLORS} onChange={(hair_color) => onChange({ hair_color })} />
          <p className="field-help">Tip: hair peeks out under the cap. Drag the player to spin him around.</p>
        </div>
      )}

      {show(2) && (
        <div className="builder-section">
          {!isMobile && <h3 className="section-title"><span>3</span> Gear</h3>}
          {isMobile ? (
            <>
              <p className="gear-callout"><b>Pick your bat</b> and watch him swing it. Tap any slot to swap gear.</p>
              <SlotGrid />
            </>
          ) : (
            <>
              <p className="gear-callout">Your gear sits around the player. <b>Click any slot</b> to swap it. Hover an option to preview it on the model.</p>
              <div className="gear-actions">
                <button type="button" className="btn btn-ghost" onClick={() => openPicker('bat')}>Pick your bat</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAnimation('swing')}>Watch him swing</button>
              </div>
            </>
          )}
        </div>
      )}

      {footer && <div className="builder-foot">{footer}</div>}
    </section>
  );
}
