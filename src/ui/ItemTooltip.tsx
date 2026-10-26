import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Item, StatKey } from '../data/types';
import { CATALOG, SET_BONUSES, SLOT_LABELS } from '../data/items';
import { useArmory } from '../state/store';
import { PRIMARY_STATS, RARITY_TEXT, SECONDARY_STATS, STAT_LABEL, fmt, placeFloating, type Placement } from './theme';

function TooltipBody({ item, header }: { item: Item; header?: string }) {
  const equipped = useArmory((s) => s.equipped);
  const [kind, ...rest] = item.type.split(' · ');
  const detail = rest.join(' · ');
  const sameKind = kind.toLowerCase() === SLOT_LABELS[item.slot].toLowerCase();
  const statLine = (k: StatKey) => item.stats[k] ? (
    <div key={k} className="tt-stat">+{item.stats[k]} {STAT_LABEL[k]}</div>
  ) : null;

  const setPieces = item.setName ? CATALOG.filter((i) => i.setName === item.setName) : [];
  const owned = setPieces.filter((p) => equipped[p.slot]?.id === p.id).length;
  const bonuses = item.setName ? SET_BONUSES[item.setName] ?? [] : [];

  return (
    <div className="tt-body">
      {header && <div className="tt-header">{header}</div>}
      <div className="tt-name" style={{ color: RARITY_TEXT[item.rarity] }}>{item.name}</div>
      <div className="tt-ovr">OVR {item.ovr}</div>
      <div className="tt-sig">{item.setName ? `Signature: ${item.setName}` : item.rarity === 'common' || item.rarity === 'uncommon' ? 'Signature: Team-Issued' : 'Signature: Player Exclusive'}</div>
      <div className="tt-row"><span>{SLOT_LABELS[item.slot]}</span><span>{sameKind ? detail : kind}</span></div>
      {detail && !sameKind && <div className="tt-detail">{detail}</div>}
      <div className="tt-gap" />
      {PRIMARY_STATS.map(statLine)}
      <div className="tt-secondary">{SECONDARY_STATS.map(statLine)}</div>
      {item.perks?.map((p) => <div key={p} className="tt-perk">Equip: {p}</div>)}
      {item.setName && (
        <div className="tt-set">
          <div className="tt-set-name">{item.setName} ({owned}/{setPieces.length})</div>
          {setPieces.map((p) => (
            <div key={p.id} className={`tt-set-piece ${equipped[p.slot]?.id === p.id ? 'on' : ''}`}>{p.name}</div>
          ))}
          <div className="tt-gap" />
          {bonuses.map((b) => (
            <div key={b.pieces} className={`tt-set-bonus ${owned >= b.pieces ? 'on' : ''}`}>({b.pieces}) Set: {b.text}</div>
          ))}
        </div>
      )}
      {item.flavor && <div className="tt-flavor">"{item.flavor}"</div>}
      {item.price !== undefined && <div className="tt-price">Card Value: {fmt(item.price)} <span className="coin">◉</span></div>}
    </div>
  );
}

interface Props {
  item: Item;
  anchor: DOMRect;
  placement: Placement;
  /** When set, a "Currently Equipped" tooltip is rendered beside the main one. */
  compare?: Item;
}

export function ItemTooltip({ item, anchor, placement, compare }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos(placeFloating(anchor, width, height, placement));
  }, [anchor, placement, item, compare]);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className={`tooltip ${pos ? 'show' : ''}`}
      style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999 }}
    >
      <TooltipBody item={item} />
      {compare && compare.id !== item.id && <TooltipBody item={compare} header="Currently Equipped" />}
    </div>,
    document.body,
  );
}
