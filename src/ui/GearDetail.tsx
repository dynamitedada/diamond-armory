// Expanded gear card: everything about one item plus a small rotating 3D preview.
// Opens from a slot click (visitors), from the 3D model (anyone), or from the swap picker (owners).
import { Component, lazy, Suspense, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Item, Rarity, StatKey } from '../data/types';
import { CATALOG, SET_BONUSES, SLOT_LABELS } from '../data/items';
import { GEAR_SLOTS } from '../scene/sockets';
import { useArmory } from '../state/store';
import { SlotIcon } from './EquipmentSlot';
import { Modal } from './Modal';
import { ALL_STATS, RARITY_COLOR, RARITY_TEXT, STAT_COLOR, STAT_LABEL, fmt, prefersReducedMotion, useUi } from './theme';

const GearStage = lazy(() => import('../scene/GearStage'));

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic',
};

/** Highest value of each stat across the catalog: bars read as "how good is this for its kind". */
const STAT_MAX = Object.fromEntries(
  ALL_STATS.map((k) => [k, Math.max(1, ...CATALOG.map((i) => i.stats[k] ?? 0))]),
) as Record<StatKey, number>;

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function BigIcon({ item }: { item: Item }) {
  return (
    <div className="gd-bigicon">
      <SlotIcon item={item} slot={item.slot} size={112} />
    </div>
  );
}

