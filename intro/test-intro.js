// Tests the first-load intro on the built site (site/), served at its real paths.
//   node intro/test-intro.js [screenshot-dir]
const { chromium } = require('playwright');
const path = require('path');
const { wire } = require('../booking-form/tools/site-harness');
const OUT = process.argv[2];
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failed++; };
const state = p => p.evaluate(() => ({
  overlay: !!document.querySelector('.kdi'), on: document.documentElement.classList.contains('kd-intro-on'),
  lock: document.documentElement.classList.contains('kd-intro-lock'), seen: sessionStorage.getItem('kd-intro-seen')
}));

(async () => {
  const b = await chromium.launch();

  // 1. first visit plays at half speed (~5.2 s), then removes itself; 2. the next page in the visit has no intro
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); await wire(ctx, { bridge: false });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('https://www.kpidriver.com/', { waitUntil: 'domcontentloaded' });
    const t0 = Date.now();
    await p.waitForSelector('.kdi', { timeout: 5000 });
    const s1 = await state(p);
    check(s1.overlay && s1.lock && !s1.on && s1.seen === '1', 'first visit: intro covers the page, scroll locked, visit marked as seen');
    if (OUT) for (const t of [600, 1900, 2250, 3000, 4300]) { await p.waitForTimeout(Math.max(0, t - (Date.now() - t0))); await p.screenshot({ path: path.join(OUT, `live-${t}.png`) }); }
    await p.waitForSelector('.kdi', { state: 'detached', timeout: 9000 });
    const ms = Date.now() - t0, s2 = await state(p);
    check(ms > 4300 && ms < 6800, `first visit: plays for about 5 s at half speed (${(ms / 1000).toFixed(1)} s)`);
    check(!s2.overlay && !s2.lock && !s2.on, 'first visit: removes itself and gives scrolling back');
    check(errs.length === 0, 'first visit: no page errors ' + errs.join(' | '));
    await p.goto('https://www.kpidriver.com/services', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700);
    const s3 = await state(p);
    check(!s3.overlay && !s3.on, 'second page in the same visit: no intro, no cover');
    await ctx.close();
  }

  // 3. a tap skips straight to the reveal, without clicking what is underneath
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await wire(ctx, { bridge: false });
    const p = await ctx.newPage();
    await p.goto('https://www.kpidriver.com/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.kdi');
    await p.waitForTimeout(800);
    const before = p.url();
    await p.mouse.click(200, 420);
    await p.waitForSelector('.kdi', { state: 'detached', timeout: 1500 }).catch(() => {});
    const s = await state(p);
    check(!s.overlay && !s.lock, 'tap to skip: intro gone within 1.5 s, scrolling back');
    check(p.url() === before && !(await p.$('.kdb-dialog[open]')), 'tap to skip: nothing underneath was clicked');
    await ctx.close();
  }

  // 4. keyboard skip
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); await wire(ctx, { bridge: false });
    const p = await ctx.newPage();
    await p.goto('https://www.kpidriver.com/es', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.kdi');
    check((await p.textContent('.kdi__skip')) === 'Toca para saltar', 'Spanish pages: skip hint in Spanish');
    await p.keyboard.press('Escape');
    await p.waitForSelector('.kdi', { state: 'detached', timeout: 1500 }).catch(() => {});
    check(!(await state(p)).overlay, 'key press skips');
    await ctx.close();
  }

  // 5. reduced motion: short calm fade
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); await wire(ctx, { bridge: false });
    const p = await ctx.newPage(); const t0 = Date.now();
    await p.goto('https://www.kpidriver.com/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.kdi');
    await p.waitForSelector('.kdi', { state: 'detached', timeout: 4000 });
    check(Date.now() - t0 < 2600, `reduced motion: short fade (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    await ctx.close();
  }

  // 6. ?nointro and no-JS: no cover
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); await wire(ctx, { bridge: false });
    const p = await ctx.newPage();
    await p.goto('https://www.kpidriver.com/?nointro', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(600);
    check(!(await state(p)).overlay, '?nointro: no intro');
    await ctx.close();
    const ctx2 = await b.newContext({ javaScriptEnabled: false }); await wire(ctx2, { bridge: false });
    const p2 = await ctx2.newPage(); await p2.goto('https://www.kpidriver.com/');
    const covered = await p2.evaluate(() => document.documentElement.className).catch(() => '');
    check(!/kd-intro-on/.test(covered || ''), 'without JavaScript: no cover, the page shows normally');
    await ctx2.close();
  }

  await b.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
