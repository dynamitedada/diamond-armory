// Keeps a single 3D viewer alive across routes: it renders once (lazily) into a detached host
// element, and whichever page needs it mounts a <ViewerSlot/> that adopts that element.
import { lazy, Suspense, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

const ManagedViewer = lazy(() => import('./ManagedViewer'));

/** Start downloading the 3D chunk (and the character model it preloads) ahead of need. */
export const prefetchViewer = () => void import('./ManagedViewer');

const host = typeof document !== 'undefined' ? document.createElement('div') : (null as unknown as HTMLDivElement);
if (host) host.className = 'viewer-host';

const useViewerSlot = create<{ wanted: boolean; active: boolean }>(() => ({ wanted: false, active: false }));

/** Rendered once at the app root. */
export function ViewerPortal() {
  const wanted = useViewerSlot((s) => s.wanted);
  const active = useViewerSlot((s) => s.active);
  if (!wanted) return null;
  return createPortal(
    <Suspense fallback={null}>
      <ManagedViewer active={active} />
    </Suspense>,
    host,
  );
}

/** Where the viewer should appear on the current page. */
export function ViewerSlot({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current!.appendChild(host);
    useViewerSlot.setState({ wanted: true, active: true });
    return () => {
      host.remove();
      useViewerSlot.setState({ active: false });
    };
  }, []);
  return <div ref={ref} className={className} />;
}
