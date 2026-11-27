// Staging/live check after the 27 Nov cleanup. Usage: node stg.js https://kpidriver.webflow.io
const { chromium } = require('playwright'); const fs = require('fs');
const JQ = '/tmp/claude-0/-home-user-KPI-DRIVER/e3dc9ffd-4c54-5ea5-bfef-d94aaa22dc31/scratchpad/jq/node_modules/jquery/dist/jquery.min.js';
const H = process.argv[2] || 'https://kpidriver.webflow.io';
const paths = ['/', '/services', '/services/crm', '/services/ai-suite', '/services/ai-agent', '/our-team', '/contact-us', '/book-discovery-call', '/thank-you', '/policies/privacy-policy', '/policies/terms-conditions', '/blog', '/blog-category/kpis-performance', '/post/lead-manager-vs-acquisition-manager', '/no-such-page-kd'];
const all = paths.concat(paths.map(p => '/es' + (p === '/' ? '' : p)));
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const w of [1440, 390]) for (const path of all) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    await ctx.route(/cloudfront\.net\/js\/jquery/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(JQ) }));
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push('console: ' + m.text().slice(0, 140)); });
    const res = await p.goto(H + path + '?nointro', { waitUntil: 'load' }).catch(e => null);
    await p.waitForTimeout(2200);
    const r = await p.evaluate((path) => {
      const es = /^\/es(\/|$)/.test(path), q = s => [...document.querySelectorAll(s)];
      const css = q('link[rel=stylesheet]').map(l => l.href).filter(h => /kd-site-/.test(h));
      const links = q('a[href]').map(a => a.getAttribute('href'));
      const out = {
        status: 0, css19: css.filter(h => /kd-site-19/.test(h)).length, css18: css.filter(h => /kd-site-18/.test(h)).length,
        js19: !!q('script[src*="kd-site-19"]').length, js16: !!q('script[src*="kd-site-16"]').length,
        h1: q('h1').length, main: q('main#main').length, overflow: document.documentElement.scrollWidth > innerWidth + 1,
        pulsetic: links.filter(h => /pulsetic/.test(h)).length, widget: links.filter(h => /widget\/booking/.test(h)).length,
        enLinks: es ? q('a[href]:not(.lang-toggle)').map(a => a.getAttribute('href')).filter(h => /^\/(?!es(\/|$))[a-z]/.test(h)).length : 0,
        status_link: (q('a[href*="status.gohighlevel"]')[0] || {}).target || '-',
        login: (q('a[href^="https://crm.kpidriver.com"]')[0] || {}).target || '-',
        dialog: !!document.getElementById('book-dialog'),
        rel: q('.posts .post-row').map(a => a.getAttribute('href')),
        relDup: q('.posts').length,
        relHead: (document.querySelector('.posts') && document.querySelector('.posts').closest('section').querySelector('h2') || {}).textContent || '',
        h1t: ((document.querySelector('h1') || {}).textContent || '').trim().slice(0, 50),
        chip: (document.querySelector('.posts .typechip') || {}).textContent || ''
      };
      return out;
    }, path);
    r.status = res ? res.status() : 0;
    const issues = [];
    if (!(r.status === 200 || (path.includes('no-such') && r.status === 404))) issues.push('status ' + r.status);
    if (r.css19 < 1 || r.css18) issues.push('css 19:' + r.css19 + ' 18:' + r.css18);
    if (!r.js19 || r.js16) issues.push('js');
    if (r.h1 !== 1) issues.push('h1 ' + r.h1);
    if (r.main !== 1) issues.push('main ' + r.main);
    if (r.overflow) issues.push('overflow');
    if (r.pulsetic) issues.push('pulsetic ' + r.pulsetic);
    if (r.enLinks) issues.push('EN links on ES page ' + r.enLinks);
    if (r.status_link !== '_blank' || r.login !== '_blank') issues.push('newtab s:' + r.status_link + ' l:' + r.login);
    if (r.dialog) issues.push('old dialog');
    if (/\/post\//.test(path)) { if (r.rel.length < 2 || r.relDup !== 1 || !r.chip) issues.push('related ' + JSON.stringify(r.rel) + ' x' + r.relDup + ' chip ' + r.chip); if (r.rel.some(h => !/\/post\/./.test(h))) issues.push('related href ' + r.rel.join(',')); if (path.startsWith('/es') && r.rel.some(h => !h.startsWith('/es/post/'))) issues.push('related not ES'); }
    if (errs.length) issues.push('errors ' + errs.join(' | '));
    if (issues.length) bad++;
    if (w === 1440 || issues.length) console.log(w, path, issues.length ? 'ISSUES: ' + issues.join('; ') : 'ok', /\/post\/|blog$/.test(path) ? '| ' + r.h1t + ' | ' + r.relHead + ' ' + r.chip + ' ' + r.rel.join(',') : '');
    await ctx.close();
  }
  console.log('pages with issues:', bad); await b.close();
})();
