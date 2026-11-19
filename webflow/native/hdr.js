const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
for (const w of [1440, 390]) { const out = [];
 for (const u of ['https://www.kpidriver.com/', 'https://kpidriver.webflow.io/kd-native-pilot']) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } }); await p.route(/kd-booking-5\.js|kd-intro-1\.js/, r => r.abort());
  await p.goto(u + '?v=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(1500);
  out.push(await p.evaluate(() => { const h = document.querySelector('.site-header'), m = document.querySelector('main'), f = document.querySelector('.site-footer'); const r = e => e ? [Math.round(e.getBoundingClientRect().top + scrollY), Math.round(e.offsetHeight)].join('/') : '-'; return 'header ' + r(h) + ' main ' + r(m) + ' footer ' + r(f) + ' docH ' + document.documentElement.scrollHeight; }));
  await p.close(); }
 console.log(w, out.join('  |  ')); }
await b.close(); })();
