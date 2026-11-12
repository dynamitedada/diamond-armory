// The shot list for the Diamond Armory promo. Run: node shots.js <name...>  (or "all")
const { shot } = require('./recorder');
const anim = (a) => `A.getState().setAnimation('${a}')`;
const equip = (id) => `A.getState().equip(C.find(i=>i.id==='${id}'))`;

const SHOTS = {
  // Page boot: loader -> stagger-in -> OVR count-up, slow push-in.
  boot: () => shot('boot', { warmup: 0, cursor: false, script: async (s) => {
    s.camSet(960, 540, 1.0); s.camTo(960, 520, 1.1, 5.5); await s.sec(5.5);
  } }),

  // Hero 3D close-up: slow orbit around the player.
  hero: () => shot('hero', { canvasDpr: 2.6, cursor: false, view: { cx: 960, cy: 520, s: 2.9 }, script: async (s) => {
    s.onFrame(() => s.cam3d(s.kf([[0, -0.9], [8, 0.9]], s.t), s.kf([[0, 7.0], [8, 6.3]], s.t)));
    await s.sec(8);
  } }),

  // Tooltips: helmet -> chain -> bat, camera follows.
  tooltips: () => shot('tooltips', { script: async (s) => {
    s.camSet(960, 540, 1);
    s.camTo(700, 440, 1.55, 1.2);
    await s.moveToSel(s.slot('Helmet'), 1.0, -40, 0); await s.sec(1.8);
    await s.moveToSel(s.slot('Chain'), 0.6, -40, 0); await s.sec(1.4);
    s.camTo(930, 690, 1.45, 1.0);
    await s.moveToSel(s.slot('Bat'), 0.9, 40, 0); await s.sec(2.2);
  } }),

  // Bat swap: stance pose, player panned right, arrow through bats live.
  batswap: () => shot('batswap', { canvasDpr: 2, setup: (p) => p.eval(`(async()=>{const {useArmory:A}=await import('/src/state/store.ts');A.getState().setAnimation('stance')})()`), script: async (s) => {
    let pan0 = s.t;
    s.onFrame(() => s.cam3d(-0.15, 6.2, s.kf([[pan0, 0], [pan0 + 1.2, -1.05]], s.t)));
    s.camSet(960, 560, 1.0); s.camTo(980, 600, 1.42, 1.4);
    await s.moveToSel(s.slot('Bat'), 1.0, 30, 0); await s.sec(0.2); await s.click(); await s.sec(0.6);
    for (let i = 0; i < 5; i++) { await s.key('ArrowDown'); await s.sec(0.75); }
    await s.key('ArrowUp'); await s.sec(0.45); await s.key('ArrowUp'); await s.sec(0.45); await s.key('ArrowUp'); await s.sec(0.45); await s.key('ArrowUp'); await s.sec(0.45); await s.key('ArrowUp'); await s.sec(0.5);
    await s.key('Enter'); await s.sec(0.5);
    await s.moveToText('.chip', 'Swing', 0.6); await s.click(); s.camTo(980, 560, 1.25, 1.0); await s.sec(2.6);
  } }),

  // Jersey swap: hover rows -> uniform recolours live; commit Home Whites.
  jersey: () => shot('jersey', { canvasDpr: 2, script: async (s) => {
    let pan0 = s.t;
    s.onFrame(() => s.cam3d(s.kf([[pan0, 0], [pan0 + 7, 0.35]], s.t), 6.0, s.kf([[pan0, 0], [pan0 + 1.2, -0.95]], s.t)));
    s.camSet(960, 540, 1.0); s.camTo(900, 560, 1.45, 1.3);
    await s.moveToSel(s.slot('Jersey'), 1.0, -20, 0); await s.sec(0.2); await s.click(); await s.sec(0.6);
    for (const name of ["'89 Throwback", 'Home Whites', 'Road Greys', 'Home Whites']) { await s.moveToText('.picker-row', name, 0.45); await s.sec(0.9); }
    await s.click(); await s.sec(0.4); await s.moveTo(1150, 700, 0.8); await s.sec(1.2);
  } }),

  // Glove swap: picker on the right, player panned left.
  glove: () => shot('glove', { canvasDpr: 2, script: async (s) => {
    let pan0 = s.t;
    s.onFrame(() => s.cam3d(s.kf([[pan0, 0], [pan0 + 6, -0.35]], s.t), 6.0, s.kf([[pan0, 0], [pan0 + 1.2, 1.0]], s.t)));
    s.camSet(960, 540, 1.0); s.camTo(1000, 600, 1.42, 1.3);
    await s.moveToSel(s.slot('Glove'), 1.0, -30, 0); await s.sec(0.2); await s.click(); await s.sec(0.5);
    for (const name of ['Platinum Web', 'Brick Wall', 'Warning Track', 'Platinum Web']) { await s.moveToText('.picker-row', name, 0.4); await s.sec(0.85); }
    await s.click(); await s.sec(1.4);
  } }),

  // Head & face: cap and eyewear swaps, tight on the head.
  headgear: () => shot('headgear', { canvasDpr: 2.4, script: async (s) => {
    let pan0 = s.t;
    s.onFrame(() => s.cam3d(0.1, 4.6, s.kf([[pan0, 0], [pan0 + 1.0, -0.75]], s.t)));
    s.camSet(960, 540, 1.0); s.camTo(820, 450, 1.55, 1.2);
    await s.moveToSel(s.slot('Cap'), 1.0, -20, 0); await s.click(); await s.sec(0.5);
    for (const name of ['Crown Heights', 'Sandlot', 'Crown Heights']) { await s.moveToText('.picker-row', name, 0.4); await s.sec(0.8); }
    await s.click(); await s.sec(0.4);
    await s.moveToSel(s.slot('Eyewear'), 0.6, -20, 0); await s.click(); await s.sec(0.5);
    for (const name of ['Neon Owl', 'Gold Rush', 'Classic Eye']) { await s.moveToText('.picker-row', name, 0.4); await s.sec(0.8); }
    await s.moveToText('.picker-row', 'Gold Rush', 0.4); await s.sec(0.3); await s.click(); await s.sec(1.2);
  } }),

  // Transformation: sandlot starter kit -> full pro loadout, OVR climbs.
  transform: () => shot('transform', { canvasDpr: 1.5, cursor: false,
    setup: (p) => p.eval(`(async()=>{const {useArmory:A}=await import('/src/state/store.ts');const {CATALOG:C}=await import('/src/data/items.ts');
      for (const id of ['helm-batting-practice','cap-sandlot','eye-blacks','jersey-road-grey','under-compression','bg-tacky','wb-terry','belt-team','pants-long','socks-crew','cleats-low','bat-ash-classic','glove-first','song-organ']) A.getState().equip(C.find(i=>i.id===id));
      A.getState().unequip('chain');})()`),
    script: async (s) => {
      s.camSet(960, 540, 1.0); s.camTo(960, 520, 1.06, 7.5);
      await s.sec(0.8);
      for (const id of ['bat-nitro-neon', 'jersey-midnight', 'chain-cuban', 'helm-night-owl', 'eye-neon-visor', 'cleats-night-owl', 'glove-gold', 'bg-night-owl', 'belt-championship', 'pants-midnight', 'socks-tiedye', 'song-synthwave']) {
        await s.store(equip(id)); await s.sec(0.5);
      }
      await s.store(anim('celebrate')); await s.sec(1.4);
    } }),

  // Animations: swing / celebrate / dance / flex with chip clicks.
  anims: () => shot('anims', { canvasDpr: 2.2, script: async (s) => {
    s.onFrame(() => s.cam3d(s.kf([[0, -0.25], [12, 0.25]], s.t), 6.4));
    s.camSet(960, 560, 1.0); s.camTo(960, 540, 1.6, 1.0);
    for (const [chip, hold] of [['Swing', 2.4], ['Celebrate', 2.6], ['Dance', 2.6], ['Flex', 2.4]]) {
      await s.moveToText('.chip', chip, 0.5); await s.click(); await s.sec(hold);
    }
  } }),

  // Stats: scroll to the panel, swap bat to show numbers move.
  stats: () => shot('stats', { canvasDpr: 1.5, cursor: false, script: async (s) => {
    s.camSet(960, 540, 1.0);
    const y0 = s.t; s.onFrame(() => s.eval(`window.scrollTo(0, ${s.kf([[y0, 0], [y0 + 1.2, 1]], s.t)} * (document.documentElement.scrollHeight - innerHeight))`));
    await s.sec(1.4);
    s.camTo(960, 760, 1.25, 0.8); await s.sec(0.8);
    await s.store(equip('bat-ash-classic') + ';' + equip('glove-first')); await s.sec(1.6);
    await s.store(equip('bat-nitro-neon') + ';' + equip('glove-gold')); await s.sec(2.0);
  } }),

  // Gear showcase page: slow orbit by dragging.
  gear: () => shot('gear', { url: '/gear-preview.html', canvasDpr: 1.5, cursor: false, warmup: 2, script: async (s) => {
    await s.p.mouse('mouseMoved', 700, 540); await s.p.mouse('mousePressed', 700, 540, { button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 0; i < 180; i++) { await s.p.mouse('mouseMoved', 700 + i * 2.2, 540 - Math.sin(i / 60) * 10, { button: 'left', buttons: 1 }); await s.rec(1); }
    await s.p.mouse('mouseReleased', 1096, 540, { button: 'left', clickCount: 1 });
  } }),

  // Outro plate: auto-rotate, pull back.
  outro: () => shot('outro', { canvasDpr: 1.5, cursor: false, script: async (s) => {
    s.onFrame(() => s.cam3d(s.t * 0.35, 6.71));
    s.camSet(960, 524, 1.25); s.camTo(960, 540, 1.0, 6); await s.sec(6);
  } }),
};

(async () => {
  const names = process.argv.slice(2);
  for (const n of names[0] === 'all' ? Object.keys(SHOTS) : names) await SHOTS[n]();
})();
