// Renders collateral/src/*.html to PDF with Chromium (Playwright). Reports any slide whose content overflows.
const { chromium } = require('playwright'); const path = require('path');
const docs = [['company-profile', 'KPI-DRIVER-Company-Profile', 1440, 810], ['sow-enterprise-optimization-suite', 'KPI-DRIVER-SOW-Enterprise-Optimization-Suite', 1440, 810], ['sow-ai-agent', 'KPI-DRIVER-SOW-AI-Agent', 1440, 810], ['ai-suite-flyer', 'KPI-DRIVER-AI-Suite-Flyer', 816, 1056]];
(async () => {
  const b = await chromium.launch();
  for (const [src, out, w, h] of docs) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + path.join(__dirname, 'src', src + '.html'), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const over = await p.evaluate(() => [...document.querySelectorAll('.slide')].map((s, i) => { const f = s.querySelector('.foot').getBoundingClientRect().top; const worst = Math.max(...[...s.children].filter(c => !c.classList.contains('foot') && !c.classList.contains('tach')).map(c => c.getBoundingClientRect().bottom - s.getBoundingClientRect().top)); return worst > (f - s.getBoundingClientRect().top) - 4 ? `slide ${i + 1}: content bottom ${Math.round(worst)} vs footer ${Math.round(f - s.getBoundingClientRect().top)}` : null; }).filter(Boolean));
    await p.pdf({ path: path.join(__dirname, out + '.pdf'), width: w + 'px', height: h + 'px', printBackground: true, pageRanges: '' });
    console.log(out, over.length ? 'OVERFLOW ' + JSON.stringify(over) : 'ok');
    await p.close();
  }
  await b.close();
})();
