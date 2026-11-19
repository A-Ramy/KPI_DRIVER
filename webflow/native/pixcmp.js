// Full-page screenshots: live vs native served at the live URL. Saves both + reports pixel difference.
const { chromium } = require('playwright'); const fs = require('fs');
const [livePath, natPath, tag] = [process.argv[2] || '/', process.argv[3] || '/kd-native-pilot', process.argv[4] || 'home'];
const natHtml = require('child_process').execFileSync('curl', ['-s', 'https://kpidriver.webflow.io' + natPath + '?z=' + Date.now()], { encoding: 'utf8', maxBuffer: 1 << 26 });
(async () => { const b = await chromium.launch();
  for (const w of [1440, 390]) for (const k of ['live', 'native']) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    await p.route(/kd-intro-1\.js/, x => x.abort());
    if (k === 'native') await p.route(u => new URL(u).pathname === livePath && new URL(u).host === 'www.kpidriver.com', x => x.fulfill({ status: 200, contentType: 'text/html', body: natHtml }));
    await p.goto('https://www.kpidriver.com' + livePath, { waitUntil: 'load' }); await p.waitForTimeout(2500);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `px_${tag}_${w}_${k}.png`, fullPage: true }); await p.close();
  }
  await b.close(); })();
