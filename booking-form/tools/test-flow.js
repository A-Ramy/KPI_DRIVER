// End-to-end check of the booking form demo (mock mode, nothing is sent anywhere).
// Opens the demo from disk, books a call from the header CTA, checks validation,
// the source label, the payload shape, and saves screenshots for review.
//   node booking-form/tools/test-flow.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'demo', 'index.html');
const OUT = path.join(ROOT, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; };

async function fillStep(p) {
  // fill whatever the current step asks for, using the first sensible option
  await p.evaluate(() => {
    const dlg = document.querySelector('.kdb-dialog .kdb') || document.querySelector('.kdb');
    const vals = { firstName: 'Test', lastName: 'Driver', email: 'test.driver@example.com', phone: '(305) 555-0142', businessName: 'Example Holdings', address1: '100 Main St', city: 'Miami', state: 'FL', postalCode: '33101' };
    dlg.querySelectorAll('[data-field]').forEach(box => {
      const name = box.dataset.field;
      const radios = box.querySelectorAll('input[type=radio]'), checks = box.querySelectorAll('input[type=checkbox]');
      const sel = box.querySelector('select'), txt = box.querySelector('input.kdb__input, textarea');
      if (radios.length) { radios[0].click(); }
      else if (checks.length) { checks[0].click(); if (checks[1]) checks[1].click(); }
      else if (sel) { if (!sel.value) { sel.value = sel.options[1].value; } sel.dispatchEvent(new Event('change', { bubbles: true })); }
      else if (txt) { txt.value = vals[name] || (txt.placeholder === 'Put 0 if None' ? '3' : 'Answer for ' + name); txt.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  });
}

(async () => {
  const browser = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, timezoneId: 'America/New_York' });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(URL); await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await p.evaluate(() => document.fonts.ready);
    await p.click('.site-header [data-book]');
    await p.waitForSelector('.kdb-dialog[open] .kdb__day.is-open');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${theme}-1-time.png` });
    // continue without a slot → message
    await p.click('.kdb-dialog .kdb__btn--primary');
    check(/Pick a day/.test(await p.textContent('.kdb-dialog .kdb__msg')), `${theme}: needs a slot before continuing`);
    await p.click('.kdb-dialog .kdb__slot >> nth=1');
    await p.click('.kdb-dialog .kdb__btn--primary');
    await p.waitForSelector('.kdb-dialog [data-field="firstName"]');
    // empty submit → field errors
    await p.click('.kdb-dialog .kdb__btn--primary');
    const errs = await p.$$eval('.kdb-dialog .kdb__field.is-invalid', els => els.length);
    check(errs >= 5, `${theme}: step 2 flags ${errs} required fields when empty`);
    await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('.kdb-dialog__body').scrollTo(0, 0));
    await p.screenshot({ path: `${OUT}/${theme}-2-errors.png` });
    for (let step = 2; step <= 5; step++) {
      await fillStep(p);
      if (step === 2) { await p.evaluate(() => document.querySelector('.kdb-dialog__body').scrollTo(0, 0)); await p.screenshot({ path: `${OUT}/${theme}-3-you.png` }); }
      if (step === 3) { await p.evaluate(() => document.querySelector('.kdb-dialog__body').scrollTo(0, 0)); await p.screenshot({ path: `${OUT}/${theme}-4-marketing.png` }); }
      if (step === 5) { await p.evaluate(() => document.querySelector('.kdb-dialog__body').scrollTo(0, 1e6)); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/${theme}-5-goals.png` }); }
      await p.click('.kdb-dialog .kdb__btn--primary');
      await p.waitForTimeout(step === 5 ? 1200 : 350);
    }
    await p.waitForSelector('.kdb-dialog .kdb--done');
    await p.screenshot({ path: `${OUT}/${theme}-6-done.png` });
    const pay = await p.evaluate(() => window.KD_BOOKING_LAST_PAYLOAD);
    check(pay && pay.booking_source === 'Home – Header', `${theme}: booking_source = "${pay && pay.booking_source}"`);
    check(pay && pay.campaign === 'Business Discovery (SEO) Home – Header', `${theme}: campaign = "${pay && pay.campaign}"`);
    check(pay && pay.customFields.length >= 24, `${theme}: ${pay && pay.customFields.length} custom fields in payload`);
    check(pay && pay.contact.email && pay.contact.timezone === 'America/New_York', `${theme}: contact + time zone captured`);
    check(pay && pay.slot && new Date(pay.slot.end) - new Date(pay.slot.start) === 45 * 60000, `${theme}: 45-minute slot`);
    check(pay && pay.consent.sms === true && /STOP to unsubscribe/.test(pay.consent.text), `${theme}: SMS consent text + flag recorded`);
    check(errors.length === 0, `${theme}: no page errors ${errors.join(' | ')}`);
    if (theme === 'dark') fs.writeFileSync(path.join(OUT, 'sample-payload.json'), JSON.stringify(pay, null, 2));
    await p.close();
  }

  // source labels for other CTAs + time zone switch
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Los_Angeles' });
  await p.goto(URL);
  await p.click('.hero [data-book]'); await p.waitForSelector('.kdb-dialog[open] .kdb__slot');
  const tz = await p.inputValue('.kdb-dialog .kdb__tz');
  check(tz === 'America/Los_Angeles', `defaults to the visitor's time zone (${tz})`);
  const before = await p.textContent('.kdb-dialog .kdb__slot');
  await p.selectOption('.kdb-dialog .kdb__tz', 'America/New_York'); await p.waitForSelector('.kdb-dialog .kdb__slot');
  const after = await p.textContent('.kdb-dialog .kdb__slot');
  check(before !== after, `switching time zone re-labels slots (${before.trim()} PT → ${after.trim()} ET)`);
  const src = await p.evaluate(() => [...document.querySelectorAll('[data-book],[data-kd-book]')].map(a => window.KDBooking.sourceFrom(a)));
  check(JSON.stringify(src) === JSON.stringify(['Home – Header', 'Home – Hero', 'Home – CTA Band', 'Home – Footer']), `CTA sources: ${src.join(' | ')}`);
  await p.close();

  // mobile
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'America/New_York' });
  await m.goto(URL); await m.evaluate(() => document.fonts.ready);
  await m.tap('.site-header [data-book]'); await m.waitForSelector('.kdb-dialog[open] .kdb__slot'); await m.waitForTimeout(300);
  await m.screenshot({ path: `${OUT}/mobile-1-time.png` });
  await m.tap('.kdb-dialog .kdb__slot >> nth=0'); await m.tap('.kdb-dialog .kdb__btn--primary'); await m.waitForSelector('.kdb-dialog [data-field="firstName"]');
  await m.tap('.kdb-dialog .kdb__btn--primary'); await m.waitForTimeout(400);
  await m.evaluate(() => document.querySelector('.kdb-dialog__body').scrollTo(0, 0)); await m.waitForTimeout(200);
  await m.screenshot({ path: `${OUT}/mobile-2-you.png` });
  const overflow = await m.evaluate(() => document.querySelector('.kdb-dialog').scrollWidth > window.innerWidth + 1);
  check(!overflow, 'mobile: no horizontal overflow');
  await m.close();

  // contact form (inline on the contact page)
  for (const theme of ['dark', 'light']) {
    const c = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    const cerr = []; c.on('pageerror', e => cerr.push(e.message));
    await c.goto('file://' + path.join(ROOT, 'demo', 'contact.html'));
    await c.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await c.evaluate(() => document.fonts.ready); await c.waitForSelector('[data-kd-contact] .kdb');
    await c.screenshot({ path: `${OUT}/${theme}-contact-1.png` });
    await c.click('[data-kd-contact] .kdb__btn--primary');
    const bad = await c.$$eval('[data-kd-contact] .kdb__field.is-invalid', e => e.length);
    check(bad === 6, `${theme} contact: flags ${bad} required fields when empty (expect 6, message optional)`);
    await c.evaluate(() => {
      const f = document.querySelector('[data-kd-contact]');
      const set = (n, v) => { const el = f.querySelector(`[name="${n}"]`); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      set('firstName', 'Test'); set('lastName', 'Driver'); set('email', 'test.driver@example.com'); set('businessName', 'Example Holdings');
      set('plan', "Don't Know Yet"); set('message', 'Hello from the demo.'); f.querySelector('[name="smsConsent"]').click();
    });
    await c.click('[data-kd-contact] .kdb__btn--primary'); await c.waitForSelector('[data-kd-contact] .kdb--done');
    await c.screenshot({ path: `${OUT}/${theme}-contact-2-sent.png` });
    const cp = await c.evaluate(() => window.KD_BOOKING_LAST_PAYLOAD);
    check(cp.form === 'contact' && cp.first_name === 'Test' && cp.email === 'test.driver@example.com' && cp.your_message === 'Hello from the demo.', `${theme} contact: flat webhook payload`);
    check(cp.booking_source === 'Contact Us – Inquiry Form' && cp.campaign === 'Contact Us (SEO) Contact Us – Inquiry Form', `${theme} contact: source "${cp.booking_source}", campaign "${cp.campaign}"`);
    check(cp.sms_consent === 'Yes' && /822-8188/.test(cp.consent_text) && /Hello from the demo/.test(cp.note), `${theme} contact: consent + note included`);
    check(Object.values(cp).every(v => typeof v === 'string'), `${theme} contact: every value is a plain string (easy HighLevel mapping)`);
    check(cerr.length === 0, `${theme} contact: no page errors ${cerr.join(' | ')}`);
    if (theme === 'dark') fs.writeFileSync(path.join(OUT, 'sample-payload-contact.json'), JSON.stringify(cp, null, 2));
    await c.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
