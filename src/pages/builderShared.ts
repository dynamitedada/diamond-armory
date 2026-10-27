import { useCallback, useMemo, useState } from 'react';
import { validateFields, type FieldErrors, type ProfileFields } from '../lib/profile';
import { prefersReducedMotion } from '../ui/theme';

/** Errors show once a field has been touched, or for every field after a save attempt. */
export function useVisibleErrors(fields: ProfileFields) {
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileFields, boolean>>>({});
  const [all, setAll] = useState(false);
  const allErrors = useMemo(() => validateFields(fields), [fields]);
  const errors = useMemo(() => {
    if (all) return allErrors;
    const out: FieldErrors = {};
    for (const [k, v] of Object.entries(allErrors)) if (touched[k as keyof ProfileFields]) out[k as keyof ProfileFields] = v;
    return out;
  }, [allErrors, touched, all]);
  const touch = useCallback((k: keyof ProfileFields) => setTouched((t) => (t[k] ? t : { ...t, [k]: true })), []);
  const revealAll = useCallback(() => setAll(true), []);
  const reset = useCallback(() => { setAll(false); setTouched({}); }, []);
  return { errors, allErrors, touch, revealAll, reset };
}

/** Bring an invalid field to the middle of the screen (clear of sticky bars) and focus it. */
export function focusField(id: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
  });
}

/** Phones: after switching builder steps, make sure the step content is on screen (below a pinned model). */
export function scrollPanelIntoView() {
  requestAnimationFrame(() => {
    const panel = document.querySelector<HTMLElement>('.builder');
    if (!panel) return;
    const pinned = document.querySelector<HTMLElement>('.sticky-viewer .center');
    const offset = pinned ? pinned.getBoundingClientRect().height : 0;
    const top = panel.getBoundingClientRect().top;
    if (top < offset || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - offset - 8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  });
}
