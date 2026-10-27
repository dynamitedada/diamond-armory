import { useEffect } from 'react';
import { create } from 'zustand';

interface ToastState {
  message?: string;
  id: number;
  show: (message: string) => void;
  clear: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: undefined,
  id: 0,
  show: (message) => set((s) => ({ message, id: s.id + 1 })),
  clear: () => set({ message: undefined }),
}));

export const toast = (message: string) => useToast.getState().show(message);

/** Short-lived status line ("Link copied", "Changes saved"), announced politely to screen readers. */
export function Toasts() {
  const message = useToast((s) => s.message);
  const id = useToast((s) => s.id);
  const clear = useToast((s) => s.clear);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clear, 2600);
    return () => clearTimeout(t);
  }, [message, id, clear]);
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && <div key={id} className="toast">{message}</div>}
    </div>
  );
}
