// REAL submissions through the built site: 2 bookings from random booking buttons, 2 contact forms from
// random placements. Bookings go through the local bridge (real HighLevel, normal automations); contact forms
// post to the real HighLevel inbound webhook. Records are kept for review; ids go to review/live-tests.json.
//   NODE_USE_ENV_PROXY=1 node booking-form/tools/live-site-tests.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { wire } = require('./site-harness');

const OUT = path.resolve(__dirname, '../review');
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

const BOOKING_BUTTONS = [
  ['/', '#lifecycle .section-cta a'], ['/', '#onboarding .section-cta a'], ['/', '.site-header [data-book]'],
  ['/services', '#offerings [data-book] >> nth=0'], ['/services/crm', '#kpis .section-cta a'], ['/services/crm', '#mobile .section-cta a'],
  ['/services/ai-suite', '#capture .section-cta a'], ['/services/ai-agent', '#how .section-cta a'], ['/our-team', '#team .section-cta a'],
  ['/es', '#workflow .section-cta a'], ['/?utm_source=facebook&utm_medium=paid_social&utm_campaign=nov-investors&fbclid=IwAR0kdtest', '#visibility .section-cta a']
];
const CONTACT_FORMS = [
  ['/', '#faq [data-kd-contact]'], ['/services', '#faq [data-kd-contact]'], ['/services/crm', '#faq [data-kd-contact]'],
  ['/services/ai-suite', '#faq [data-kd-contact]'], ['/services/ai-agent', '#faq [data-kd-contact]'], ['/contact-us', 'main [data-kd-contact] >> nth=0'],
  ['/contact-us?utm_source=google&utm_medium=cpc&utm_campaign=crm-for-investors&gclid=Cj0kdtest', 'main [data-kd-contact] >> nth=0']
];
const PEOPLE = shuffle([
  ['Marcus', 'Bell', 'Bell Property Solutions', 'Atlanta', 'GA', '30303', '191 Peachtree St NE'],
  ['Elena', 'Vasquez', 'Vasquez Home Offers', 'San Antonio', 'TX', '78205', '300 Alamo Plaza'],
  ['Priya', 'Nair', 'Nair Capital Group', 'Charlotte', 'NC', '28202', '101 S Tryon St'],
  ['Jordan', 'Whitfield', 'Whitfield Acquisitions', 'Phoenix', 'AZ', '85004', '2 N Central Ave'],
  ['Danielle', 'Okafor', 'Okafor Realty Investments', 'Tampa', 'FL', '33602', '400 N Ashley Dr'],
  ['Kevin', 'Brandt', 'Brandt Rentals', 'Columbus', 'OH', '43215', '41 S High St']
]);
const TEXT = {
  kpis: ['Weekly spreadsheet per acquisition manager.', 'Mostly gut feel and closed deals per month.', 'Dashboards in our current CRM, but nobody trusts them.'],
  pnl: ['QuickBooks plus a bookkeeper.', 'Excel workbook updated monthly.', 'Our CPA sends a quarterly P&L.'],
  difficulties: ['Follow-up falls through the cracks after the first call.', 'We cannot see cost per contract by lead source.', 'Too many tools that do not talk to each other.'],
  expectations: ['One system for acquisitions and dispositions with clear KPIs.', 'Automated follow-up and coaching on calls.', 'A setup my new hires can use from day one.'],
  message: ['Can you migrate our data from Podio? Roughly 30,000 records.', 'We run two markets. Can each team have its own pipeline?', 'Interested in the AI Agent for after-hours follow-up. What does setup look like?']
};

