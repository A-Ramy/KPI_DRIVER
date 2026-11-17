// Builds the approval review: screenshots of both forms on desktop / tablet / mobile in dark and light,
// and real payloads for booking buttons across the site.
// Pages are served at their real www.kpidriver.com paths INSIDE the test browser (requests are intercepted,
// nothing is fetched from or sent to the live site). The forms run in mock mode: nothing reaches HighLevel.
// "What HighLevel receives" comes from running the generated n8n workflow in the simulator.
//   node booking-form/tools/review-capture.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { runWorkflow, fakeHL } = require('./n8n-sim');

const ROOT = path.resolve(__dirname, '..');            // booking-form/
const REPO = path.resolve(ROOT, '..');
const OUT = path.join(ROOT, 'review');
const IMG = path.join(OUT, 'img');
fs.mkdirSync(IMG, { recursive: true });

/* ---------- fake site pages ---------- */
const PAGES = {
  '/': { title: 'KPI DRIVER — CRM, KPI Tracking & AI Suite for Real Estate Investors', h1: 'The command center for <em class="hl-green">real estate investors.</em>', ctas: [['hero', 'Book a Discovery Call']] },
  '/es': { lang: 'es', title: 'KPI DRIVER — CRM y KPIs para inversionistas', h1: 'El centro de mando para <em class="hl-green">inversionistas.</em>', ctas: [['hero', 'Agenda una llamada']] },
  '/services': { title: 'Services | KPI DRIVER', h1: 'Two offerings. <em class="hl-green">One engine.</em>', ctas: [['services hero', 'Book a Discovery Call'], ['offer suite agent', 'Book a Discovery Call']] },
  '/services/crm': { title: 'CRM | KPI DRIVER', h1: 'The <em class="hl-blue">engine</em> of your operation.', ctas: [['crm hero', 'Book a Discovery Call']] },
  '/services/ai-suite': { title: 'AI Suite | KPI DRIVER', h1: 'Nitro for the <em class="hl-green">CRM engine.</em>', ctas: [['suite hero', 'Book a Discovery Call']] },
  '/our-team': { title: 'Our Team | KPI DRIVER', h1: 'Built by investors, <em class="hl-green">for investors.</em>', ctas: [] },
  '/blog/speed-to-lead-real-estate-investors': { title: 'Speed to Lead for Real Estate Investors | KPI DRIVER', h1: 'Speed to lead: the <em class="hl-amber">first five minutes.</em>', ctas: [] },
  '/book-discovery-call': { title: 'Book a Discovery Call | KPI DRIVER', h1: 'Book a <em class="hl-green">discovery call.</em>', ctas: [], inline: 'booking' },
  '/contact-us': { title: 'Contact Us | KPI DRIVER', h1: 'Talk to the <em class="hl-green">team.</em>', ctas: [], inline: 'contact' }
};
function pageHtml(p, theme) {
  const cfg = PAGES[p] || PAGES['/'];
  const cta = ([label, text]) => `<a class="btn btn--primary" href="https://link.kpidriver.com/widget/booking/x" data-book="x" data-label="${label}">${text}</a>`;
  const inline = cfg.inline === 'booking' ? '<div class="kd-inline" data-kd-booking></div>'
    : cfg.inline === 'contact' ? `<div class="split"><div class="stack stack--lg"><dl class="contact-list"><div><dt>Phone</dt><dd><span class="keep-case">(786) 822-8188</span></dd></div><div><dt>Email</dt><dd><span class="keep-case">info@kpidriver.com</span></dd></div><div><dt>Prefer a call?</dt><dd>${cta(['contact card', 'Book a Discovery Call'])}</dd></div></dl></div><div class="kd-inline" data-kd-contact></div></div>` : '';
  return `<!doctype html><html lang="${cfg.lang || 'en'}" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${cfg.title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/__kd/site.css"><link rel="stylesheet" href="/__kd/kd-booking.css">
<style>.kd-inline{background:var(--panel);border:1px solid var(--line-strong);border-radius:var(--radius);overflow:hidden}.nav{display:flex!important;position:static!important;background:none!important;border:0!important;padding:0!important;margin-left:auto}.nav-toggle{display:none!important}</style>
<script>window.KD_BOOKING_CONFIG={mock:true};</script></head><body>
<header class="site-header"><div class="wrap"><a class="brand" href="/"><img class="logo--dark" src="/__kd/logo-h-light.png" alt="KPI DRIVER" width="178" height="24"><img class="logo--light" src="/__kd/logo-h-dark.png" alt="" width="178" height="24"></a>
<nav class="nav"><a class="btn btn--primary btn--sm nav__cta" href="https://link.kpidriver.com/widget/booking/x" data-book="x" data-label="header">Book a Discovery Call</a></nav></div></header>
<main><section class="section section--grid"><div class="wrap stack stack--lg"><h1>${cfg.h1}</h1>${cfg.ctas.length ? `<div class="btn-row">${cfg.ctas.map(cta).join('')}</div>` : ''}${inline}</div></section></main>
<footer class="site-footer"><div class="wrap"><a href="https://link.kpidriver.com/widget/booking/x" data-book="x" data-label="footer">Book a Discovery Call</a></div></footer>
<script src="/__kd/kd-booking.js"></script></body></html>`;
}
const ASSETS = { 'site.css': path.join(REPO, 'src/assets/css/site.css'), 'kd-booking.css': path.join(ROOT, 'kd-booking.css'), 'kd-booking.js': path.join(ROOT, 'kd-booking.js'),
  'logo-h-light.png': path.join(REPO, 'src/assets/img/brand/logo-h-light.png'), 'logo-h-dark.png': path.join(REPO, 'src/assets/img/brand/logo-h-dark.png') };
