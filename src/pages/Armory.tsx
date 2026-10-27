// The armory page layout shared by "Build your player" and saved profiles: header, gear slots
// around the (single, persistent) 3D viewer, stats, plus an optional builder panel.
import { useEffect, useRef, type ReactNode } from 'react';
import { Header } from '../ui/Header';
import { EquipmentSlot } from '../ui/EquipmentSlot';
import { StatsPanel } from '../ui/StatsPanel';
import { AnimationBar } from '../ui/AnimationBar';
import { BOTTOM_SLOTS, LEFT_SLOTS, RIGHT_SLOTS, prefersReducedMotion, useMediaQuery, useUi } from '../ui/theme';
import { ViewerSlot } from '../viewer/ViewerHost';

export const MOBILE_QUERY = '(max-width: 900px)';

interface Props {
  /** Data still loading: header skeleton + veil over the model. */
  loading?: boolean;
  kicker?: string;
  /** Row under the header (share / edit / visitor note). */
  toolbar?: ReactNode;
  /** Builder panel: left sidebar on desktop, under the model on phones. */
  panel?: ReactNode;
  /** Phones: the panel shows the gear slots itself, so the stage hides them. */
  slotsInPanel?: boolean;
  /** Phones: keep the model pinned at the top while the panel scrolls. */
  stickyViewer?: boolean;
  /** Sticky bottom action bar (save / try-on). */
  bottomBar?: ReactNode;
}

export function ArmoryView({ loading = false, kicker, toolbar, panel, slotsInPanel, stickyViewer, bottomBar }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const setReady = useUi((s) => s.setReady);
  const setBottomBar = useUi((s) => s.setBottomBar);
  const commitNonce = useUi((s) => s.commitNonce);
  const viewerRef = useRef<HTMLDivElement>(null);
  const hideSlots = Boolean(slotsInPanel && isMobile);
  const sticky = Boolean(stickyViewer && isMobile);

  // skeleton → stagger-in whenever this page's data becomes available
  useEffect(() => {
    if (loading) {
      setReady(false);
      return;
    }
    const t = setTimeout(() => setReady(true), 380);
    return () => clearTimeout(t);
  }, [loading, setReady]);
  useEffect(() => () => useUi.getState().setReady(false), []);

  const hasBar = Boolean(bottomBar);
  useEffect(() => {
    setBottomBar(hasBar);
    if (!hasBar) return () => setBottomBar(false);
    // let the floating feedback button sit just above the bar, however tall it gets
    const bar = document.querySelector<HTMLElement>('.actionbar');
    const root = document.documentElement;
    const ro = bar ? new ResizeObserver(() => root.style.setProperty('--bar-h', `${bar.offsetHeight}px`)) : null;
    if (bar && ro) ro.observe(bar);
    return () => {
      ro?.disconnect();
      root.style.removeProperty('--bar-h');
      setBottomBar(false);
    };
  }, [hasBar, setBottomBar]);

  // Phones: after picking gear, bring the model back into view so the change is visible.
  const firstCommit = useRef(commitNonce);
  useEffect(() => {
    if (commitNonce === firstCommit.current || !isMobile || sticky) return;
    const el = viewerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    if (visible < r.height * 0.6) {
      window.scrollTo({ top: window.scrollY + r.top - 8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [commitNonce, isMobile, sticky]);

  return (
    <>
      <Header skeleton={loading} kicker={kicker} />
      <div className={`app armory ${panel ? 'has-panel' : ''} ${sticky ? 'sticky-viewer' : ''} ${bottomBar ? 'has-bar' : ''}`}>
        {toolbar}
        <div className="armory-body">
          {panel && <aside className="builder-col">{panel}</aside>}
          <div className="armory-main">
            <main className={`stage ${hideSlots ? 'stage-solo' : ''}`}>
              {!hideSlots && (
                <div className="col col-left">
                  {LEFT_SLOTS.map((s, i) => <EquipmentSlot key={s} slot={s} side="left" index={i} />)}
                </div>
              )}
              <div className="center">
                <div className="viewer" ref={viewerRef}>
                  <div className="viewer-skeleton" aria-hidden />
                  <ViewerSlot className="viewer-canvas" />
                  <div className="viewer-vignette" aria-hidden />
                  <AnimationBar />
                  {loading && (
                    <div className="viewer-veil" role="status">
                      <span className="spinner" aria-hidden /> Loading player…
                    </div>
                  )}
                </div>
                {!hideSlots && (
                  <div className="weapons">
                    {BOTTOM_SLOTS.map((s, i) => <EquipmentSlot key={s} slot={s} side="bottom" index={i + 8} />)}
                  </div>
                )}
              </div>
              {!hideSlots && (
                <div className="col col-right">
                  {RIGHT_SLOTS.map((s, i) => <EquipmentSlot key={s} slot={s} side="right" index={i} />)}
                </div>
              )}
            </main>
            <StatsPanel />
          </div>
        </div>
        <footer className="foot">
          <span className="foot-desk">Hover a slot for details · click to swap gear · hold ⇧ to compare · drag the player to spin him</span>
          <span className="foot-touch">Tap a slot to swap gear · drag the player to spin him</span>
        </footer>
      </div>
      {bottomBar}
    </>
  );
}
