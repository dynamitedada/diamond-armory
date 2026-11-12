import { useEffect } from 'react';
import { create } from 'zustand';

export type ToastTone = 'ok' | 'error' | 'info';

interface ToastState {
  message?: string;
  tone: ToastTone;
  id: number;
  show: (message: string, tone?: ToastTone) => void;
  clear: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: undefined,
  tone: 'ok',
  id: 0,
  show: (message, tone = 'ok') => set((s) => ({ message, tone, id: s.id + 1 })),
  clear: () => set({ message: undefined }),
}));

export const toast = (message: string, tone?: ToastTone) => useToast.getState().show(message, tone);

/** Short-lived status line ("Link copied", "Changes saved"), announced politely to screen readers. */
export function Toasts() {
  const message = useToast((s) => s.message);
  const tone = useToast((s) => s.tone);
  const id = useToast((s) => s.id);
  const clear = useToast((s) => s.clear);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clear, tone === 'error' ? 4200 : 2600);
    return () => clearTimeout(t);
  }, [message, id, tone, clear]);
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && <div key={id} className={`toast toast-${tone}`}>{message}</div>}
    </div>
  );
}
