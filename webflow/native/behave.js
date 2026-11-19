// Same interaction script on live Home and the staging pilot; prints what happened on each.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const u of ['https://www.kpidriver.com/', 'https://kpidriver.webflow.io/kd-native-pilot']) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
    await p.goto(u + '?v=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(2000);
    const r = {};
    r.mains = await p.$$eval('main', m => m.length);
    r.lc = await p.evaluate(() => !!document.querySelector('[data-lc] .lc-svg') + ' tabs=' + document.querySelectorAll('[data-lc] [role=tab]').length);
    await p.click('[data-lc] [role=tab]:nth-of-type(3)').catch(e => r.lcErr = e.message.slice(0, 60)); await p.waitForTimeout(400);
    r.lcSel = await p.evaluate(() => [...document.querySelectorAll('[data-lc] [role=tab]')].findIndex(t => t.getAttribute('aria-selected') === 'true'));
    await p.locator('.flow__step').nth(1).scrollIntoViewIfNeeded(); const y0 = await p.evaluate(() => scrollY);
    await p.locator('.flow__step').nth(1).click(); await p.waitForTimeout(300);
    r.flow = await p.evaluate(() => [...document.querySelectorAll('.flow__pane')].map(x => x.classList.contains('is-on') ? 1 : 0).join('') + ' pressed=' + [...document.querySelectorAll('.flow__step')].map(s => s.getAttribute('aria-pressed')).join(','));
    r.flowJump = (await p.evaluate(() => scrollY)) - y0; r.hash = await p.evaluate(() => location.hash);
    await p.click('[data-flow-play]'); await p.waitForTimeout(300); r.play = await p.textContent('[data-flow-play]');
    await p.locator('.kd-faq summary').first().click(); r.faq = await p.evaluate(() => document.querySelector('.kd-faq details').open);
    r.prompt = await p.evaluate(() => document.querySelectorAll('.kd-prompt').length);
    r.ctaHtml = await p.evaluate(() => { const c = document.querySelector('section.cta .btn-row'); return c ? c.innerHTML.slice(0, 200) : 'no cta'; }); await p.locator('section.cta .btn-row a').first().click({ timeout: 5000 }).catch(e => r.ctaErr = e.message.slice(0, 80)); await p.waitForTimeout(1200);
    r.book = await p.evaluate(() => { const d = document.querySelector('dialog[open], .bookdlg[open], .kdb[open], [class*=book][aria-modal=true]'); return d ? (d.className || d.tagName) : 'none'; });
    r.pages = b.contexts()[0] ? (await p.context().pages()).length : 0;
    r.errs = errs;
    console.log(u, JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
