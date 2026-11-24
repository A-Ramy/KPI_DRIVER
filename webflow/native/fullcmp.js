// Whole-page comparison as it will be after the switch: the native page's HTML is served AT the live URL,
// so every runtime script (booking forms, prompts, translations) runs exactly as it will on that URL.
// usage: node fullcmp.js <live path> <native staging path>   e.g. node fullcmp.js / /kd-native-pilot
const { chromium } = require('playwright');
const [livePath, natPath] = [process.argv[2] || '/', process.argv[3] || '/kd-native-pilot'];
const PROPS = ['display', 'position', 'width', 'height', 'margin-top', 'margin-bottom', 'padding-top', 'padding-bottom', 'padding-left', 'color', 'background-color', 'background-image', 'border-top-width', 'border-top-color', 'border-radius', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'opacity', 'visibility', 'gap', 'grid-template-columns', 'flex-direction', 'justify-content', 'align-items', 'box-shadow'];
const snap = (page) => page.evaluate((PROPS) => {
  const out = {}, text = [];
  const skip = k => /^(SCRIPT|STYLE|LINK|META|NOSCRIPT|IFRAME|TEMPLATE)$/i.test(k.tagName) || (k.classList && k.classList.contains('w-embed') && ![...k.children].some(c => !/^(SCRIPT|STYLE|LINK)$/i.test(c.tagName)) && !k.textContent.trim());
  const walk = (el, path) => {
    const cs = getComputedStyle(el); out[path] = PROPS.map(p => cs.getPropertyValue(p)).join('|');
    const flat = e => [...e.children].flatMap(k => skip(k) ? [] : (k.classList && (k.classList.contains('w-embed') || k.classList.contains('kd-chrome')) ? flat(k) : [k]));
    const kids = flat(el);
    kids.forEach((k, n) => walk(k, path + '>' + k.tagName.toLowerCase() + ((typeof k.className === 'string' ? k.className.trim().split(/\s+/).filter((c, i, a) => c && a.indexOf(c) === i && !/^(w-|rv|is-|in|u-|kd-main$)/.test(c)).sort() : []).map(c => '.' + c).join('')) + ':' + n));
  };
  walk(document.body, 'body');
  return { out, text: document.body.innerText.replace(/\s+/g, ' ').trim() };
}, PROPS);
(async () => {
  const b = await chromium.launch();
  const natHtml = require('child_process').execFileSync('curl', ['-s', 'https://kpidriver.webflow.io' + natPath + '?z=' + Date.now()], { encoding: 'utf8', maxBuffer: 1 << 26 });
  let total = 0, diffs = 0; const ex = [];
  for (const w of [1440, 820, 390]) {
    const r = {};
    for (const k of ['live', 'native']) {
      const p = await b.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
      await p.route(/kd-intro-1\.js/, x => x.abort());
      // NOBUNDLE=1: staging side runs without the old Spanish JS bundles (native Localization only).
      if (k === 'native' && process.env.NOBUNDLE) await p.route(/kd-es-[a-z0-9-]+\.js/, x => x.fulfill({ status: 200, contentType: 'text/javascript', body: process.env.HELPER ? require('fs').readFileSync(process.env.HELPER, 'utf8') : 'document.documentElement.classList.remove("es-wait")' }));
      if (k === 'native') await p.route(u => new URL(u).pathname === livePath && new URL(u).host === 'www.kpidriver.com', x => x.fulfill({ status: 200, contentType: 'text/html', body: natHtml }));
      await p.goto('https://www.kpidriver.com' + livePath, { waitUntil: 'load' }); await p.waitForTimeout(2500);
      r[k] = await snap(p); await p.close();
    }
    const keys = new Set([...Object.keys(r.live.out), ...Object.keys(r.native.out)]); let d = 0;
    for (const key of keys) { total++; if (r.live.out[key] !== r.native.out[key]) { d++; if (ex.length < 15) { const a = (r.live.out[key] || 'MISSING').split('|'), c = (r.native.out[key] || 'MISSING').split('|'); ex.push(`${w} ${key.slice(-110)}\n     ` + (a.length < 2 || c.length < 2 ? `live ${a[0]} / native ${c[0]}` : PROPS.map((p, j) => a[j] !== c[j] ? `${p}: ${a[j]} -> ${c[j]}` : '').filter(Boolean).join('; '))); } } }
    const sameText = r.live.text === r.native.text;
    console.log(`${w}px: ${Object.keys(r.live.out).length} live / ${Object.keys(r.native.out).length} native elements, ${d} differ, visible text identical: ${sameText}`);
    if (!sameText) { const A = r.live.text, B = r.native.text; let i = 0; while (A[i] === B[i]) i++; console.log('   text differs at:', JSON.stringify(A.slice(i - 60, i + 80)), '\n   vs', JSON.stringify(B.slice(i - 60, i + 80))); }
    diffs += d;
  }
  console.log(`TOTAL ${total} compared, ${diffs} differ`); ex.forEach(e => console.log(' ', e));
  await b.close();
})();