const TYPES = { css: 'text/css', js: 'application/javascript', png: 'image/png' };
async function wire(context, theme) {
  await context.route('https://www.kpidriver.com/**', route => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith('/__kd/')) {
      const f = ASSETS[u.pathname.slice(6)];
      return route.fulfill({ status: 200, contentType: TYPES[f.split('.').pop()], body: fs.readFileSync(f) });
    }
    return route.fulfill({ status: 200, contentType: 'text/html', body: pageHtml(u.pathname.replace(/\/$/, '') || '/', theme) });
  });
}

/* ---------- sample people (fictional; example.com addresses, 555 numbers) ---------- */
const PEOPLE = {
  maria: { firstName: 'Maria', lastName: 'Gonzalez', email: 'maria@gonzalezhomebuyers.example.com', phone: '(305) 555-0142', businessName: 'Gonzalez Home Buyers LLC', address1: '1200 Brickell Ave', city: 'Miami', state: 'FL', postalCode: '33131',
    niche: 'Real Estate', plan: 'Enterprise Optimization Suite + AI Agent', outsource: 'Both (In-House & Outsourced)', leadSourceCount: '4 - 6', leadSources: ['Cold Calling', 'SMS', 'PPL', 'Direct Mailer'], leadEntry: ['Submitting Forms Directly Into the System (CRM)', 'Manual Entry'],
    agentsCold: '4', agentsSms: '2', pplProviders: '3', needCrm: 'Yes', useCrm: 'Yes', whichCrm: 'Podio', crmAutomations: 'No', crmFor: 'ACQ & Dispo', salesReps: '3',
    kpis: 'Weekly spreadsheet from each acquisition manager, mostly calls and offers made.', pnl: 'QuickBooks plus a deal tracker in Google Sheets.', heardFrom: 'Google Search',
    difficulties: 'Leads fall through the cracks between cold calling and follow-up. No single view of the pipeline.', expectations: 'One CRM with dashboards, automated follow-up and clear KPIs per rep.', startWhen: 'ASAP' },
  derek: { firstName: 'Derek', lastName: 'Shaw', email: 'derek@shawcapital.example.com', phone: '(512) 555-0178', businessName: 'Shaw Capital Partners', address1: '600 Congress Ave', city: 'Austin', state: 'TX', postalCode: '78701',
    niche: 'Real Estate', plan: "Don't Know Yet", outsource: 'No (In-House Only)', leadSourceCount: '1 - 3', leadSources: ['PPC', 'SEO'], leadEntry: ['Direct Integration With The Platform'],
    agentsCold: '0', agentsSms: '1', pplProviders: '0', needCrm: 'Yes', useCrm: 'No', whichCrm: 'None', crmAutomations: 'No', crmFor: 'ACQ', salesReps: '1',
    kpis: 'We do not track KPIs consistently yet.', pnl: 'Our accountant sends a monthly P&L.', heardFrom: 'Linkedin',
    difficulties: 'Growing from 2 to 6 people and losing track of who is following up with whom.', expectations: 'A system our new hires can use from day one.', startWhen: 'Next Month' },
  ana: { firstName: 'Ana', lastName: 'Ríos', email: 'ana@riosinversiones.example.com', phone: '+52 55 5555 0199', businessName: 'Ríos Inversiones', address1: 'Av. Reforma 250', city: 'Ciudad de México', state: 'CDMX', postalCode: '06600', country: 'MX',
    niche: 'Real Estate', plan: 'Enterprise Optimization Suite', outsource: 'Yes (Outsourced Only)', leadSourceCount: '1 - 3', leadSources: ['SMS', 'On-Market'], leadEntry: ['Google Sheets'],
    agentsCold: '0', agentsSms: '3', pplProviders: '1', needCrm: 'Yes', useCrm: 'Yes', whichCrm: 'Other', crmAutomations: 'Yes', crmFor: 'Dispo', salesReps: '2',
    kpis: 'Monthly closings only.', pnl: 'Excel workbook.', heardFrom: 'Instagram',
    difficulties: 'Spanish-speaking sellers and English-speaking buyers in two different tools.', expectations: 'Bilingual follow-up from one place.', startWhen: 'Start of Next Quarter' },
  tom: { firstName: 'Tom', lastName: 'Becker', email: 'tom@beckerpropertygroup.example.com', phone: '(614) 555-0110', businessName: 'Becker Property Group', address1: '41 S High St', city: 'Columbus', state: 'OH', postalCode: '43215',
    niche: 'Real Estate', plan: 'Enterprise Optimization Suite', outsource: 'Yes (Outsourced Only)', leadSourceCount: '7 - 9', leadSources: ['Cold Calling', 'SMS', 'PPC', 'PPL', 'Direct Mailer', 'TV Advertising', 'Radio Advertising'], leadEntry: ['Submitting Forms Indirectly Via 3rd Party (eg. Zapier)'],
    agentsCold: '12', agentsSms: '4', pplProviders: '5', needCrm: 'No', useCrm: 'Yes', whichCrm: 'GHL', crmAutomations: 'Yes', crmFor: 'ACQ & Dispo', salesReps: '6',
    kpis: 'Dashboards in our current CRM, but they do not match finance numbers.', pnl: 'Bookkeeper, monthly.', heardFrom: 'Referral',
    difficulties: 'Cost per contract by lead source is a guess.', expectations: 'Trustworthy cost-per-contract and AI call scoring.', startWhen: 'ASAP' }
};

