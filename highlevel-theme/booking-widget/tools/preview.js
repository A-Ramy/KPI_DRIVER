// Preview the KPI DRIVER theme on the LIVE HighLevel booking widget, without touching HighLevel.
// Loads the public widget, injects kd-booking-widget.css, and screenshots each step.
// It clicks a slot and "Select" to reach the details form, but never submits — no booking is created.
//
//   node highlevel-theme/booking-widget/tools/preview.js            # themed
//   node highlevel-theme/booking-widget/tools/preview.js --before   # HighLevel's current look
//   CAL=l4rvIxCnb9DtsSTM6SoQ node .../preview.js                    # another calendar
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CAL = process.env.CAL || '17jl7cP7dvOAU48s6C3L';
const BEFORE = process.argv.includes('--before');
const OUT = path.join(ROOT, 'screenshots');
// Same values as neo-settings: they flip HighLevel's widget into its native dark preset.
const QUERY = BEFORE ? '' : '?default=false&backgroundColor=%230d141d&primaryColor=%234a9be6';
const URL = `https://link.kpidriver.com/widget/booking/${CAL}${QUERY}`;
const CSS = fs.readFileSync(path.join(ROOT, 'kd-booking-widget.css'), 'utf8');
const tag = BEFORE ? 'before' : 'after';

async function open(browser, opts) {
  const page = await browser.newPage(opts);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  if (!BEFORE) await page.addStyleTag({ content: CSS });
  await page.waitForSelector('.widgets-time-slot, .vdpCell.selectable', { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(1200);
  return page;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const d = await open(browser, { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  await d.screenshot({ path: `${OUT}/${tag}-1-date.png` });
  const slot = d.locator('.widgets-time-slot').first();
  if (await slot.count()) {
    await slot.click();
    await d.waitForTimeout(700);
    await d.screenshot({ path: `${OUT}/${tag}-2-slot.png` });
    await d.getByRole('button', { name: 'Select' }).click();
    await d.waitForSelector('#_builder-form', { timeout: 20000 }).catch(() => {});
    await d.waitForTimeout(1500);
    await d.screenshot({ path: `${OUT}/${tag}-3-form.png` });
    // scroll the form to show radios / checkboxes / consent
    await d.evaluate(() => { const s = document.querySelector('.step-form'); if (s) s.scrollTop = s.scrollHeight * 0.55; });
    await d.waitForTimeout(400);
    await d.screenshot({ path: `${OUT}/${tag}-4-form-options.png` });
  } else {
    console.log('No open slots on the first visible day; skipped slot/form screenshots.');
  }

  const m = await open(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.screenshot({ path: `${OUT}/${tag}-5-mobile.png`, fullPage: true });

  await browser.close();
  console.log(`Saved ${tag} screenshots to ${path.relative(process.cwd(), OUT)}/`);
})();
