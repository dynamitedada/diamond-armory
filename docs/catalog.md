# Real equipment catalog

Curated on November 10, 2026 against product/manufacturer collections. This is a recognizable-product starter catalog, **not a measured popularity ranking or live retail feed**. Records intentionally distinguish product families (e.g. A2000) from specific configurations (e.g. A1000 1786). Product years, sizes, league eligibility and availability must be checked at the linked source before purchase. We do not infer approval for a particular player's league from a category or certification string.

## Coverage and current rendering

| Category | Records | Working representation | Accurate branded asset |
| --- | ---: | --- | --- |
| Bats | 6 | Existing barrel geometry/material | Needed |
| Fielding gloves | 5 | Existing infield glove proxy | Needed; family-specific web/pattern not modeled |
| Batting gloves | 5 | Uniform hand-color material | Needed; no separate glove mesh |
| Helmets | 5 | Existing double-flap/C-flap proxy | Needed |
| Caps | 5 | Existing fitted/snapback proxy | Needed |
| Sunglasses | 5 | Existing wraparound proxy | Needed |
| Cleats | 5 | Existing low/mid cleat proxy | Needed; traction not product-specific |
| Elbow guards | 5 | Existing articulated guard proxy | Needed |
| Sliding mitts | 5 | New logo-free mitt stowed on hip | Needed; not worn over batting glove during swing |
| Leg guards | 5 | New shin attachment | Needed; extended/ankle variants not modeled |

Every record in `src/data/products.ts` carries manufacturer, model, category, specifications, reference URL, checked date, image provenance, representation mode and accurate-asset status. No licensed or accurate product meshes are included. Display colors are illustrative choices, not verified retail colorways. New equipment has neutral OVR 70 for compatibility with existing cosmetic card arithmetic and **no performance stat boosts, perks, prices or set bonuses**; it is not a product quality or safety rating.

Existing jerseys, base layers, wristbands, pants, socks, belts, chains and walk-up choices remain legacy fantasy cosmetics. They are explicitly labeled. This release expands the 10 equipment categories above; it does not claim a researched apparel or music catalog.

## Visual rights

`public/catalog/*.svg` are original, logo-free **category illustrations**, dedicated under CC0-1.0 in `public/catalog/LICENSE.txt`. They are not product photos. Each card links to an external manufacturer/product reference for real visual inspection. Most references are primary sources; the New Balance molded/youth configurations use the Baseball 360 retailer catalog. Referenced web images have **not** been copied, hotlinked or relicensed. No endorsement or affiliation is implied.

Before replacing an illustration or proxy with a photo/GLB, record the asset's source, permission/license, attribution requirements, exact model/SKU, and supported colorway/size. Only change an accurate-asset status after reviewing geometry and texture against that exact product. Keep generic badges when exact assets are unavailable.

## Compatibility and interaction

All 60 original records, IDs, visuals, stats and set bonuses remain intact in `LEGACY_CATALOG`. `CATALOG` includes them so existing profiles and shared links resolve without a destructive migration. Existing slots and profile API schema remain unchanged; `slidingMitt` and `legGuard` are additive keys in the existing JSON loadout map. Unknown IDs and wrong-slot IDs are still ignored by `resolveLoadout`.

New players default to real gear in the seven primary slots; apparel uses existing cosmetics. The picker prioritizes real equipment alphabetically, supports brand/model/spec search, retains the currently equipped legacy choice, and has an opt-in legacy list. Hover/arrow previews, Escape rollback, click/Enter equip, unequip, and bat swing trigger remain. Search inputs and reference links are exempt from global equip shortcuts. Reference/spec details are accessible in the picker, including on touch devices. New attachments follow existing bones without changes to animation controller code. The sliding mitt is stowed on the hip in all animations to avoid covering the fielding glove or interfering with two-hand bat IK; the leg proxy currently mounts on the left shin, without handedness-specific fitting.

## Validation

Run `npm ci`, `npm run test:catalog`, `npm run build`, and `npm run lint`.

The catalog regression check compares all original records against baseline commit `31bfdda`, verifies record counts, unique IDs, supported geometry variants, local image existence, HTTPS references, absence of fabricated product boosts, old/new JSON loadout round trips, invalid-ID handling, equip/unequip, unchanged animation state and GLB bone targets. It does not verify live external availability or visual fit.

Local production build and catalog checks pass. Lint passes with existing warnings. Browser visual/interaction QA remains pending: the connected browser was unavailable and the fallback browser could not reach the workspace preview server. Before merging, check desktop and mobile picker layout, keyboard search/Escape rollback, source links, old shared profiles, and all animations with the new attachments. No deployment is performed by this branch; merging main triggers the repository's existing Pages deployment.
