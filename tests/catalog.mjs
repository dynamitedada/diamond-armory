import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
import ts from 'typescript';

// Exercise the actual TS modules, including profile serialization and the Zustand store.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { CATALOG, LEGACY_CATALOG, DEFAULT_LOADOUT, SLOT_LABELS } = await server.ssrLoadModule('/src/data/items.ts');
  const { REAL_PRODUCTS } = await server.ssrLoadModule('/src/data/products.ts');
  const { VARIANTS } = await server.ssrLoadModule('/src/data/types.ts');
  const { resolveLoadout, loadoutIds } = await server.ssrLoadModule('/src/lib/profile.ts');
  const { useArmory, optionsFor } = await server.ssrLoadModule('/src/state/store.ts');
  const { SOCKETS } = await server.ssrLoadModule('/src/scene/sockets.ts');
  assert.equal(new Set(CATALOG.map((p) => p.id)).size, CATALOG.length);
  const slots = [...new Set(REAL_PRODUCTS.map((p) => p.slot))];
  assert.equal(slots.length, 10);
  for (const slot of slots) {
    const products = REAL_PRODUCTS.filter((p) => p.slot === slot);
    assert.ok(products.length >= 5 && products.length <= 20, slot);
    assert.ok(SLOT_LABELS[slot]);
    assert.ok(optionsFor(slot).some((p) => p.product));
  }
  for (const item of REAL_PRODUCTS) {
    assert.equal(item.product.category, item.slot);
    assert.ok(item.product.manufacturer && item.product.model);
    assert.ok(Object.keys(item.product.specifications).length);
    assert.equal(new URL(item.product.referenceUrl).protocol, 'https:');
    assert.ok(existsSync(`public/${item.product.image.src}`));
    assert.equal(item.product.accurateAsset, 'needed');
    assert.deepEqual(item.stats, {}, 'No invented performance boosts for real equipment');
    if (VARIANTS[item.slot]) assert.ok(VARIANTS[item.slot].includes(item.visual.variant), item.id);
  }
  // Frozen original catalog: all IDs, visuals and gameplay data remain resolvable.
  const original = execFileSync('git', ['show', '31bfdda:src/data/items.ts'], { encoding: 'utf8' });
  const baseline = {};
  new Function('exports', ts.transpileModule(original, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(baseline);
  const ids = baseline.CATALOG.map((p) => p.id);
  assert.deepEqual(LEGACY_CATALOG, baseline.CATALOG, 'Preserve original visuals, stats and IDs');
  assert.equal(LEGACY_CATALOG.length, ids.length);
  for (const id of ids) {
    const item = CATALOG.find((p) => p.id === id);
    assert.ok(item?.legacy, id);
    const saved = { [item.slot]: id };
    assert.deepEqual(loadoutIds(resolveLoadout(JSON.parse(JSON.stringify(saved)))), saved);
  }
  for (const id of DEFAULT_LOADOUT) assert.ok(CATALOG.some((p) => p.id === id));
  assert.deepEqual(resolveLoadout({ bat: 'unknown', glove: REAL_PRODUCTS[0].id }), {});
  const state = useArmory.getState();
  state.setAnimation('swing');
  const nonce = useArmory.getState().animationNonce;
  for (const slot of ['slidingMitt', 'legGuard']) {
    assert.ok(SOCKETS[slot]);
    const item = REAL_PRODUCTS.find((p) => p.slot === slot);
    state.equip(item);
    const saved = loadoutIds(useArmory.getState().equipped);
    state.setLoadout(JSON.parse(JSON.stringify(saved)));
    assert.equal(useArmory.getState().equipped[slot].id, item.id);
    state.unequip(slot);
    assert.equal(useArmory.getState().equipped[slot], undefined);
  }
  assert.equal(useArmory.getState().animation, 'swing');
  assert.equal(useArmory.getState().animationNonce, nonce);
  // Both new sockets must target actual bones in the existing GLB.
  const glb = readFileSync('public/models/Knight.glb');
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
  for (const slot of ['slidingMitt', 'legGuard']) assert.ok(gltf.nodes.some((n) => n.name?.replaceAll('.', '') === SOCKETS[slot].bone));
  console.log(`PASS: ${REAL_PRODUCTS.length} products / ${slots.length} categories; ${ids.length} legacy IDs; profile round trips; attachments; animation state`);
} finally { await server.close(); }