async function fill(page, who) {
  await page.evaluate(person => {
    const root = document.querySelector('.kdb-dialog[open] .kdb') || document.querySelector('[data-kd-booking] .kdb, [data-kd-contact] .kdb');
    root.querySelectorAll('[data-field]').forEach(box => {
      const name = box.dataset.field, want = person[name];
      const radios = box.querySelectorAll('input[type=radio]'), checks = box.querySelectorAll('input[type=checkbox]');
      const sel = box.querySelector('select'), txt = box.querySelector('input.kdb__input, textarea');
      if (name === 'smsConsent') { const c = box.querySelector('input'); if (!c.checked) c.click(); return; }
      if (radios.length) { const r = [...radios].find(x => x.value === want) || radios[0]; r.click(); }
      else if (checks.length) { [...checks].forEach(c => { if ((want || []).includes(c.value) !== c.checked) c.click(); }); }
      else if (sel) { if (want) sel.value = want; else if (!sel.value) sel.value = sel.options[1].value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      else if (txt && want != null) { txt.value = want; txt.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  }, PEOPLE[who]);
}
const primary = '.kdb__btn--primary';

/* ---------- screenshots ---------- */
const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
};
async function fullDialogShot(page, dev, file) {
  // grow the viewport so the whole step shows in one image (on a device it scrolls)
  const need = await page.evaluate(() => { const d = document.querySelector('.kdb-dialog[open]'); return d.querySelector('.kdb-dialog__bar').offsetHeight + d.querySelector('.kdb-dialog__body').scrollHeight + 4; });
  const base = DEVICES[dev].viewport;
  await page.setViewportSize({ width: base.width, height: Math.max(base.height, need + (dev === 'mobile' ? 0 : 48)) });
  await page.evaluate(() => document.querySelector('.kdb-dialog__body').scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(IMG, file), type: 'jpeg', quality: 82 });
  await page.setViewportSize(base);
}
async function captureViews(browser) {
  const shots = [];
  for (const theme of ['dark', 'light']) for (const dev of Object.keys(DEVICES)) {
    const ctx = await browser.newContext({ ...DEVICES[dev], timezoneId: 'America/New_York', colorScheme: theme });
    await wire(ctx, theme);
    const p = await ctx.newPage();
    // booking
    await p.goto('https://www.kpidriver.com/'); await p.evaluate(() => document.fonts.ready);
    await p.click('.site-header [data-book]');
    await p.waitForSelector('.kdb-dialog[open] .kdb__slot');
    await p.click('.kdb-dialog .kdb__slot >> nth=2');
    const steps = [];
    const snap = async (key, label) => { const f = `booking-${key}-${dev}-${theme}.jpg`; await fullDialogShot(p, dev, f); steps.push({ key, label, file: f }); };
    await snap('1-time', 'Pick a time');
    await p.click(`.kdb-dialog ${primary}`); await p.waitForSelector('.kdb-dialog [data-field="firstName"]');
    await p.click(`.kdb-dialog ${primary}`); await p.waitForTimeout(300);
    await snap('2-errors', 'Missing answers');
    await fill(p, 'maria'); await p.waitForTimeout(150);
    await snap('3-about', 'About you');
    await p.click(`.kdb-dialog ${primary}`); await fill(p, 'maria'); await snap('4-leads', 'Your lead flow');
    await p.click(`.kdb-dialog ${primary}`); await fill(p, 'maria'); await snap('5-crm', 'Your CRM');
    await p.click(`.kdb-dialog ${primary}`); await fill(p, 'maria'); await snap('6-goals', 'Your goals');
    await p.click(`.kdb-dialog ${primary}`); await p.waitForSelector('.kdb-dialog .kdb--done'); await snap('7-done', 'Confirmed');
    shots.push({ form: 'booking', theme, dev, steps });
    // contact
    await p.goto('https://www.kpidriver.com/contact-us'); await p.evaluate(() => document.fonts.ready);
    await p.waitForSelector('[data-kd-contact] .kdb');
    await p.addStyleTag({ content: '.site-header{position:static!important}' }); // long element shots: keep the sticky header out of the way
    const sec = p.locator('main .section');
    const csteps = [];
    const csnap = async (key, label) => { const f = `contact-${key}-${dev}-${theme}.jpg`; await sec.screenshot({ path: path.join(IMG, f), type: 'jpeg', quality: 82 }); csteps.push({ key, label, file: f }); };
    await csnap('1-empty', 'Contact form');
    await p.click(`[data-kd-contact] ${primary}`); await p.waitForTimeout(300); await csnap('2-errors', 'Missing answers');
    await p.evaluate(() => { const f = document.querySelector('[data-kd-contact]'); const set = (n, v) => { const el = f.querySelector(`[name="${n}"]`); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      set('firstName', 'Derek'); set('lastName', 'Shaw'); set('email', 'derek@shawcapital.example.com'); set('businessName', 'Shaw Capital Partners'); set('plan', "Don't Know Yet");
      set('message', 'We are growing from 2 to 6 people. Can the CRM handle separate acquisition and dispo teams?'); const c = f.querySelector('[name="smsConsent"]'); if (!c.checked) c.click(); });
    await p.waitForTimeout(200); await csnap('3-filled', 'Filled in');
    await p.click(`[data-kd-contact] ${primary}`); await p.waitForSelector('[data-kd-contact] .kdb--done'); await csnap('4-sent', 'Message sent');
    shots.push({ form: 'contact', theme, dev, steps: csteps });
    await ctx.close();
    console.log(`views: ${theme} ${dev}`);
  }
  return shots;
}

/* ---------- payload scenarios ---------- */
const SCENARIOS = [
  { id: 'home-header', title: 'Header button on the home page', visits: ['/'], click: '.site-header [data-book]', who: 'maria', tz: 'America/New_York', slot: 2 },
  { id: 'home-hero', title: 'Hero button on the home page', visits: ['/'], click: '[data-label="hero"]', who: 'derek', tz: 'America/Chicago', slot: 0 },
  { id: 'crm-hero', title: 'Hero button on the CRM service page', visits: ['/services/crm'], click: '[data-label="crm hero"]', who: 'tom', tz: 'America/New_York', slot: 4 },
  { id: 'services-offer', title: '“Suite + AI Agent” offer on the Services page', visits: ['/services'], click: '[data-label="offer suite agent"]', who: 'maria', tz: 'America/New_York', slot: 1 },
  { id: 'blog-header', title: 'Header button while reading a blog post', visits: ['/blog/speed-to-lead-real-estate-investors'], click: '.site-header [data-book]', who: 'derek', tz: 'America/Denver', slot: 3 },
  { id: 'team-footer', title: 'Footer link on the Our Team page', visits: ['/our-team'], click: '.site-footer [data-book]', who: 'tom', tz: 'America/New_York', slot: 0 },
  { id: 'es-hero', title: 'Spanish home page, visitor in Mexico City', visits: ['/es'], click: '[data-label="hero"]', who: 'ana', tz: 'America/Mexico_City', slot: 2 },
  { id: 'facebook-ai-suite', title: 'Facebook ad → browses → books from the AI Suite page', visits: ['/?utm_source=facebook&utm_medium=paid_social&utm_campaign=nov-investors&utm_content=video-a&fbclid=IwAR0demo123', '/services/ai-suite'], click: '[data-label="suite hero"]', who: 'maria', tz: 'America/New_York', slot: 1, referrer: 'https://l.facebook.com/' },
  { id: 'booking-page', title: 'Inline form on the Book a Discovery Call page', visits: ['/book-discovery-call'], inline: 'booking', who: 'derek', tz: 'America/Los_Angeles', slot: 0 },
  { id: 'contact-card', title: '“Book a Discovery Call” on the Contact Us page', visits: ['/contact-us'], click: '[data-label="contact card"]', who: 'tom', tz: 'America/New_York', slot: 2 },
  { id: 'contact-form', title: 'Contact form on the Contact Us page', visits: ['/contact-us'], contact: true, who: 'derek', tz: 'America/Chicago', message: 'We are growing from 2 to 6 people. Can the CRM handle separate acquisition and dispo teams?' },
  { id: 'google-contact', title: 'Google ad → Contact form', visits: ['/contact-us?utm_source=google&utm_medium=cpc&utm_campaign=crm-for-investors&utm_term=real+estate+crm&gclid=Cj0KCQdemo456'], contact: true, who: 'maria', tz: 'America/New_York', message: 'Do you migrate data from Podio? We have about 40,000 records.', referrer: 'https://www.google.com/' }
];

async function runScenario(browser, sc) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: sc.tz });
  await wire(ctx, 'dark');
  const p = await ctx.newPage();
  for (let i = 0; i < sc.visits.length; i++) await p.goto('https://www.kpidriver.com' + sc.visits[i], i === 0 && sc.referrer ? { referer: sc.referrer } : {});
  await p.evaluate(() => { window.KD_BOOKING_LAST_PAYLOAD = null; });
  let root;
  if (sc.contact) {
    root = '[data-kd-contact]';
    await p.waitForSelector(`${root} .kdb`);
    await fill(p, sc.who);
    await p.evaluate(m => { const el = document.querySelector('[data-kd-contact] [name="message"]'); el.value = m; el.dispatchEvent(new Event('input', { bubbles: true })); }, sc.message);
    await p.click(`${root} ${primary}`);
  } else {
    if (sc.inline) root = '[data-kd-booking]'; else { await p.click(sc.click); root = '.kdb-dialog[open]'; }
    await p.waitForSelector(`${root} .kdb__slot`);
    await p.click(`${root} .kdb__slot >> nth=${sc.slot}`);
    await p.click(`${root} ${primary}`);
    for (let s = 2; s <= 5; s++) { await p.waitForSelector(`${root} [data-field]`); await fill(p, sc.who); await p.click(`${root} ${primary}`); await p.waitForTimeout(200); }
  }
  await p.waitForFunction(() => window.KD_BOOKING_LAST_PAYLOAD, null, { timeout: 15000 });
  const payload = await p.evaluate(() => window.KD_BOOKING_LAST_PAYLOAD);
  const pageUrl = await p.evaluate(() => location.href);
  await ctx.close();
  const out = { ...sc, page_url: pageUrl, payload, destination: sc.contact ? 'HighLevel inbound webhook (contact workflow)' : 'n8n → HighLevel API' };
  if (!sc.contact) {
    const wf = JSON.parse(fs.readFileSync(path.join(ROOT, 'n8n', 'kd-booking-create.json'), 'utf8'));
    const r = runWorkflow(wf, { body: payload, headers: { 'x-forwarded-for': '198.51.100.23' } }, fakeHL());
    const [upsert, appt, tags, note] = r.calls;
    out.highlevel = { response: r.response, upsert: upsert.body, appointment: appt.body, tags: tags.body.tags, note: note.body.body };
  }
  console.log(`scenario: ${sc.id} → ${payload.booking_source}`);
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const scenarios = [];
  for (const sc of SCENARIOS) scenarios.push(await runScenario(browser, sc));
  const views = process.argv.includes('--no-views') ? JSON.parse(fs.readFileSync(path.join(OUT, 'data.json'), 'utf8')).views : await captureViews(browser);
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify({ generated: new Date().toISOString(), views, scenarios }, null, 2));
  console.log('wrote review/data.json');
})();
