import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { FOCUSABLE, useDialog } from '../lib/useDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Small line under the title. */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Element to focus first (defaults to the first focusable control). */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Where focus goes on close if the element that opened the dialog is gone. */
  fallbackFocus?: () => HTMLElement | null;
  className?: string;
}

/**
 * Accessible dialog: a bottom sheet on phones, a centered card on wider screens.
 * Traps focus, closes on Esc / backdrop, makes the page behind it inert, and restores focus.
 */
export function Modal({ open, onClose, title, subtitle, children, initialFocus, fallbackFocus, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(ref, open, { onClose, initialFocus, fallbackFocus, firstSelector: `.modal-body :is(${FOCUSABLE})` });

  if (!open) return null;
  return createPortal(
    <div className="modal-layer">
      <div className="modal-backdrop" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        className={`modal ${className ?? ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-grip" aria-hidden />
        <div className="modal-head">
          <div>
            <h2 id={titleId} className="modal-title">{title}</h2>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
