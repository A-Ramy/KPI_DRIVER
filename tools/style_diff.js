// Visual-equivalence check for a CSS/JS refactor: loads each page twice (live hosted files vs. candidate files),
// then compares the computed style of every element. Usage:
//   node tools/style_diff.js <candidate.css> <candidate.js> [out.json]
// Live files are swapped by URL pattern (kd-site-*.css / kd-site-*.js) via request routing; jQuery is served locally.
const { chromium } = require('playwright'); const fs = require('fs');
const [CSS, JS, OUT = '/tmp/style_diff.json'] = process.argv.slice(2);
const JQ = process.env.JQ || '/tmp/claude-0/-home-user-KPI-DRIVER/e3dc9ffd-4c54-5ea5-bfef-d94aaa22dc31/scratchpad/jq/node_modules/jquery/dist/jquery.min.js';
const PAGES = (process.env.PAGES ? process.env.PAGES.split(',') : null) || ['/', '/services', '/services/crm', '/services/ai-suite', '/services/ai-agent', '/our-team', '/contact-us', '/book-discovery-call', '/thank-you', '/blog', '/blog-category/kpis-performance', '/post/lead-manager-vs-acquisition-manager', '/policies/privacy-policy', '/es', '/es/services/crm', '/es/contact-us', '/es/post/lead-manager-vs-acquisition-manager', '/knowledge-base', '/log-in', '/no-such-page'];
const PROPS = ['display', 'position', 'top', 'left', 'width', 'height', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'color', 'background-color', 'background-image', 'border-top-width', 'border-top-color', 'border-bottom-width', 'border-left-width', 'border-radius', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'opacity', 'visibility', 'gap', 'grid-template-columns', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'z-index', 'overflow-x', 'overflow-y', 'box-shadow', 'transform', 'filter', 'fill', 'stroke', 'cursor', 'white-space', 'mask-image', 'content'];
async function snap(page) {
  return page.evaluate((PROPS) => {
    const out = {}; let i = 0;
    const walk = (el, path) => {
      const kids = [...el.children]; const cs = getComputedStyle(el);
      out[path] = PROPS.map(p => cs.getPropertyValue(p)).join('|');
      for (const pseudo of ['::before', '::after']) { const ps = getComputedStyle(el, pseudo); if (ps.content && ps.content !== 'none') out[path + pseudo] = PROPS.map(p => ps.getPropertyValue(p)).join('|'); }
      kids.forEach((k, n) => { if (!/^(SCRIPT|STYLE|LINK|META|NOSCRIPT|IFRAME|svg)$/i.test(k.tagName) || k.tagName === 'svg') walk(k, path + '>' + k.tagName.toLowerCase() + (k.className && typeof k.className === 'string' ? '.' + k.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ':' + n); });
    };
    walk(document.body, 'body'); return out;
  }, PROPS);
}
(async () => {
  const b = await chromium.launch(); const report = []; let total = 0, diffs = 0;
  for (const [w, theme] of [[1440, 'light'], [1440, 'dark'], [390, 'light'], [820, 'dark']]) {
    for (const variant of ['live', 'cand']) {
      // one context per variant keeps caches separate
    }
    for (const u of PAGES) {
      const shots = {};
      for (const variant of ['live', 'cand']) {
        const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' });
        await ctx.route(/cloudfront\.net\/js\/jquery/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(JQ) }));
        await ctx.route(/(boast\.io|elfsight\.com|leadconnectorhq|link\.kpidriver\.com|google\.com\/maps|googletagmanager|embedly|\/api\/booking)/, r => r.abort());
        if (variant === 'cand') {
          await ctx.route(/_kd-site-\d+\.css/, r => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(CSS) }));
          await ctx.route(/_kd-site-\d+\.js/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(JS) }));
        }
        await ctx.addInitScript(t => { try { localStorage.setItem('kd-theme', t); } catch (e) {} }, theme);
        const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
        try { await p.goto('https://www.kpidriver.com' + u, { waitUntil: 'load', timeout: 45000 }); } catch (e) { errs.push('nav ' + e.message); }
        await p.evaluate(() => { document.documentElement.classList.remove('ms-hide-login'); scrollTo(0, document.documentElement.scrollHeight); });
        await p.waitForTimeout(700); await p.evaluate(() => { document.querySelectorAll('.anim .is-in, .is-in').forEach(() => {}); scrollTo(0, 0); });
        await p.evaluate(() => document.querySelectorAll('*').forEach(e => { if (e.getAnimations) e.getAnimations().forEach(a => { try { a.finish(); } catch (x) {} }); }));
        await p.waitForTimeout(1500); try { await p.waitForLoadState('networkidle', { timeout: 8000 }); } catch (e) {}
        await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
        shots[variant] = { s: await snap(p), errs };
        await ctx.close();
      }
      const A = shots.live.s, B = shots.cand.s; const keys = new Set([...Object.keys(A), ...Object.keys(B)]); const bad = [];
      keys.forEach(k => { total++; if (A[k] !== B[k]) { diffs++; if (bad.length < 15) { const a = (A[k] || '').split('|'), c = (B[k] || '').split('|'); bad.push({ el: k.slice(-140), props: PROPS.filter((p, i) => a[i] !== c[i]).map(p => p + ': ' + a[PROPS.indexOf(p)] + ' -> ' + c[PROPS.indexOf(p)]).slice(0, 6) }); } } });
      report.push({ w, theme, u, elements: keys.size, diffs: bad.length ? bad : 0, errsLive: shots.live.errs, errsCand: shots.cand.errs });
      console.log(`${w} ${theme} ${u}: ${keys.size} elements, ${bad.length ? 'DIFFERENT (' + bad.length + '+)' : 'identical'}${shots.cand.errs.length ? ' ERR ' + shots.cand.errs[0] : ''}`);
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  console.log(`checked ${total} element styles, ${diffs} differ`);
  await b.close();
})();
