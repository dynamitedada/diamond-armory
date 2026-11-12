// Shot recorder: drives the real Diamond Armory page frame-by-frame and pipes frames to ffmpeg.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { launch } = require('./cdp');

const BASE = process.env.DA_URL || 'http://127.0.0.1:5173';
const FPS = 30;
const OUT = path.join(__dirname, '..', 'footage');

const CURSOR_JS = `(() => {
  if (window.__cur) return;
  const c = document.createElement('div');
  c.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2.5l15.5 9.2-6.6 1.6 3.9 7.3-2.9 1.5-3.8-7.4-5 4.6z" fill="#fff" stroke="#0b0d18" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-9999px,-9999px)', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.55))', transition: 'none' });
  const ring = document.createElement('div');
  Object.assign(ring.style, { position: 'fixed', left: '0', top: '0', width: '56px', height: '56px', marginLeft: '-28px', marginTop: '-28px', borderRadius: '50%', border: '3px solid #ffd100', zIndex: 2147483646, pointerEvents: 'none', opacity: '0', transform: 'scale(.2)' });
  document.documentElement.append(ring, c);
  window.__cur = { set(x, y) { c.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 3) + 'px)'; ring.style.left = x + 'px'; ring.style.top = y + 'px'; },
    hide() { c.style.transform = 'translate(-9999px,-9999px)'; },
    click() { ring.animate([{ opacity: 1, transform: 'scale(.25)' }, { opacity: 0, transform: 'scale(1.25)' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }); } };
})()`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function shot(name, { width = 1920, height = 1080, dpr = 1, canvasDpr = 1.5, url = '/', warmup = 2.2, setup, script, cursor = true, view }) {
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const p = await launch({ width, height, dpr });
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window,'devicePixelRatio',{get:()=>${canvasDpr}})` });
  await p.goto(BASE + url);
  // Virtual camera = visual-viewport override (crisp re-raster, invisible to page layout).
  let cam = { x: 0, y: 0, s: 1 }; // top-left in page px + scale
  let camTween = null; let applied = '';
  const applyCam = async () => {
    if (camTween) {
      const { from, to, n } = camTween; camTween.i++; const k = ease(Math.min(1, camTween.i / n));
      const ls = Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * k; const sc = Math.exp(ls);
      // interpolate the view centre so zooms feel like a camera, not a slide
      const fc = { x: from.x + width / from.s / 2, y: from.y + height / from.s / 2 }, tc = { x: to.x + width / to.s / 2, y: to.y + height / to.s / 2 };
      const cx = fc.x + (tc.x - fc.x) * k, cy = fc.y + (tc.y - fc.y) * k;
      cam = { x: cx - width / sc / 2, y: cy - height / sc / 2, s: sc };
      if (camTween.i >= n) camTween = null;
    }
    const key = `${cam.x.toFixed(2)},${cam.y.toFixed(2)},${cam.s.toFixed(4)}`;
    if (key === applied) return; applied = key;
    const params = { width, height, deviceScaleFactor: dpr, mobile: false };
    if (cam.s !== 1 || cam.x || cam.y) params.viewport = { x: cam.x, y: cam.y, width: width / cam.s, height: height / cam.s, scale: cam.s };
    await p.send('Emulation.setDeviceMetricsOverride', params);
  };
  if (setup) await setup(p);
  // warm-up frames (not recorded) so the page settles (loader, stagger-in), unless warmup=0
  for (let i = 0; i < Math.round(warmup * FPS); i++) await p.frame(false);
  if (cursor) await p.eval(CURSOR_JS);
  if (view) { cam = { x: view.cx - width / view.s / 2, y: view.cy - height / view.s / 2, s: view.s }; }
  await applyCam();
  const file = path.join(OUT, `${name}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  let frames = 0; let perFrame = null;
  let mx = width / 2, my = height + 40;
  const rec = async (n = 1) => { for (let i = 0; i < n; i++) { if (perFrame) await perFrame(); await applyCam(); const b = await p.frame(true); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)); frames++; } };
  const toScreen = (x, y) => [x, y]; // CDP input stays in layout coords even with the viewport override
  const api = {
    /** tween the virtual camera; region given by centre (cx, cy) in page px and zoom s */
    camTo(cx, cy, sc, secs = 1) { const to = { x: cx - width / sc / 2, y: cy - height / sc / 2, s: sc }; camTween = { from: { ...cam }, to, n: Math.max(1, Math.round(secs * FPS)), i: 0 }; },
    camSet(cx, cy, sc) { camTween = null; cam = { x: cx - width / sc / 2, y: cy - height / sc / 2, s: sc }; },
    onFrame(fn) { perFrame = fn; },
    get mouse() { return { x: mx, y: my }; },
    p, rec,
    sec: (s) => rec(Math.round(s * FPS)),
    eval: (e) => p.eval(e),
    store: (expr) => p.eval(`(async()=>{const {useArmory:A}=await import('/src/state/store.ts');const {useUi:U}=await import('/src/ui/theme.ts');const {CATALOG:C}=await import('/src/data/items.ts');${expr}})()`),
    rect: (sel) => p.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,l:r.x,t:r.y}})()`),
    async moveTo(x, y, secs = 0.6) {
      const n = Math.max(1, Math.round(secs * FPS)); const sx = mx, sy = my;
      // slight arc so the motion reads as a human hand
      const nx = -(y - sy), ny = x - sx, len = Math.hypot(nx, ny) || 1, bow = Math.min(60, len * 0.08);
      for (let i = 1; i <= n; i++) {
        const k = ease(i / n), b = Math.sin(Math.PI * k) * bow;
        mx = sx + (x - sx) * k + (nx / len) * b; my = sy + (y - sy) * k + (ny / len) * b;
        await p.mouse('mouseMoved', ...toScreen(mx, my)); if (cursor) await p.eval(`__cur.set(${mx},${my})`); await rec(1);
      }
    },
    async moveToSel(sel, secs = 0.6, dx = 0, dy = 0) { const r = await api.rect(sel); if (!r) throw new Error('no ' + sel); await api.moveTo(r.x + dx, r.y + dy, secs); return r; },
    async click() {
      await p.mouse('mousePressed', ...toScreen(mx, my), { button: 'left', buttons: 1, clickCount: 1 }); if (cursor) await p.eval('__cur.click()');
      await rec(2); await p.mouse('mouseReleased', ...toScreen(mx, my), { button: 'left', buttons: 0, clickCount: 1 }); await rec(1);
    },
    async key(k, hold = 0) {
      const codes = { ArrowDown: ['ArrowDown', 40], ArrowUp: ['ArrowUp', 38], Enter: ['Enter', 13], Escape: ['Escape', 27], Shift: ['ShiftLeft', 16] };
      const [code, kc] = codes[k];
      await p.key('rawKeyDown', k, code, kc); if (k === 'Enter') await p.send('Input.dispatchKeyEvent', { type: 'char', text: '\r', key: 'Enter', code, windowsVirtualKeyCode: 13 });
      if (hold) await api.sec(hold); await p.key('keyUp', k, code, kc);
    },
    keyDown: (k) => p.key('rawKeyDown', k, k === 'Shift' ? 'ShiftLeft' : k, k === 'Shift' ? 16 : 0),
    keyUp: (k) => p.key('keyUp', k, k === 'Shift' ? 'ShiftLeft' : k, k === 'Shift' ? 16 : 0),
    rectText: (sel, text) => p.eval(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(e=>e.textContent.trim().includes(${JSON.stringify(text)}));if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,l:r.x,t:r.y}})()`),
    async moveToText(sel, text, secs = 0.6) { const r = await api.rectText(sel, text); if (!r) throw new Error('no ' + text); await api.moveTo(r.x, r.y, secs); return r; },
    slot: (label) => `button[aria-label^="${label}:"]`,
    hideCursor: () => p.eval('__cur && __cur.hide()'),
    /** orbit camera to azimuth (rad, 0 = default) & distance, used once per frame */
    /** place the 3D orbit camera: az (rad offset from default), horizontal distance, sideways pan (world x) */
    cam3d: (az, dist = 6.71, pan = 0) => p.eval(`(()=>{const c=window.__daControls;if(!c)return;const o=c.object,t=c.target;t.x=${pan};t.z=0;const a=0.2178+${az};o.position.set(t.x+Math.sin(a)*${dist},t.y+0.47*${dist}/6.71,t.z+Math.cos(a)*${dist});c.update();})()`),
    /** tween helper: returns value at frame for a keyframe list [[sec, val], ...] with easing */
    kf: (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0)); } return keys[keys.length - 1][1]; },
    get t() { return frames / FPS; },
  };
  try { await script(api); } finally {
    ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await p.close();
  }
  console.log(`[${name}] ${frames} frames (${(frames / FPS).toFixed(1)}s) in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${file}`);
}
module.exports = { shot, FPS };
