// Two follow-up checks on a published site: is the page error there without the intro too,
// and how long does the reduced-motion fade take once the intro is on screen.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'https://kpidriver.webflow.io';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/?nointro&v=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  console.log('page errors WITHOUT the intro:', JSON.stringify(errs), '| intro present:', !!(await p.$('.kdi')));
  await ctx.close();
  const rctx = await b.newContext({ reducedMotion: 'reduce' }); const r = await rctx.newPage();
  await r.goto(BASE + '/?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await r.waitForSelector('.kdi'); const t0 = Date.now();
  await r.waitForSelector('.kdi', { state: 'detached', timeout: 5000 });
  console.log('reduced motion, from intro on screen to gone:', ((Date.now() - t0) / 1000).toFixed(2), 's');
  await b.close();
})();
