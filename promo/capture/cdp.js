// Minimal raw-CDP driver for chrome-headless-shell with BeginFrame control.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SHELL = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

async function launch({ width = 1920, height = 1080, dpr = 1, port = 9333 + Math.floor(Math.random() * 500) } = {}) {
  const userDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'da-chrome-'));
  const proc = spawn(SHELL, [
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`,
    '--deterministic-mode', '--enable-begin-frame-control', '--run-all-compositor-stages-before-draw',
    '--disable-threaded-animation', '--disable-threaded-scrolling', '--disable-checker-imaging',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--hide-scrollbars', '--font-render-hinting=none', '--force-color-profile=srgb', '--no-sandbox',
    `--window-size=${width},${height}`, `--force-device-scale-factor=${dpr}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let wsUrl;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch {}
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej, method } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result);
    } else if (m.method) listeners.forEach((l) => l(m));
  });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej, method });
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', width, height, enableBeginFrameControl: true });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  listeners.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning'))
      console.log('[page]', m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
    if (m.method === 'Runtime.exceptionThrown') console.log('[page-ex]', m.params.exceptionDetails.exception?.description?.slice(0, 300));
  });
  await s('Runtime.enable');
  await s('Page.enable');
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  await s('Page.addScriptToEvaluateOnNewDocument', { source: fs.readFileSync(path.join(__dirname, 'vclock.js'), 'utf8') });

  const mono = () => Number(process.hrtime.bigint() / 1000n) / 1000; // CLOCK_MONOTONIC ms == Chrome TimeTicks
  let frameTicks = mono(); // BeginFrame time; must not lag the document timeline origin
  const page = {
    send: s,
    async eval(expr) {
      const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    },
    async goto(url) {
      // Navigation needs frames to progress; pump no-screenshot frames until load fires.
      let loaded = false;
      const l = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') loaded = true; };
      listeners.push(l);
      await s('Page.navigate', { url });
      frameTicks = Math.max(frameTicks, mono());
      for (let i = 0; i < 600 && !loaded; i++) { frameTicks = Math.max(frameTicks, mono()); await page.frame(false, 0); await new Promise((r) => setTimeout(r, 30)); }
    },
    /** Advance virtual time by dt ms and produce one frame (optionally returning PNG/JPEG bytes). */
    async frame(shot = true, dt = 1000 / 30, format = 'png') {
      if (dt > 0) await page.eval(`window.__vtAdvance && window.__vtAdvance(${dt})`).catch(() => {});
      frameTicks += dt > 0 ? dt : 1;
      const r = await s('HeadlessExperimental.beginFrame', {
        frameTimeTicks: frameTicks, interval: dt > 0 ? dt : 16.666,
        noDisplayUpdates: false, ...(shot ? { screenshot: { format, quality: 95, optimizeForSpeed: false } } : {}),
      });
      return r.screenshotData ? Buffer.from(r.screenshotData, 'base64') : null;
    },
    async mouse(type, x, y, extra = {}) {
      await s('Input.dispatchMouseEvent', { type, x, y, button: extra.button ?? 'none', buttons: extra.buttons ?? 0, clickCount: extra.clickCount ?? 0, deltaX: extra.deltaX ?? 0, deltaY: extra.deltaY ?? 0 });
    },
    async key(type, key, code, keyCode) { await s('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode }); },
    async close() { try { ws.close(); } catch {} proc.kill('SIGKILL'); fs.rmSync(userDir, { recursive: true, force: true }); },
  };
  return page;
}
module.exports = { launch };
