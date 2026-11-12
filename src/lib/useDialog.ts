import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useUi } from '../ui/theme';

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

interface Options {
  onClose: () => void;
  /** Element to focus first; defaults to `firstSelector` inside the dialog, then the dialog itself. */
  initialFocus?: RefObject<HTMLElement | null>;
  firstSelector?: string;
  /** Where focus goes on close if the element that opened the dialog is gone. */
  fallbackFocus?: () => HTMLElement | null;
}

/**
 * Modal dialog behavior: traps Tab inside `ref`, closes on Esc, makes the page behind inert,
 * locks body scroll and puts focus back where it was when the dialog closes.
 */
export function useDialog(ref: RefObject<HTMLElement | null>, open: boolean, { onClose, initialFocus, firstSelector, fallbackFocus }: Options) {
  const onCloseRef = useRef(onClose);
  const fallbackRef = useRef(fallbackFocus);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    fallbackRef.current = fallbackFocus;
  });

  useEffect(() => {
    if (!open) return;
    useUi.getState().openPicker(undefined);
    const prev = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const el = ref.current!;
    const first =
      initialFocus?.current ??
      el.querySelector<HTMLElement>('[data-autofocus]') ??
      (firstSelector ? el.querySelector<HTMLElement>(firstSelector) : null) ??
      el;
    first.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === a || !el.contains(document.activeElement))) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && (document.activeElement === z || !el.contains(document.activeElement))) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      // another dialog may still be open on top of the page
      const others = [...document.querySelectorAll('.modal-layer, .lightbox')].some((n) => n.isConnected && !n.contains(el));
      if (!others) root?.removeAttribute('inert');
      document.body.style.overflow = prevOverflow;
      const back = prev && prev.isConnected && prev !== document.body ? prev : fallbackRef.current?.();
      back?.focus?.({ preventScroll: true });
    };
  }, [open, initialFocus, firstSelector, ref]);
}
