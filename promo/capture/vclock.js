// Injected before any page script: virtual clock so every frame advances exactly 1/FPS
// regardless of how slowly the software GPU renders.
(() => {
  let vt = 0;
  const realNow = performance.now.bind(performance);
  const t0Date = 1761494400000; // fixed epoch for determinism
  const timers = new Map();
  let nextId = 1;
  performance.now = () => vt;
  const RD = Date;
  class VDate extends RD {
    constructor(...a) { if (a.length === 0) super(t0Date + vt); else super(...a); }
    static now() { return t0Date + vt; }
  }
  window.Date = VDate;
  window.setTimeout = (fn, ms = 0, ...args) => { const id = nextId++; timers.set(id, { at: vt + Math.max(0, +ms || 0), fn, args }); return id; };
  window.setInterval = (fn, ms = 0, ...args) => { const id = nextId++; timers.set(id, { at: vt + Math.max(1, +ms || 0), fn, args, every: Math.max(1, +ms || 0) }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  const rAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => rAF(() => cb(vt));
  window.__vtAdvance = (dt) => {
    const target = vt + dt;
    for (;;) {
      let best = null, bid = 0;
      for (const [id, t] of timers) if (t.at <= target && (!best || t.at < best.at)) { best = t; bid = id; }
      if (!best) break;
      vt = Math.max(vt, best.at);
      if (best.every) best.at += best.every; else timers.delete(bid);
      try { typeof best.fn === 'function' ? best.fn(...best.args) : 0; } catch (e) { console.error(e); }
    }
    vt = target;
    return vt;
  };
  window.__vtNow = () => vt;
})();
