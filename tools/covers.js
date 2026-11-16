// Renders one branded, text-light cover per post (1600x900 JPEG) from webflow/cms/post-index.json.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..'); const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'webflow/cms/post-index.json')));
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'src/assets/img/brand/logo-h-light.png')).toString('base64');
const CAT = { 'kpis-performance': ['KPI', '#43b749'], 'crm-systems': ['CRM', '#4a9be6'], 'ai-automation': ['AI', '#fcaf17'], 'marketing-lead-generation': ['MKT', '#ea8c1c'],
  'acquisitions-sales': ['ACQ', '#4a9be6'], 'dispositions-transactions': ['DISPO', '#43b749'], 'rentals-portfolio': ['RENT', '#fcaf17'], 'scaling-leadership': ['SCALE', '#ed2024'] };
function rng(seed) { let s = seed * 2654435761 % 4294967296; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function motif(cat, r, c) {
  const W = 1600, H = 900; let o = '';
  if (cat === 'kpis-performance') { // tachometer
    const cx = 1080, cy = 560, R = 360, a0 = Math.PI * 0.85, a1 = Math.PI * 2.15, needle = a0 + (a1 - a0) * (0.35 + r() * 0.55);
    for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40, big = i % 5 === 0, r1 = R - (big ? 46 : 24);
      o += `<line x1="${cx + Math.cos(a) * R}" y1="${cy + Math.sin(a) * R}" x2="${cx + Math.cos(a) * r1}" y2="${cy + Math.sin(a) * r1}" stroke="${a <= needle ? c : 'rgba(255,255,255,.28)'}" stroke-width="${big ? 7 : 3}"/>`; }
    o += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(needle) * (R - 70)}" y2="${cy + Math.sin(needle) * (R - 70)}" stroke="#fdfdfd" stroke-width="9" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="26" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="9" fill="#070b11"/>`;
  } else if (cat === 'crm-systems') { // pipeline board
    for (let col = 0; col < 5; col++) { const x = 640 + col * 180, n = 1 + Math.floor(r() * 4);
      o += `<rect x="${x}" y="170" width="150" height="10" fill="${col === 2 ? c : 'rgba(255,255,255,.3)'}"/>`;
      for (let k = 0; k < n; k++) o += `<rect x="${x}" y="${206 + k * 128}" width="150" height="104" rx="6" fill="${r() > 0.72 ? c : 'rgba(255,255,255,.07)'}" stroke="rgba(255,255,255,.22)" stroke-width="2"/>`; }
  } else if (cat === 'ai-automation') { // signal waveform + nodes
    let d = ''; const ph = r() * 6; for (let x = 560; x <= 1560; x += 8) { const t = (x - 560) / 1000, y = 450 + Math.sin(t * 22 + ph) * 150 * Math.sin(t * Math.PI) * (0.6 + 0.4 * Math.sin(t * 7 + ph)); d += (x === 560 ? 'M' : 'L') + x + ' ' + y.toFixed(1); }
    o += `<path d="${d}" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`;
    for (let i = 0; i < 6; i++) { const x = 640 + i * 170, y = 200 + r() * 500; o += `<line x1="${x}" y1="${y}" x2="${x}" y2="450" stroke="rgba(255,255,255,.18)" stroke-width="2"/><circle cx="${x}" cy="${y}" r="13" fill="#070b11" stroke="#fdfdfd" stroke-width="4"/>`; }
  } else if (cat === 'marketing-lead-generation') { // funnel bars
    const ws = [900, 700 - r() * 60, 500 - r() * 60, 320 - r() * 50, 170 - r() * 40];
    ws.forEach((w, i) => { o += `<rect x="${1560 - w}" y="${190 + i * 112}" width="${w}" height="76" rx="6" fill="${i === ws.length - 1 ? c : `rgba(255,255,255,${0.26 - i * 0.04})`}"/>`; });
  } else if (cat === 'acquisitions-sales') { // call cadence: conversation bars
    for (let i = 0; i < 9; i++) { const left = i % 2 === 0, w = 240 + r() * 420, y = 150 + i * 70; o += `<rect x="${left ? 640 : 1560 - w}" y="${y}" width="${w}" height="40" rx="20" fill="${left ? 'rgba(255,255,255,.16)' : c}" opacity="${left ? 1 : 0.55 + r() * 0.45}"/>`; }
  } else if (cat === 'dispositions-transactions') { // checklist to close
    for (let i = 0; i < 6; i++) { const y = 170 + i * 100, done = i < 2 + Math.floor(r() * 3);
      o += `<rect x="700" y="${y}" width="56" height="56" rx="8" fill="${done ? c : 'none'}" stroke="${done ? c : 'rgba(255,255,255,.35)'}" stroke-width="4"/>` + (done ? `<path d="M714 ${y + 29}l12 12 20-24" fill="none" stroke="#070b11" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` : '') + `<rect x="790" y="${y + 18}" width="${380 + r() * 380}" height="20" rx="10" fill="rgba(255,255,255,${done ? 0.3 : 0.14})"/>`; }
  } else if (cat === 'rentals-portfolio') { // skyline of units
    for (let i = 0; i < 7; i++) { const w = 110, x = 640 + i * 132, h = 220 + r() * 420, y = 760 - h, lit = r() > 0.6;
      o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.24)" stroke-width="2"/>`;
      for (let wy = y + 28; wy < 720; wy += 64) for (let wx = 0; wx < 2; wx++) o += `<rect x="${x + 22 + wx * 40}" y="${wy}" width="26" height="34" fill="${lit && r() > 0.45 ? c : 'rgba(255,255,255,.16)'}"/>`; }
    o += `<rect x="600" y="760" width="960" height="4" fill="rgba(255,255,255,.4)"/>`;
  } else { // scaling: rising steps
    let pts = '', x = 640, y = 740; for (let i = 0; i < 7; i++) { const h = 40 + r() * 90; pts += `${x},${y} ${x + 132},${y} `; o += `<rect x="${x}" y="${y}" width="132" height="${760 - y + 4}" fill="rgba(255,255,255,${0.05 + i * 0.02})"/>`; x += 132; y -= h; }
    o += `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="8" stroke-linejoin="round"/><circle cx="${x}" cy="${y + 0}" r="0"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">${o}</svg>`;
}
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const only = process.argv.slice(2);
  for (const p of posts) { if (only.length && !only.includes(p.slug)) continue;
    const [code, c] = CAT[p.cat] || ['KD', '#4a9be6']; const r = rng(p.n * 7 + p.slug.length);
    await pg.setContent(`<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&family=JetBrains+Mono:wght@500&display=block" rel="stylesheet">
<body style="margin:0;width:1600px;height:900px;position:relative;overflow:hidden;background:#070b11;color:#e9eef5">
<div style="position:absolute;inset:0;background:radial-gradient(1100px 700px at 72% 55%, ${c}26, transparent 70%),linear-gradient(135deg,#0d141d,#070b11)"></div>
<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);background-size:80px 80px"></div>
${motif(p.cat, r, c)}
<div style="position:absolute;inset:0;background:linear-gradient(90deg,#070b11 0%,#070b11e6 26%,transparent 58%)"></div>
<img src="${logo}" style="position:absolute;left:96px;top:92px;height:44px">
<div style="position:absolute;left:96px;bottom:392px;font:500 28px 'JetBrains Mono';letter-spacing:.16em;color:#9ba9bb">KPI DRIVER BLOG</div>
<div style="position:absolute;left:88px;bottom:96px;font:700 160px/0.88 'Barlow Condensed';letter-spacing:-.01em;color:#fdfdfd">${code}<br><span style="color:${c}">Nº ${String(p.n).padStart(2, '0')}</span></div>
<div style="position:absolute;left:96px;bottom:60px;display:flex;gap:8px">${[c, c, c, 'rgba(255,255,255,.25)'].map((x, i) => `<i style="display:block;width:${i < (p.n % 4) + 1 ? 64 : 64}px;height:8px;background:${i <= p.n % 4 ? c : 'rgba(255,255,255,.25)'}"></i>`).join('')}</div>
</body>`, { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(ROOT, 'webflow/covers', `kd-cover-${p.slug}.jpg`), type: 'jpeg', quality: 84 }); }
  await b.close();
})();
