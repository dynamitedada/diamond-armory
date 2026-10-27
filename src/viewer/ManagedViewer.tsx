// Lazy chunk: the one ModelViewer for the whole site. It is moved between pages (see ViewerHost)
// instead of being remounted, and its render loop is paused while no page shows it.
import { useEffect, useRef } from 'react';
import { _roots } from '@react-three/fiber';
import { ModelViewer } from '../scene/ModelViewer';

export default function ManagedViewer({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = ref.current?.querySelector('canvas');
    const root = canvas ? _roots.get(canvas) : undefined;
    const state = root?.store.getState();
    const want = active ? 'always' : 'never';
    if (state && state.frameloop !== want) state.setFrameloop(want);
  }, [active]);
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      <ModelViewer />
    </div>
  );
}
