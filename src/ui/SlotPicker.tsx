import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Item, Slot, StatKey } from '../data/types';
import { SLOT_LABELS } from '../data/items';
import { optionsFor, useArmory } from '../state/store';
import { ItemTooltip } from './ItemTooltip';
import { SlotIcon } from './EquipmentSlot';
import { ALL_STATS, RARITY_TEXT, STAT_LABEL, placeFloating, useShiftKey, useUi, type Placement } from './theme';

interface Props { slot: Slot; anchorEl: HTMLElement; placement: Placement }

function deltas(next: Item | undefined, cur: Item | undefined) {
  const out: { k: StatKey; d: number }[] = [];
  for (const k of ALL_STATS) {
    const d = (next?.stats[k] ?? 0) - (cur?.stats[k] ?? 0);
    if (d) out.push({ k, d });
  }
  return out.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
}

export function SlotPicker({ slot, anchorEl, placement }: Props) {
  const equip = useArmory((s) => s.equip);
  const unequip = useArmory((s) => s.unequip);
  const setHovered = useArmory((s) => s.setHovered);
  const openPicker = useUi((s) => s.openPicker);
  const shift = useShiftKey();

  // Snapshot what was equipped when the picker opened; previews are reverted to this.
  const [original] = useState<Item | undefined>(() => useArmory.getState().equipped[slot]);
  const options = useMemo(() => [...optionsFor(slot)].sort((a, b) => b.ovr - a.ovr), [slot]);
  const rows: (Item | undefined)[] = useMemo(() => (original ? [...options, undefined] : options), [options, original]);

  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.id === original?.id)));
  const [tipFor, setTipFor] = useState<{ item: Item; rect: DOMRect } | null>(null);
  const committed = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const apply = (it: Item | undefined) => (it ? equip(it) : unequip(slot));
  const preview = (i: number, showTip: boolean) => {
    setActive(i);
    const it = rows[i];
    apply(it);
    setHovered(it);
    const el = rowRefs.current[i];
    const box = ref.current?.getBoundingClientRect();
    if (showTip && it && el && box) {
      const r = el.getBoundingClientRect();
      setTipFor({ item: it, rect: new DOMRect(box.left, r.top, box.width, r.height) });
    } else setTipFor(null);
  };
  const close = () => openPicker(undefined);
  const commit = (i: number) => {
    committed.current = true;
    apply(rows[i]);
    close();
  };

  // Revert preview on close-without-choosing.
  useEffect(() => () => {
    if (!committed.current) {
      if (original) useArmory.getState().equip(original);
      else useArmory.getState().unequip(slot);
    }
    useArmory.getState().setHovered(undefined);
  }, [original, slot]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(placeFloating(anchorEl.getBoundingClientRect(), r.width, r.height, placement, 10));
  }, [anchorEl, placement]);
  useEffect(() => { if (pos) ref.current?.focus({ preventScroll: true }); }, [pos]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorEl.contains(t)) return;
      close();
    };
    const onScroll = () => close();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onScroll);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('resize', onScroll); };
  }, [anchorEl]);

  // Keyboard handling lives on window so it works no matter where focus is.
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); anchorEl.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); preview((active + 1) % rows.length, true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); preview((active - 1 + rows.length) % rows.length, true); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(active); anchorEl.focus(); }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);

  const tipPlacement: Placement = placement === 'top' ? 'right' : placement;

  return createPortal(
    <>
      <div
        ref={ref}
        className={`picker ${pos ? 'show' : ''}`}
        style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999 }}
        tabIndex={-1}
        role="listbox"
        aria-label={`${SLOT_LABELS[slot]} options`}
        aria-activedescendant={`opt-${slot}-${active}`}
      >
        <div className="picker-head">
          <span>{SLOT_LABELS[slot]}</span>
          <span className="picker-hint">↑↓ preview · ⏎ equip · ⇧ compare</span>
        </div>
        <ul
          className="picker-list"
          onMouseLeave={() => { apply(original); setHovered(undefined); setTipFor(null); setActive(Math.max(0, rows.indexOf(original))); }}
        >
          {rows.map((it, i) => {
            const isCur = it?.id === original?.id;
            return (
              <li
                key={it?.id ?? 'none'}
                id={`opt-${slot}-${i}`}
                ref={(el) => { rowRefs.current[i] = el; }}
                role="option"
                aria-selected={i === active}
                className={`picker-row ${i === active ? 'active' : ''} ${isCur ? 'current' : ''}`}
                onMouseEnter={() => preview(i, true)}
                onClick={() => commit(i)}
              >
                {it ? <SlotIcon item={it} slot={slot} size={38} /> : <SlotIcon slot={slot} size={38} />}
                <div className="picker-info">
                  <div className="picker-name" style={{ color: it ? RARITY_TEXT[it.rarity] : '#8a90a6' }}>
                    {it ? it.name : 'Unequip'}
                    {isCur && <span className="picker-eq">EQUIPPED</span>}
                  </div>
                  <div className="picker-deltas">
                    {it && <span className="picker-ovr">OVR {it.ovr}</span>}
                    {isCur ? <span className="dz">—</span> : deltas(it, original).slice(0, 4).map(({ k, d }) => (
                      <span key={k} className={d > 0 ? 'up' : 'down'}>{d > 0 ? '+' : ''}{d} {STAT_LABEL[k]}</span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {tipFor && (
        <ItemTooltip
          key={tipFor.item.id}
          item={tipFor.item}
          anchor={tipFor.rect}
          placement={tipPlacement}
          compare={shift ? original : undefined}
        />
      )}
    </>,
    document.body,
  );
}
