// Which selectors in our CSS (kd-site, kd-members) and which DOM hooks in site.js match anything on any page?
const { chromium } = require('playwright'); const fs = require('fs');
const S = '/tmp/claude-0/-home-user-KPI-DRIVER/e3dc9ffd-4c54-5ea5-bfef-d94aaa22dc31/scratchpad/';
const R = '/home/user/KPI_DRIVER/';
const css = fs.readFileSync(R + 'webflow/kd-site-11.css', 'utf8') + '\n' + fs.readFileSync(R + 'webflow/kd-members-4.css', 'utf8');
// crude CSS rule splitter: strip comments, walk braces, collect selector lists outside @keyframes
function rules(t) {
  t = t.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = []; let i = 0, depth = 0, start = 0, stack = [];
  while (i < t.length) {
    const c = t[i];
    if (c === '{') { const pre = t.slice(start, i).trim(); stack.push(pre); if (!pre.startsWith('@') && !stack.slice(0, -1).some(s => /@keyframes/.test(s))) out.push({ sel: pre, at: stack.slice(0, -1).filter(s => s.startsWith('@')).join(' ') }); depth++; start = i + 1; }
    else if (c === '}') { stack.pop(); depth--; start = i + 1; }
    else if (c === ';' && depth >= 0) { /* declarations */ }
    i++;
  }
  return out.filter(r => r.sel && !/^(from|to|\d+%)/.test(r.sel));
}
const RS = rules(css);
const sels = [...new Set(RS.flatMap(r => r.sel.split(',').map(s => s.trim()).filter(Boolean)))];
const js = fs.readFileSync(R + 'src/assets/js/site.js', 'utf8');
const hooks = [...new Set([...js.matchAll(/querySelector(?:All)?\(\s*["']([^"']+)["']/g)].map(m => m[1]))];
const PAGES = ['/', '/services', '/services/crm', '/services/ai-suite', '/services/ai-agent', '/our-team', '/contact-us', '/book-discovery-call', '/thank-you', '/blog', '/blog-category/kpis-performance', '/post/lead-manager-vs-acquisition-manager', '/policies/privacy-policy', '/policies/terms-conditions', '/es', '/es/services', '/es/services/crm', '/es/services/ai-suite', '/es/services/ai-agent', '/es/our-team', '/es/contact-us', '/es/blog', '/es/post/lead-manager-vs-acquisition-manager', '/knowledge-base', '/log-in', '/knowledge-base-categories/kpis-pipelines', '/article/crm-dashboard-walkthrough', '/no-such-page'];
(async () => {
  const b = await chromium.launch();
  const hitS = new Set(), hitH = new Set(), bad = new Set();
  for (const theme of ['light', 'dark']) for (const w of [1440, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme });
    await ctx.route(/cloudfront\.net\/js\/jquery/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(S + 'jq/node_modules/jquery/dist/jquery.min.js') }));
    await ctx.addInitScript(t => { try { localStorage.setItem('kd-theme', t); } catch (e) {} }, theme);
    for (const u of (theme === 'light' && w === 1440 ? PAGES : PAGES.filter((x, i) => i % 3 === 0))) {
      const p = await ctx.newPage();
      try { await p.goto('https://www.kpidriver.com' + u, { waitUntil: 'load', timeout: 45000 }); } catch (e) { await p.close(); continue; }
      await p.evaluate(() => document.documentElement.classList.remove('ms-hide-login'));
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < H; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(30); }
      await p.waitForTimeout(500);
      // open things: mobile nav, menus, a tab, a FAQ, the booking dialog
      await p.evaluate(() => { document.querySelectorAll('.nav-toggle,[aria-haspopup="true"],details summary,.faq-q,.kq button').forEach((e, i) => { if (i < 6) try { e.click(); } catch (x) {} }); });
      await p.waitForTimeout(300);
      const book = await p.$('[data-book]'); if (book && w === 1440) { try { await book.click({ timeout: 2000 }); await p.waitForTimeout(800); } catch (e) {} }
      const res = await p.evaluate(([sels, hooks]) => {
        const strip = s => s.replace(/::?(hover|focus|focus-visible|focus-within|active|visited|before|after|placeholder|marker|selection|first-letter|first-line|-webkit-[a-z-]+|-moz-[a-z-]+)(\([^)]*\))?/g, '').replace(/:not\(\s*\)/g, '').trim() || '*';
        const hs = [], hh = [], bd = [];
        sels.forEach(s => { try { if (document.querySelector(strip(s))) hs.push(s); } catch (e) { bd.push(s); } });
        hooks.forEach(s => { try { if (document.querySelector(s)) hh.push(s); } catch (e) {} });
        return [hs, hh, bd];
      }, [sels, hooks]);
      res[0].forEach(s => hitS.add(s)); res[1].forEach(s => hitH.add(s)); res[2].forEach(s => bad.add(s));
      await p.close();
    }
    await ctx.close();
  }
  const deadS = sels.filter(s => !hitS.has(s) && !bad.has(s)), deadH = hooks.filter(s => !hitH.has(s));
  fs.writeFileSync(S + 'audit-selectors.json', JSON.stringify({ rules: RS.length, selectors: sels.length, deadS, deadH, bad: [...bad], hooks: hooks.length }, null, 1));
  console.log('rules', RS.length, 'selectors', sels.length, 'never matched', deadS.length, '| js hooks', hooks.length, 'never matched', deadH.length, '| unparseable', bad.size);
  await b.close();
})();
