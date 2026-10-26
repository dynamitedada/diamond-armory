# Diamond Armory

A WoW-Armory-style player page for baseball. A rotatable, animated 3D caricature player in the middle, gear slots around it; hover a slot for its tooltip, click it to pick another item (live preview on the model).

## Run
    npm install
    npm run dev        # http://localhost:5173
    npm run build      # production build in dist/
    # gear showcase: http://localhost:5173/gear-preview.html

## Stack
- React 19 + Vite + TypeScript; the zustand store (`src/state/store.ts`) is the single contract between UI and 3D.
- three.js via React Three Fiber + drei. The 3D viewer is lazy-loaded (UI shell ~82 KB gzip).
- Character: KayKit Adventurers "Knight" (CC0), re-skinned into a uniform by a vertex-tagged shader (`src/scene/character.ts`, `outfit.ts`).
- Gear: procedural parametric models (`src/scene/gear/`) attached to bone sockets (`sockets.ts`). The bat sits on `handslot.r`, so every animation uses the equipped bat.
- Animations: stock clips + a custom keyframed batting rig with two-hand IK (`animations.ts`, `proceduralRig.ts`, `ik.ts`).

## Layout
- `src/data/` – types contract + item catalog
- `src/ui/` – header, slots, tooltips, picker, stats, animation bar
- `src/scene/` – viewer, character, outfit, sockets, animations, stage, camera
- `docs/ux-spec.md` – UX spec derived from the WoW armory

## Production path
Commission a stylized big-head character in Blender on a Mixamo-named skeleton with `handslot`/`LeftGrip` sockets and modular skinned uniform pieces; author or mocap baseball clips (stance, swing, bat flip, dance) into one meshopt-compressed `anims.glb`; author gear as GLBs with grip-centered pivots; use KTX2 textures; keep the total download under ~5 MB. Ready Player Me is not an option (shut down Jan 2026).
