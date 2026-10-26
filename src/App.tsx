import { lazy, Suspense, useEffect } from 'react';
import { Header } from './ui/Header';
import { Tabs } from './ui/Tabs';
import { EquipmentSlot } from './ui/EquipmentSlot';
import { StatsPanel } from './ui/StatsPanel';
import { AnimationBar } from './ui/AnimationBar';
import { BOTTOM_SLOTS, LEFT_SLOTS, RIGHT_SLOTS, useUi } from './ui/theme';
import './App.css';

const ModelViewer = lazy(() => import('./scene/ModelViewer').then((m) => ({ default: m.ModelViewer })));

export default function App() {
  const setReady = useUi((s) => s.setReady);
  useEffect(() => {
    // Short skeleton phase so the stagger-in reads as intentional, then reveal.
    const t = setTimeout(setReady, 450);
    return () => clearTimeout(t);
  }, [setReady]);

  return (
    <>
    <Header />
    <div className="app">
      <Tabs />
      <main className="stage">
        <div className="col col-left">
          {LEFT_SLOTS.map((s, i) => <EquipmentSlot key={s} slot={s} side="left" index={i} />)}
        </div>
        <div className="center">
          <div className="viewer">
            <div className="viewer-skeleton" aria-hidden />
            <div className="viewer-canvas"><Suspense fallback={null}><ModelViewer /></Suspense></div>
            <div className="viewer-vignette" aria-hidden />
            <AnimationBar />
          </div>
          <div className="weapons">
            {BOTTOM_SLOTS.map((s, i) => <EquipmentSlot key={s} slot={s} side="bottom" index={i + 8} />)}
          </div>
        </div>
        <div className="col col-right">
          {RIGHT_SLOTS.map((s, i) => <EquipmentSlot key={s} slot={s} side="right" index={i} />)}
        </div>
      </main>
      <StatsPanel />
      <footer className="foot">Diamond Armory · hover a slot for details · click to swap gear · hold ⇧ to compare</footer>
    </div>
    </>
  );
}
