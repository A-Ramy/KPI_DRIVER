const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
for (const u of ['https://www.kpidriver.com/', 'https://kpidriver.webflow.io/kd-native-pilot']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(u + '?v=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(2000);
  const info = await p.evaluate(() => ({ n: document.querySelectorAll('main [data-book]').length, lastSec: [...document.querySelector('main').children].pop().outerHTML.slice(0, 160) }));
  const before = await p.evaluate(() => document.querySelectorAll('dialog[open]').length);
  await p.locator('main [data-book]').last().click();
  await p.waitForTimeout(1500);
  const after = await p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.className + ' iframe=' + !!d.querySelector('iframe') + ' slots=' + !!d.querySelector('[data-booking],.kdb')));
  console.log(u, JSON.stringify(info), before, JSON.stringify(after), 'tabs=' + p.context().pages().length);
  await p.close(); }
await b.close(); })();
