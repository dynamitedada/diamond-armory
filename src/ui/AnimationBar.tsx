import type { AnimationName } from '../data/types';
import { useArmory } from '../state/store';
import { downloadViewerScreenshot } from '../scene/viewerApi';

const ANIMS: { name: AnimationName; label: string; icon: string }[] = [
  { name: 'idle', label: 'Idle', icon: '◦' },
  { name: 'stance', label: 'Stance', icon: '⌁' },
  { name: 'swing', label: 'Swing', icon: '⤼' },
  { name: 'bunt', label: 'Bunt', icon: '⊥' },
  { name: 'celebrate', label: 'Celebrate', icon: '✦' },
  { name: 'dance', label: 'Dance', icon: '♫' },
  { name: 'flex', label: 'Flex', icon: '💪' },
  { name: 'walk', label: 'Walk', icon: '→' },
];

export function AnimationBar() {
  const animation = useArmory((s) => s.animation);
  const nonce = useArmory((s) => s.animationNonce);
  const setAnimation = useArmory((s) => s.setAnimation);
  const autoRotate = useArmory((s) => s.autoRotate);
  const setAutoRotate = useArmory((s) => s.setAutoRotate);
  const resetView = useArmory((s) => s.resetView);
  return (
    <>
    <div className="animbar" role="toolbar" aria-label="Animations">
      <div className="animbar-chips">
        {ANIMS.map((a) => (
          <button
            key={a.name}
            type="button"
            className={`chip ${animation === a.name ? 'on' : ''}`}
            aria-pressed={animation === a.name}
            onClick={() => setAnimation(a.name)}
          >
            <span className="chip-icon" key={animation === a.name ? nonce : 0}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
    <div className="viewer-tools">
      <button
        type="button"
        className={`toggle ${autoRotate ? 'on' : ''}`}
        aria-pressed={autoRotate}
        onClick={() => setAutoRotate(!autoRotate)}
        title="Auto-rotate"
      >
        <span className="toggle-track"><span className="toggle-knob" /></span>
        <span className="toggle-label">Auto-rotate</span>
      </button>
      <button type="button" className="tool-btn" onClick={resetView} title="Reset view" aria-label="Reset view">⟲</button>
      <button type="button" className="tool-btn" onClick={() => downloadViewerScreenshot()} title="Save screenshot" aria-label="Save screenshot">◉</button>
    </div>
    </>
  );
}
