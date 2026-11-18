// Live-site audit: requests, bytes, coverage, errors, DOM, hidden legacy markup, images, fonts.
const { chromium } = require('playwright'); const fs = require('fs');
const S = '/tmp/claude-0/-home-user-KPI-DRIVER/e3dc9ffd-4c54-5ea5-bfef-d94aaa22dc31/scratchpad/';
const HOST = 'https://www.kpidriver.com';
const PAGES = ['/', '/services', '/services/crm', '/services/ai-suite', '/services/ai-agent', '/our-team', '/contact-us', '/book-discovery-call', '/thank-you', '/blog', '/blog-category/kpis-performance', '/post/lead-manager-vs-acquisition-manager', '/policies/privacy-policy', '/es', '/es/services/crm', '/knowledge-base', '/log-in', '/article/crm-dashboard-walkthrough', '/no-such-page'];
(async () => {
  const b = await chromium.launch();
  const out = [];
  for (const u of PAGES) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route(/cloudfront\.net\/js\/jquery/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(S + 'jq/node_modules/jquery/dist/jquery.min.js') }));
    const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
    const reqs = []; const errs = []; const blocked = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 160)));
    p.on('requestfailed', r => blocked.push(r.url().slice(0, 100)));
    p.on('response', async r => { try { const h = r.headers(); const len = +(h['content-length'] || 0) || (await r.body().catch(() => Buffer.alloc(0))).length; reqs.push({ url: r.url(), type: r.request().resourceType(), status: r.status(), bytes: len }); } catch (e) {} });
    await p.coverage.startJSCoverage({ resetOnNavigation: false }); await p.coverage.startCSSCoverage({ resetOnNavigation: false });
    let status = 0;
    try { const resp = await p.goto(HOST + u, { waitUntil: 'load', timeout: 45000 }); status = resp.status(); } catch (e) { errs.push('NAV ' + e.message.slice(0, 80)); }
    await p.evaluate(() => document.documentElement.classList.remove('ms-hide-login'));
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(40); }
    await p.waitForTimeout(1200);
    const js = await p.coverage.stopJSCoverage(), css = await p.coverage.stopCSSCoverage();
    const cov = arr => arr.filter(e => e.url && !e.url.startsWith('data:')).map(e => { const total = e.text.length; let used = 0; (e.ranges || (e.functions || []).flatMap(f => f.ranges)).forEach(r => used += r.end - r.start); return { url: e.url.split('/').pop().slice(0, 60), total, used: Math.min(used, total) }; });
    const jsCov = js.filter(e => e.url).map(e => { const total = e.source ? e.source.length : 0; const ranges = []; (e.functions || []).forEach(f => f.ranges.forEach(r => { if (r.count > 0) ranges.push(r); })); let used = 0; ranges.sort((a, b) => a.startOffset - b.startOffset); let end = 0; ranges.forEach(r => { const s = Math.max(r.startOffset, end); if (r.endOffset > s) { used += r.endOffset - s; end = r.endOffset; } }); return { url: e.url.split('/').pop().slice(0, 60) || e.url.slice(0, 60), total, used: Math.min(used, total) }; });
    const dom = await p.evaluate(() => {
      const all = document.querySelectorAll('*').length;
      const hidden = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return s.display === 'none' && e.querySelectorAll('*').length > 30 && !e.closest('[hidden]') && !(e.parentElement && getComputedStyle(e.parentElement).display === 'none'); }).map(e => (e.tagName + '.' + [...e.classList].slice(0, 3).join('.') + '#' + (e.id || '')).slice(0, 70) + ' (' + e.querySelectorAll('*').length + ' nodes)');
      const imgs = [...document.images].map(i => ({ src: (i.currentSrc || i.src).split('/').pop().slice(0, 50), nw: i.naturalWidth, w: Math.round(i.getBoundingClientRect().width), lazy: i.loading, dims: i.hasAttribute('width') && i.hasAttribute('height'), vis: !!i.offsetParent }));
      const big = imgs.filter(i => i.vis && i.w > 0 && i.nw > i.w * 2.5 && i.nw > 800);
      const nodims = imgs.filter(i => i.vis && !i.dims).length;
      const scripts = [...document.scripts].map(s => s.src ? s.src.split('/').slice(2).join('/').slice(0, 90) : 'inline:' + s.textContent.length);
      const styles = [...document.querySelectorAll('link[rel=stylesheet],style')].map(s => s.href ? s.href.split('/').slice(2).join('/').slice(0, 90) : 'inline-style:' + s.textContent.length);
      const ids = {}; document.querySelectorAll('[id]').forEach(e => ids[e.id] = (ids[e.id] || 0) + 1); const dupIds = Object.entries(ids).filter(x => x[1] > 1).map(x => x[0] + 'x' + x[1]);
      const hdrs = document.querySelectorAll('header.site-header').length, ftrs = document.querySelectorAll('footer.site-footer').length;
      const h1 = document.querySelectorAll('h1').length;
      return { all, hidden, imgs: imgs.length, big, nodims, scripts, styles, dupIds, hdrs, ftrs, h1, title: document.title };
    });
    const byType = {}; let bytes = 0; const hosts = {};
    reqs.forEach(r => { byType[r.type] = (byType[r.type] || 0) + r.bytes; bytes += r.bytes; const h = new URL(r.url).host; hosts[h] = (hosts[h] || 0) + 1; });
    const fonts = reqs.filter(r => r.type === 'font').map(r => r.url.split('/').pop().slice(0, 40));
    const dupReq = Object.entries(reqs.reduce((a, r) => (a[r.url] = (a[r.url] || 0) + 1, a), {})).filter(x => x[1] > 1).map(x => x[0].slice(0, 90));
    out.push({ u, status, n: reqs.length, kb: Math.round(bytes / 1024), byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])), hosts, fonts: fonts.length, dupReq, errs: [...new Set(errs)].slice(0, 6), blocked: [...new Set(blocked)].slice(0, 6), js: jsCov, css: cov(css), ...dom });
    console.log(u, status, reqs.length + ' req', Math.round(bytes / 1024) + 'KB', 'dom', dom.all, 'errs', errs.length);
    await ctx.close();
  }
  fs.writeFileSync(S + 'audit-live.json', JSON.stringify(out, null, 1));
  await b.close();
})();
