// Staging (kpidriver.webflow.io) vs live (www.kpidriver.com): computed style of every element, per page and viewport.
const { chromium } = require('playwright');
const PAGES = ['/', '/services', '/services/crm', '/services/ai-suite', '/services/ai-agent', '/our-team', '/contact-us', '/book-discovery-call', '/thank-you', '/blog', '/blog-category/kpis-performance', '/post/lead-manager-vs-acquisition-manager', '/policies/privacy-policy', '/es', '/es/blog', '/es/post/lead-manager-vs-acquisition-manager', '/no-such-page'];
const PROPS = ['display', 'position', 'width', 'height', 'margin-top', 'margin-bottom', 'padding-top', 'padding-bottom', 'padding-left', 'color', 'background-color', 'background-image', 'border-top-width', 'border-radius', 'font-family', 'font-size', 'font-weight', 'line-height', 'text-transform', 'text-align', 'opacity', 'visibility', 'gap', 'grid-template-columns', 'flex-direction', 'justify-content', 'align-items', 'box-shadow', 'transform'];
const snap = (page) => page.evaluate((PROPS) => {
  const out = {};
  const walk = (el, path) => {
    const cs = getComputedStyle(el); out[path] = PROPS.map(p => cs.getPropertyValue(p)).join('|');
    [...el.children].forEach((k, n) => { if (!/^(SCRIPT|STYLE|LINK|META|NOSCRIPT|IFRAME)$/i.test(k.tagName)) walk(k, path + '>' + k.tagName.toLowerCase() + ':' + n); });
  };
  walk(document.body, 'body'); return out;
}, PROPS);
(async () => {
  const b = await chromium.launch(); let total = 0, diffs = 0; const ex = [];
  for (const w of [1440, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    for (const path of PAGES) {
      const r = {};
      for (const [k, host] of [['live', 'https://www.kpidriver.com'], ['stg', 'https://kpidriver.webflow.io']]) {
        await p.goto(host + path + '?v=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(1200); r[k] = await snap(p);
      }
      const keys = new Set([...Object.keys(r.live), ...Object.keys(r.stg)]); let d = 0;
      for (const key of keys) { total++; if (r.live[key] !== r.stg[key]) { d++; if (ex.length < 12) ex.push(`${w} ${path} ${key.slice(-80)}\n   live ${String(r.live[key]).slice(0, 160)}\n   stg  ${String(r.stg[key]).slice(0, 160)}`); } }
      diffs += d; console.log(w, path, Object.keys(r.live).length, 'elements,', d, 'differ');
    }
    await p.close();
  }
  console.log('TOTAL', total, 'compared,', diffs, 'differ'); if (ex.length) console.log(ex.join('\n'));
  await b.close();
})();
