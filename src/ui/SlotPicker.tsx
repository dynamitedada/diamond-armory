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
  const [query, setQuery] = useState('');
  const [showLegacy, setShowLegacy] = useState(false);
  const allOptions = useMemo(() => optionsFor(slot), [slot]);
  const hasProducts = allOptions.some((it) => it.product);
  const options = useMemo(() => allOptions.filter((it) =>
    (!hasProducts || showLegacy || it.product || it.id === original?.id) &&
    `${it.name} ${it.type} ${Object.values(it.product?.specifications ?? {}).join(' ')}`.toLowerCase().includes(query.toLowerCase()),
  ).sort((a, b) => Number(Boolean(b.product)) - Number(Boolean(a.product)) || a.name.localeCompare(b.name)), [allOptions, hasProducts, showLegacy, original, query]);
  const rows: (Item | undefined)[] = useMemo(() => (original ? [...options, undefined] : options), [options, original]);

  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.id === original?.id)));
  const [tipFor, setTipFor] = useState<{ item: Item; rect: DOMRect } | null>(null);
  const committed = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const apply = (it: Item | undefined) => (it ? equip(it) : unequip(slot));
  const preview = (i: number, showTip: boolean) => {
    if (i < 0 || i >= rows.length) return;
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
    if (i < 0 || i >= rows.length) return;
    committed.current = true;
    apply(rows[i]);
    close();
    // "Pick your bat. Watch him swing."
    if (slot === 'bat' && rows[i]) useArmory.getState().setAnimation('swing');
    useUi.getState().bumpCommit();
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
    // close on real layout changes only (mobile browsers fire resize when their toolbars slide)
    let lastW = window.innerWidth;
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; close(); } };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onResize);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('resize', onResize); };
  }, [anchorEl]);

  // Keyboard handling lives on window so it works no matter where focus is.
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); anchorEl.focus(); }
    else if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLAnchorElement || e.target instanceof HTMLButtonElement) return;
    else if (!rows.length) return;
    else if (e.key === 'ArrowDown') { e.preventDefault(); preview((active + 1) % rows.length, true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); preview((active - 1 + rows.length) % rows.length, true); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(active); anchorEl.focus(); }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);

  const changeFilter = (change: () => void) => {
    apply(original); setHovered(undefined); setTipFor(null); setActive(0); change();
  };
  const selected = rows[active];
  const tipPlacement: Placement = placement === 'top' ? 'right' : placement;

  return createPortal(
    <>
      <div
        ref={ref}
        className={`picker ${pos ? 'show' : ''}`}
        style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999 }}
        tabIndex={-1}
        role="dialog"
        aria-label={`${SLOT_LABELS[slot]} equipment picker`}
      >
        <div className="picker-head">
          <span>{SLOT_LABELS[slot]}</span>
          <span className="picker-hint">↑↓ preview · ⏎ equip · ⇧ compare</span>
          <button type="button" className="picker-close" onClick={() => { close(); anchorEl.focus({ preventScroll: true }); }} aria-label="Close">Done</button>
        </div>
        <div className="catalog-controls">
          <input aria-label="Search equipment" placeholder="Search brand, model or spec…" value={query} onChange={(e) => changeFilter(() => setQuery(e.target.value))} />
          {hasProducts && <label><input type="checkbox" checked={showLegacy} onChange={(e) => changeFilter(() => setShowLegacy(e.target.checked))} /> Show legacy cosmetics</label>}
          <p className="catalog-note">{options.length} items · Original category illustrations. {hasProducts ? 'Generic previews; accurate branded 3D assets needed.' : 'Legacy fantasy cosmetics; game attributes only.'}</p>
        </div>
        <ul
          className="picker-list"
          role="listbox"
          tabIndex={0}
          aria-label={`${SLOT_LABELS[slot]} options`}
          aria-activedescendant={rows.length ? `opt-${slot}-${active}` : undefined}
          onMouseLeave={() => { apply(original); setHovered(undefined); setTipFor(null); }}
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
                    {it && <span className="picker-ovr">{it.product ? it.product.manufacturer : `Legacy cosmetic · OVR ${it.ovr}`}</span>}
                    {isCur ? <span className="dz">—</span> : deltas(it, original).slice(0, 4).map(({ k, d }) => (
                      <span key={k} className={d > 0 ? 'up' : 'down'}>{d > 0 ? '+' : ''}{d} {STAT_LABEL[k]}</span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
          {!rows.length && <li className="catalog-note">No equipment matches your search.</li>}
        </ul>
        {selected?.product && <div className="catalog-reference">
          <b>{selected.product.model}</b>
          <div>{Object.entries(selected.product.specifications).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
          <a href={selected.product.referenceUrl} target="_blank" rel="noopener noreferrer">Manufacturer / product reference ↗</a>
          <div>Checked {selected.product.verifiedOn} · {selected.product.representation === 'uniform-color' ? 'Uniform color preview' : 'Generic 3D preview'} · accurate asset needed</div>
        </div>}
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
