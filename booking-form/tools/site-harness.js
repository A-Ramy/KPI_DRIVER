// Serves the built site (site/) at its real www.kpidriver.com paths inside a test browser, and wires the
// booking form to the bridge running locally (booking-form/bridge/worker.js → real HighLevel through this
// session's network proxy, which supplies the token). Contact forms post straight to the real HighLevel webhook.
// Run with NODE_USE_ENV_PROXY=1 so the local bridge can reach HighLevel.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '../../site');
const BRIDGE = 'https://kd-bridge.test';
const TYPES = { html: 'text/html', css: 'text/css', js: 'application/javascript', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', svg: 'image/svg+xml', json: 'application/json', ico: 'image/x-icon', txt: 'text/plain', xml: 'application/xml' };

function fileFor(pathname) {
  let p = decodeURIComponent(pathname).replace(/\/+$/, '');
  if (!p) p = '/index';
  let f = path.join(SITE, p);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  if (fs.existsSync(f + '.html')) return f + '.html';
  if (fs.existsSync(path.join(f, 'index.html'))) return path.join(f, 'index.html');
  return null;
}

async function wire(context, { bridge = true } = {}) {
  let callBridge = null;
  if (bridge) ({ callBridge } = await import(path.resolve(__dirname, '../bridge/local.mjs')));
  const calls = [];
  await context.route('https://www.kpidriver.com/**', route => {
    const u = new URL(route.request().url());
    const f = fileFor(u.pathname);
    if (!f) return route.fulfill({ status: 404, body: 'not found' });
    let body = fs.readFileSync(f);
    if (f.endsWith('.html')) {
      // root-relative links, and point the booking form at the local bridge
      let h = body.toString('utf8');
      if (bridge) h = h.replace('"slotsUrl": ""', `"slotsUrl": "${BRIDGE}/slots"`).replace('"bookUrl": ""', `"bookUrl": "${BRIDGE}/book"`);
      body = h;
    }
    return route.fulfill({ status: 200, contentType: TYPES[f.split('.').pop()] || 'application/octet-stream', body });
  });
  if (bridge) await context.route(BRIDGE + '/**', async route => {
    const req = route.request();
    const init = { method: req.method(), headers: { Origin: 'https://www.kpidriver.com', 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.23' } };
    if (req.method() === 'POST') init.body = req.postData();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': 'https://www.kpidriver.com', 'Access-Control-Allow-Headers': 'Content-Type, Accept', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
    const res = await callBridge(new Request(req.url(), init));
    const text = await res.text();
    calls.push({ method: req.method(), url: req.url(), status: res.status, body: text, sent: init.body });
    return route.fulfill({ status: res.status, body: text, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://www.kpidriver.com' } });
  });
  return calls;
}

module.exports = { wire, SITE };
