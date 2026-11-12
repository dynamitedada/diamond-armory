const { launch } = require('./cdp'); const fs = require('fs');
const S = '/tmp/claude-0/-home-user/39f70e04-e662-5239-9051-2ac83303db4e/scratchpad/';
(async () => { const p = await launch({}); await p.goto('http://127.0.0.1:5173/');
  for (let i = 0; i < 60; i++) await p.frame(false);
  await p.eval(`(async()=>{const {useArmory:A}=await import('/src/state/store.ts');A.getState().setAnimation('stance')})()`);
  for (const lab of ['Bat', 'Jersey', 'Glove', 'Cap', 'Eyewear', 'Cleats']) {
    const r = await p.eval(`(()=>{const e=document.querySelector('button[aria-label^="${lab}:"]');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
    await p.mouse('mouseMoved', r[0], r[1]); await p.mouse('mousePressed', r[0], r[1], { button: 'left', buttons: 1, clickCount: 1 }); await p.mouse('mouseReleased', r[0], r[1], { button: 'left', clickCount: 1 });
    for (let i = 0; i < 12; i++) await p.frame(false);
    const pr = await p.eval(`(()=>{const e=document.querySelector('.picker');const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]})()`);
    console.log(lab, 'slot', r.map(Math.round), 'picker', pr);
    fs.writeFileSync(S + `probe_${lab}.png`, await p.frame(true));
    await p.key('rawKeyDown', 'Escape', 'Escape', 27); await p.key('keyUp', 'Escape', 'Escape', 27); for (let i = 0; i < 6; i++) await p.frame(false);
  }
  await p.close(); })();