export function GearDetailBody({ item }: { item: Item }) {
  const equipped = useArmory((s) => s.equipped);
  const number = useArmory((s) => s.player.number);
  const [kind, ...rest] = item.type.split(' · ');
  const detail = rest.join(' · ');
  const stats = ALL_STATS.filter((k) => item.stats[k]);
  const setPieces = item.setName ? CATALOG.filter((i) => i.setName === item.setName) : [];
  const owned = setPieces.filter((p) => equipped[p.slot]?.id === p.id).length;
  const bonuses = item.setName ? SET_BONUSES[item.setName] ?? [] : [];
  const has3D = GEAR_SLOTS.includes(item.slot);
  const isEquipped = equipped[item.slot]?.id === item.id;
  const spin = useMemo(() => !prefersReducedMotion(), []);
  const signature = item.setName
    ? `Signature: ${item.setName}`
    : item.rarity === 'common' || item.rarity === 'uncommon' ? 'Team-Issued' : 'Player Exclusive';

  return (
    <div className={`gd r-${item.rarity} ${has3D ? 'has-3d' : 'no-3d'}`} style={{ '--rc': RARITY_COLOR[item.rarity] } as CSSProperties}>
      <div className="gd-top">
        <SlotIcon item={item} slot={item.slot} size={84} />
        <div className="gd-id">
          <div className="gd-ovr"><span className="gd-ovr-n tnum">{item.ovr}</span><span className="gd-ovr-l">OVR</span></div>
          <div className="gd-type">
            {SLOT_LABELS[item.slot]}
            {kind.toLowerCase() !== SLOT_LABELS[item.slot].toLowerCase() && <> · {kind}</>}
            {detail ? <span className="gd-type-d"> · {detail}</span> : null}
          </div>
          <div className="gd-chips">
            <span className="gd-rarity" style={{ color: RARITY_TEXT[item.rarity] }}>{RARITY_LABEL[item.rarity]}</span>
            <span className="gd-chip">{signature}</span>
            {isEquipped && <span className="gd-chip eq">Equipped</span>}
          </div>
        </div>
      </div>

      <div className="gd-cols">
        <div className="gd-visual">
          {has3D ? (
            <div className="gd-stage">
              <Fallback fallback={<BigIcon item={item} />}>
                <Suspense fallback={<div className="gd-stage-load"><span className="spinner" aria-hidden /> Loading 3D…</div>}>
                  <GearStage item={item} number={number} spin={spin} />
                </Suspense>
              </Fallback>
              <span className="gd-stage-hint" aria-hidden>Drag to spin</span>
            </div>
          ) : (
            <div className="gd-stage gd-stage-flat">
              <BigIcon item={item} />
              <span className="gd-stage-hint" aria-hidden>{item.slot === 'walkupSong' ? 'Plays as he walks up' : 'Part of the uniform'}</span>
            </div>
          )}
        </div>

        <div className="gd-info">
          <h3 className="gd-h">Stats</h3>
          <ul className="gd-stats">
            {stats.map((k, i) => {
              const v = item.stats[k]!;
              return (
                <li key={k} className="gd-stat" style={{ '--sc': STAT_COLOR[k], '--i': i } as CSSProperties}>
                  <span className="gd-stat-l">{STAT_LABEL[k]}</span>
                  <span className="gd-stat-v tnum">+{v}</span>
                  <span className="gd-bar" aria-hidden><span style={{ width: `${Math.min(100, (v / STAT_MAX[k]) * 100)}%` }} /></span>
                </li>
              );
            })}
          </ul>

          {item.perks?.length ? (
            <>
              <h3 className="gd-h">Perks</h3>
              <ul className="gd-perks">{item.perks.map((p) => <li key={p}>Equip: {p}</li>)}</ul>
            </>
          ) : null}

          {item.setName && (
            <div className="gd-set">
              <div className="gd-set-head">
                <span>{item.setName}</span>
                <span className="tnum">{owned}/{setPieces.length}</span>
              </div>
              <div className="setcard-pips" aria-hidden>
                {setPieces.map((p, i) => <span key={p.id} className={i < owned ? 'on' : ''} />)}
              </div>
              <ul className="gd-set-pieces" aria-label="Set pieces">
                {setPieces.map((p) => {
                  const has = equipped[p.slot]?.id === p.id;
                  return (
                    <li key={p.id} className={has ? 'on' : ''}>
                      <span className="gd-check" aria-hidden>{has ? '✓' : '○'}</span>
                      {p.name} <span className="gd-set-slot">{SLOT_LABELS[p.slot]}</span>
                      <span className="visually-hidden">{has ? ' (equipped)' : ' (not equipped)'}</span>
                    </li>
                  );
                })}
              </ul>
              {bonuses.map((b) => (
                <p key={b.pieces} className={`gd-bonus ${owned >= b.pieces ? 'on' : ''}`}>({b.pieces}) Set: {b.text}</p>
              ))}
            </div>
          )}

          {item.flavor && <p className="gd-flavor">“{item.flavor}”</p>}
          {item.price !== undefined && (
            <p className="gd-price">Card value <b className="tnum">{fmt(item.price)}</b> <span className="coin">◉</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mounted once per armory page. */
export function GearDetailHost({ canEdit }: { canEdit: boolean }) {
  const item = useUi((s) => s.detailItem);
  const showDetail = useUi((s) => s.showDetail);

  // clicks on gear pieces of the 3D model
  useEffect(() => useArmory.subscribe((s, prev) => {
    if (s.inspectNonce === prev.inspectNonce || !s.inspectSlot) return;
    const it = s.equipped[s.inspectSlot];
    if (it) useUi.getState().showDetail(it);
  }), []);
  // leaving the page closes it
  useEffect(() => () => useUi.getState().showDetail(undefined), []);

  if (!item) return null;
  const close = () => showDetail(undefined);
  const slotButton = () => document.querySelector<HTMLElement>(`[data-slot="${item.slot}"]`);
  const canSwap = Boolean(slotButton());
  const swap = () => {
    const slot = item.slot;
    close();
    requestAnimationFrame(() => {
      slotButton()?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      useUi.getState().openPicker(slot);
    });
  };

  return (
    <Modal
      open
      onClose={close}
      className="gear-modal"
      title={<span style={{ color: RARITY_TEXT[item.rarity] }}>{item.name}</span>}
      fallbackFocus={slotButton}
    >
      <GearDetailBody item={item} />
      <div className="gd-actions">
        {canSwap && (
          <button type="button" className="btn btn-ghost btn-lg" onClick={swap}>
            {canEdit ? 'Swap gear' : 'Try other gear'}
          </button>
        )}
        <button type="button" className="btn btn-primary btn-lg" onClick={close} data-autofocus>Done</button>
      </div>
    </Modal>
  );
}
