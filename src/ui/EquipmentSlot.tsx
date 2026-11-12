import { useRef, useState, type CSSProperties } from 'react';
import type { Item, Slot } from '../data/types';
import { SLOT_GLYPHS, SLOT_LABELS } from '../data/items';
import { useArmory } from '../state/store';
import { ItemTooltip } from './ItemTooltip';
import { SlotPicker } from './SlotPicker';
import { RARITY_COLOR, RARITY_TEXT, useUi, type Side } from './theme';

export function SlotIcon({ item, slot, size = 52 }: { item?: Item; slot: Slot; size?: number }) {
  const rarity = item?.rarity;
  return (
    <div
      className={`slot-icon ${item ? `r-${rarity}` : 'empty'}`}
      style={{ '--rc': item ? RARITY_COLOR[item.rarity] : '#3a3f52', width: size, height: size } as CSSProperties}
    >
      {item?.product ? <img width={size * 0.8} height={size * 0.8} src={`${import.meta.env.BASE_URL}${item.product.image.src}`} alt="" title="Generic category illustration" /> : <span className="slot-glyph" style={{ fontSize: size * 0.5 }}>{item ? item.icon : SLOT_GLYPHS[slot]}</span>}
      {item && !item.product && <span className="slot-ovr">{item.ovr}</span>}
    </div>
  );
}

interface Props { slot: Slot; side: Side; index: number }

export function EquipmentSlot({ slot, side, index }: Props) {
  const item = useArmory((s) => s.equipped[slot]);
  const setHovered = useArmory((s) => s.setHovered);
  const ready = useUi((s) => s.ready);
  const pickerOpen = useUi((s) => s.pickerSlot === slot);
  const openPicker = useUi((s) => s.openPicker);
  const inspectMode = useUi((s) => s.slotClick === 'inspect') && Boolean(item);
  const ref = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const placement = side === 'left' ? 'right' : side === 'right' ? 'left' : 'top';
  const kind = item?.type.split(' · ')[0];

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`slot slot-${side} ${ready ? 'in' : 'loading'} ${pickerOpen ? 'active' : ''}`}
        style={{ '--i': index } as CSSProperties}
        data-slot={slot}
        aria-haspopup={inspectMode ? 'dialog' : 'listbox'}
        aria-expanded={inspectMode ? undefined : pickerOpen}
        aria-label={`${SLOT_LABELS[slot]}: ${item ? item.name : 'empty'}`}
        onMouseEnter={() => { setAnchor(ref.current!.getBoundingClientRect()); setHovered(item); }}
        onMouseLeave={() => { setAnchor(null); setHovered(undefined); }}
        onFocus={() => setHovered(item)}
        onBlur={() => setHovered(undefined)}
        onClick={() => {
          setAnchor(null);
          if (inspectMode && item) {
            setHovered(undefined);
            useUi.getState().showDetail(item);
          } else openPicker(pickerOpen ? undefined : slot);
        }}
      >
        <SlotIcon item={item} slot={slot} />
        <span className="slot-label">
          <span className="slot-name" style={{ color: item ? RARITY_TEXT[item.rarity] : undefined }}>
            {item ? item.name : `Empty ${SLOT_LABELS[slot]}`}
          </span>
          <span className="slot-meta">
            {item ? <>{item.product ? "Generic 3D preview" : `Legacy cosmetic · OVR ${item.ovr}`} · {kind}</> : <>{SLOT_LABELS[slot]} · add gear</>}
          </span>
        </span>
      </button>
      {anchor && item && !pickerOpen && <ItemTooltip item={item} anchor={anchor} placement={placement} />}
      {pickerOpen && ref.current && <SlotPicker slot={slot} anchorEl={ref.current} placement={placement} />}
    </>
  );
}
