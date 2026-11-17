// Preview the KPI DRIVER theme on the LIVE HighLevel booking widget, without touching HighLevel.
// Loads the public widget, injects kd-booking-widget.css, and screenshots each step.
// It clicks a slot and "Select" to reach the details form, but never submits: no booking is created.
//
//   node highlevel-theme/booking-widget/tools/preview.js           # dark + light + auto (OS light)
//   node highlevel-theme/booking-widget/tools/preview.js dark      # one theme
//   node highlevel-theme/booking-widget/tools/preview.js before    # HighLevel's current look
//   CAL=l4rvIxCnb9DtsSTM6SoQ node .../preview.js                   # another calendar
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CAL = process.env.CAL || '17jl7cP7dvOAU48s6C3L';
const CSS = fs.readFileSync(path.join(ROOT, 'kd-booking-widget.css'), 'utf8');
const BASE = `https://link.kpidriver.com/widget/booking/${CAL}`;

// How each theme is reached. "dark"/"light" = the site forces it through the URL (see README).
// "auto" = no theme in the URL, so the widget follows the visitor's OS (emulated here as light).
const MODES = {
  before: { query: '', css: false, scheme: 'light' },
  dark:   { query: '?default=false&backgroundColor=%23070b11&primaryColor=%234a9be6', css: true, scheme: 'light' },
  light:  { query: '?default=false&backgroundColor=%23fdfdfd&primaryColor=%231f65a8', css: true, scheme: 'dark' },
  auto:   { query: '?default=false&backgroundColor=%230d141d&primaryColor=%234a9be6', css: true, scheme: 'light' },
};
// dark is captured with the OS set to light, and light with the OS set to dark,
// to prove the URL choice wins over the OS.

async function open(browser, mode, opts) {
  const page = await browser.newPage({ ...opts, colorScheme: mode.scheme });
  await page.goto(BASE + mode.query, { waitUntil: 'networkidle', timeout: 60000 });
  if (mode.css) await page.addStyleTag({ content: CSS });
  await page.waitForSelector('.vdpCell.selectable', { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(1200);
  return page;
}

async function toForm(page, mobile) {
  if (mobile) { await page.locator('.vdpCell.selectable').first().click(); await page.waitForTimeout(900); }
  await page.locator('.widgets-time-slot').first().click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Select' }).click();
  await page.waitForSelector('#_builder-form', { timeout: 20000 });
  await page.waitForTimeout(1500);
}

async function run(browser, name) {
  const mode = MODES[name];
  const out = path.join(ROOT, 'screenshots', name);
  fs.mkdirSync(out, { recursive: true });
  const shot = (p, f, o = {}) => p.screenshot({ path: path.join(out, f), ...o });

  const d = await open(browser, mode, { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  await shot(d, '1-date.png');
  await d.locator('.widgets-time-slot').first().click();
  await d.waitForTimeout(700);
  await shot(d, '2-slot.png');
  await d.getByRole('button', { name: 'Select' }).click();
  await d.waitForSelector('#_builder-form', { timeout: 20000 });
  await d.waitForTimeout(1500);
  await shot(d, '3-form.png');
  // scroll the form about halfway: rev bar fills, gear HUD shifts up
  await d.evaluate(() => { const s = document.querySelector('.step-form'); if (s) s.scrollTop = (s.scrollHeight - s.clientHeight) * 0.42; });
  await d.waitForTimeout(500);
  await shot(d, '4-form-scrolled.png');
  await d.close();

  const m = await open(browser, mode, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await shot(m, '5-mobile.png');
  await toForm(m, true);
  await m.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.5));
  await m.waitForTimeout(500);
  await shot(m, '6-mobile-form-scrolled.png');
  await m.close();
  console.log(`${name}: saved to ${path.relative(process.cwd(), out)}/`);
}

(async () => {
  const pick = process.argv.slice(2).filter(a => MODES[a]);
  const names = pick.length ? pick : ['dark', 'light', 'auto'];
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] }); // show scrollbars so the gear thumb is visible
  for (const n of names) await run(browser, n);
  await browser.close();
})();
