# Player Armory — UX spec (derived from WoW Armory / Wowhead / raider.io conventions)

## Layout (desktop, max-width ~1280px, dark)
- Header band over blurred team-color backdrop: avatar thumb, NAME (bold, colored by position), subline "Lv 27 · Shortstop · Bats R / Throws R", <Team> line, right side big OVR (counts up on load).
- Tabs under header: Overview · Stats · Career · Collections (only Overview needs to work).
- Stage, 3 columns: LEFT 7-8 slots (Helmet, Cap, Eyewear, Chain, Jersey, Undershirt, Wristband, Elbow Guard), CENTER 3D model (~55% width, ~600px tall), RIGHT slots (Batting Gloves, Belt, Pants, Socks, Cleats, Walk-up Song...). BOTTOM row centered under model: BAT, GLOVE (like main/off hand).
- Each slot: icon square + label facing the model (name in rarity color, then "OVR 88 · type" line). Left col labels right of icon, right col labels left of icon.
- Stats panel: Power, Contact, Speed, Arm, Fielding (primary) + Eye, Clutch, Swag; label/value/thin bar; totals derived from equipped items.
- Mobile: model on top (~55vh), slots 2-col grid, then stats.

## Slot visuals
- 52px square, 4px radius, 2px rarity border + inner shadow; epic+ get outer glow; legendary/mythic get animated shimmer sweep.
- Rarity colors: common #ffffff, uncommon #1eff00, rare #0070dd, epic #a335ee, legendary #ff8000, mythic #e6cc80.
- OVR badge bottom-right (black chip, white bold 11px). Empty slot = dimmed silhouette.
- Hover: border brightens, icon scale 1.05 over 120ms.

## Tooltip (order)
1 Name (rarity color, bold 15px) 2 "OVR 88" in #ffd100 3 "Signature: Team-Issued" (white) 4 Slot left / Type right row
5 Base stats white "+12 Power" 6 secondary stats green #1eff00 7 "Equip:" perks green 8 Set block: set name yellow, (2) Set: bonus 9 Flavor text gold italic in quotes 10 "Card Value: 1,250 ◉"
Style: bg rgba(4,8,22,0.94), 1px #4a4a5a border, radius 4, shadow 0 4px 16px #000a, padding 10px, max-width 320px, 12-13px sans, line-height 1.35.
Position: anchored to the side of the slot facing the model, 12px offset, tops aligned; flip/clamp to viewport. Enter: 100ms fade + translateY(4px)->0; leave: instant hide. Shift held: show comparison tooltip of equipped item when hovering dropdown options.

## Click → dropdown/picker
Click slot box opens a picker popover listing all catalog options for that slot (icon, name in rarity color, OVR, stat deltas vs equipped in green/red). Hovering an option shows its tooltip AND live-previews it on the 3D model; clicking equips; Esc/click-outside closes and reverts preview. Keyboard navigable.

## Model viewer
Drag-rotate Y with damping, vertical limited ±15°, wheel/pinch zoom clamped (full body ↔ torso close-up), optional slow auto-rotate that pauses on interaction. Toolbar: reset view, auto-rotate toggle, screenshot. Animation picker chips: Idle, Stance, Swing, Bunt, Celebrate, Dance, Flex, Walk. Hovered slot → item highlighted on model (rim pulse). Scene: dusk ballpark vibe, radial gradient + bokeh stadium lights, soft contact shadow, key/warm rim/cool fill.

## Premium feel
Skeleton shimmer on load, model fade-in, items stagger 30ms, ease-out 150-250ms everywhere, no layout jumps (fixed slot sizes), tabular-nums for stats, subtle noise texture, gold accent rules.

## Mapping
Item level→OVR, Class→Position, Spec→Role (Power Hitter/Leadoff), Guild→Team, Weapons→Bat/Glove, Enchant→Treatment (Pine Tar), Set bonus→Signature collection, Sell price→Card value.