async function fillStep(page, root, person, n) {
  await page.evaluate(({ root, person, n, TEXT }) => {
    const r = document.querySelector(root);
    const rnd = a => a[Math.floor(Math.random() * a.length)];
    const vals = { firstName: person[0], lastName: person[1], email: `${person[0]}.${person[1]}.kdtest${n}@example.com`.toLowerCase(), phone: `(305) 555-01${String(10 + n * 7).slice(-2)}`,
      businessName: person[2], city: person[3], state: person[4], postalCode: person[5], address1: person[6] };
    r.querySelectorAll('[data-field]').forEach(box => {
      const name = box.dataset.field;
      const radios = [...box.querySelectorAll('input[type=radio]')], checks = [...box.querySelectorAll('input[type=checkbox]')];
      const sel = box.querySelector('select'), txt = box.querySelector('input.kdb__input, textarea');
      if (name === 'smsConsent') { const c = box.querySelector('input'); if (!c.checked) c.click(); return; }
      if (radios.length) rnd(radios).click();
      else if (checks.length) { checks.forEach(c => c.checked && c.click()); [...new Set([rnd(checks), rnd(checks), rnd(checks)])].forEach(c => c.click()); }
      else if (sel) { if (!sel.value || name !== 'country') sel.value = name === 'tzField' && sel.value ? sel.value : rnd([...sel.options].slice(1)).value; if (name === 'country') sel.value = 'US'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      else if (txt) { txt.value = vals[name] || (TEXT[name] ? rnd(TEXT[name]) : (txt.placeholder === 'Put 0 if None' ? String(Math.floor(Math.random() * 8)) : 'n/a')); txt.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  }, { root, person, n, TEXT });
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const bookings = shuffle(BOOKING_BUTTONS).slice(0, 2), contacts = shuffle(CONTACT_FORMS).slice(0, 2);
  let n = 0;
  for (const [url, sel] of bookings) {
    n++;
    const person = PEOPLE.pop();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: pick(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']) });
    const calls = await wire(ctx);
    const p = await ctx.newPage();
    await p.goto('https://www.kpidriver.com' + url, { referer: url.includes('utm_source') ? 'https://l.facebook.com/' : undefined });
    await p.waitForTimeout(1200);
    const btn = p.locator(sel).first(); await btn.scrollIntoViewIfNeeded(); await btn.click();
    const root = '.kdb-dialog[open]';
    await p.waitForSelector(`${root} .kdb__day.is-open`, { timeout: 30000 });
    // a random open day 1-3 weeks out (next month if needed), then a random time
    for (let tries = 0; tries < 3; tries++) {
      const days = await p.$$eval(`${root} .kdb__day.is-open`, (els) => els.map(e => e.getAttribute('data-day')));
      const ok = days.filter(d => { const t = Date.parse(d + 'T12:00:00Z'); return t > Date.now() + 7 * 864e5 && t < Date.now() + 21 * 864e5; });
      if (ok.length) { await p.click(`${root} .kdb__day[data-day="${pick(ok)}"]`); break; }
      await p.click(`${root} .kdb__nav[aria-label="Next month"]`); await p.waitForSelector(`${root} .kdb__day.is-open`, { timeout: 30000 });
    }
    const slots = await p.$$(`${root} .kdb__slot`); await pick(slots).click();
    await p.click(`${root} .kdb__btn--primary`);
    for (let step = 2; step <= 5; step++) { await p.waitForSelector(`${root} [data-field]`); await fillStep(p, root, person, n); await p.click(`${root} .kdb__btn--primary`); await p.waitForTimeout(250); }
    await p.waitForSelector(`${root} .kdb--done, ${root} .kdb__msg:not(:empty)`, { timeout: 45000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(OUT, `live-booking-${n}.png`) });
    const book = calls.find(c => c.url.endsWith('/book'));
    const sent = book ? JSON.parse(book.sent) : null, res = book ? JSON.parse(book.body) : null;
    results.push({ kind: 'booking', page: url, button: sel, source: sent && sent.booking_source, campaign: sent && sent.campaign, person: `${person[0]} ${person[1]}`, email: sent && sent.contact.email,
      call: sent && sent.slot.display, timezone: sent && sent.slot.timezone, ok: res && res.ok, appointmentId: res && res.appointment && res.appointment.id, contactId: res && res.contactId, error: res && !res.ok ? res : undefined });
    console.log(`booking ${n}: ${url} ${sel} → ${sent && sent.booking_source} · ${res && res.ok ? 'BOOKED ' + res.appointment.id : JSON.stringify(res)}`);
    await ctx.close();
  }
  for (const [url, sel] of contacts) {
    n++;
    const person = PEOPLE.pop();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await wire(ctx, { bridge: false });
    const p = await ctx.newPage();
    let posted = null, status = null;
    p.on('request', r => { if (r.url().includes('/hooks/') && r.method() === 'POST') posted = r.postData(); });
    p.on('response', r => { if (r.url().includes('/hooks/') && r.request().method() === 'POST') status = r.status(); });
    await p.goto('https://www.kpidriver.com' + url, { referer: url.includes('utm_source') ? 'https://www.google.com/' : undefined });
    await p.waitForTimeout(1200);
    const form = p.locator(sel).first(); await form.scrollIntoViewIfNeeded();
    const rootSel = await form.evaluate(el => { el.setAttribute('data-test-target', '1'); return '[data-test-target="1"]'; });
    for (let step = 1; step <= 2; step++) {        // two steps: details, then the inquiry (consent carries over)
      await fillStep(p, rootSel, person, n);
      await p.click(`${rootSel} .kdb__btn--primary`); await p.waitForTimeout(300);
    }
    await p.waitForSelector(`${rootSel} .kdb--done, ${rootSel} .kdb__msg:not(:empty)`, { timeout: 30000 });
    await p.waitForTimeout(800);
    await form.screenshot({ path: path.join(OUT, `live-contact-${n - 2}.png`) });
    const sent = posted ? JSON.parse(posted) : null;
    results.push({ kind: 'contact', page: url, form: sel, source: sent && sent.booking_source, campaign: sent && sent.campaign, person: `${person[0]} ${person[1]}`, email: sent && sent.email, webhookStatus: status, ok: status >= 200 && status < 300 });
    console.log(`contact ${n - 2}: ${url} → ${sent && sent.booking_source} · webhook HTTP ${status}`);
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'live-tests.json'), JSON.stringify({ sent: new Date().toISOString(), results }, null, 2));
  console.log('saved review/live-tests.json');
})();
