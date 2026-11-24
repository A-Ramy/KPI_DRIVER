// Spanish check: live /es page (old JS bundle) vs staging /es page with the bundles blocked
// (native Webflow Localization only). Prints every differing line of visible text and of
// accessible labels (aria-label, alt, placeholder, title), plus internal hrefs.
// usage: node esdiff.js /es/services [width]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = process.argv[2] || '/es', W = +(process.argv[3] || 1440);
(async () => {
  const b = await chromium.launch();
  const nat = execFileSync('curl', ['-s', 'https://kpidriver.webflow.io' + path + '?z=' + Date.now()], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const grab = async (native) => {
    const p = await b.newPage({ viewport: { width: W, height: 900 }, reducedMotion: 'reduce' });
    await p.route(/kd-intro-1\.js/, x => x.abort());
    if (native) {
      // HELPER=file: serve the native-Spanish helper in place of the old bundles (pre-upload test).
      const helper = process.env.HELPER ? require('fs').readFileSync(process.env.HELPER, 'utf8') : 'document.documentElement.classList.remove("es-wait")';
      await p.route(/kd-es-[a-z0-9-]+\.js/, x => x.fulfill({ status: 200, contentType: 'text/javascript', body: helper }));
      await p.route(u => new URL(u).pathname === path && new URL(u).host === 'www.kpidriver.com', x => x.fulfill({ status: 200, contentType: 'text/html', body: nat }));
    }
    await p.goto('https://www.kpidriver.com' + path, { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const lines = [];
      const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType === 3) { const t = c.nodeValue.replace(/\s+/g, ' ').trim(); if (t && !/^(SCRIPT|STYLE|NOSCRIPT)$/.test(c.parentNode.nodeName)) lines.push(t); } else if (c.nodeType === 1) walk(c); } };
      walk(document.body);
      const attrs = [];
      document.querySelectorAll('[aria-label],[alt],[placeholder],[title],[value]').forEach(e => ['aria-label', 'alt', 'placeholder', 'title'].concat(e.matches('input[type=submit],button') ? ['value'] : []).forEach(a => { const v = e.getAttribute(a); if (v) attrs.push(`@${a}=${v}`); }));
      const hrefs = [...document.querySelectorAll('a[href^="/"]')].map(a => 'href ' + a.getAttribute('href'));
      const forms = [...document.querySelectorAll('[data-success]')].map(f => 'data-success ' + f.getAttribute('data-success'));
      return { lines, attrs, hrefs, forms, lang: document.documentElement.lang, title: document.title };
    });
    await p.close(); return r;
  };
  const L = await grab(false), N = await grab(true);
  await b.close();
  const fs = require('fs'); const tmp = require('os').tmpdir() + '/esdiff-' + process.pid;
  fs.writeFileSync(tmp + '.json', JSON.stringify({ L, N }));
  if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify({ path, L, N }));
  console.log(execFileSync('python3', ['-c', `
import json,difflib,sys
d=json.load(open(sys.argv[1])); L,N=d['L'],d['N']
print('lang', L['lang'], N['lang'], '| title same:', L['title']==N['title'])
for k in ('lines','attrs','hrefs','forms'):
    a,b=L[k],N[k]
    if k!='lines': a,b=sorted(a),sorted(b)
    diff=[x for x in difflib.unified_diff(a,b,lineterm='',n=0) if not x.startswith(('---','+++','@@'))]
    print('==', k, len(a), 'live /', len(b), 'native,', len(diff), 'diff lines')
    for x in diff[:int(sys.argv[2])]: print('  ', x[:160])
`, tmp + '.json', process.env.MAX || '80'], { encoding: 'utf8' }));
})();
