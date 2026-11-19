// Computed-style diff of native sections on the staging pilot vs the same sections on live Home.
// usage: node secdiff.js 0,1,2   (section indexes inside main)
const { chromium } = require('playwright');
const idx = process.argv[2].split(',').map(Number);
const PROPS = ['display', 'position', 'width', 'height', 'margin-top', 'margin-bottom', 'padding-top', 'padding-bottom', 'padding-left', 'color', 'background-color', 'background-image', 'border-top-width', 'border-top-color', 'border-radius', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'opacity', 'gap', 'grid-template-columns', 'flex-direction', 'justify-content', 'align-items', 'box-shadow'];
const snap = (page, sel, idx) => page.evaluate(([sel, idx, PROPS]) => {
  const secs = [...document.querySelector(sel).children].filter(e => e.tagName === 'SECTION');
  const out = {};
  idx.forEach(i => {
    const walk = (el, path) => {
      const cs = getComputedStyle(el); out[path] = PROPS.map(p => cs.getPropertyValue(p)).join('|');
      [...el.children].forEach((k, n) => walk(k, path + '>' + k.tagName.toLowerCase() + ':' + n));
    };
    if (secs[i]) walk(secs[i], 's' + i);
  });
  return out;
}, [sel, idx, PROPS]);
(async () => {
  const b = await chromium.launch(); let tot = 0, dif = 0; const ex = [];
  for (const w of [1440, 820, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' }); await p.route(/kd-booking-5\.js|kd-intro-1\.js/, r => r.abort());
    await p.goto('https://www.kpidriver.com/?v=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const live = await snap(p, 'main#main', idx);
    await p.goto('https://kpidriver.webflow.io/kd-native-pilot?v=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const nat = await snap(p, 'main.kd-main', idx);
    for (const k of new Set([...Object.keys(live), ...Object.keys(nat)])) { tot++; if (live[k] !== nat[k]) { dif++; if (ex.length < 10) { const a = (live[k] || '').split('|'), c = (nat[k] || '').split('|'); ex.push(`${w} ${k.slice(-60)}: ` + PROPS.map((p, j) => a[j] !== c[j] ? `${p} ${a[j]} -> ${c[j]}` : '').filter(Boolean).join('; ')); } } }
    await p.close();
  }
  console.log(`${tot} element styles compared, ${dif} differ`); ex.forEach(e => console.log(' ', e));
  await b.close();
})();
