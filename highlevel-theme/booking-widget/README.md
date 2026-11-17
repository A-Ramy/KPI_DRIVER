# KPI DRIVER theme for the HighLevel booking widget

Restyles the public HighLevel **Neo** booking widget (`link.kpidriver.com/widget/booking/…`) to match the KPI DRIVER website:

- Graphite or paper surfaces, a hairline grid, HUD corners and the gear line.
- Barlow Condensed headings and mono labels.
- The site's own header wordmark in place of the off-centre round badge.
- **Light and dark themes**, chosen by the same rules as the site.
- The site's **gear scroller**: a rev bar that fills as you scroll, a GEAR 1→6 HUD with a rev meter, and gear-coloured scrollbars.

Nothing in HighLevel has been changed. Everything here was tested against the live widget in a headless browser by injecting the CSS.

| Path | What it is |
|---|---|
| `kd-booking-widget.css` | The theme. Scoped to `#appointment_widgets--revamp`. |
| `favicon/` | Speedometer favicon set: `.ico`, 32px, 192px and a 180px Apple touch icon. Made from `src/assets/img/brand/icon-gauge.png`. |
| `paste/calendar-custom-code.html` | **What you paste into HighLevel.** Built by `tools/build-paste.py`. |
| `tools/preview.js` | Re-runs the screenshots against the live widget. It clicks through to the form but never submits. |
| `screenshots/before/` | The widget as it is today. |
| `screenshots/dark/`, `screenshots/light/` | Theme forced by the URL. Dark was captured with the OS set to light, and light with the OS set to dark, to prove the URL wins. |
| `screenshots/auto/` | No theme in the URL, OS set to light: the widget follows the OS. |

Each set has: `1-date`, `2-slot`, `3-form`, `4-form-scrolled` (rev bar + gear HUD), `5-mobile`, `6-mobile-form-scrolled` (page rev bar).

## How it works

### Light / dark

- **Default:** follows the visitor's OS setting, as the site does on a first visit.
- **Forced by the embedding page:** HighLevel copies the URL's `backgroundColor` onto the page, and the CSS reads it:

| URL | Theme |
|---|---|
| `?default=false&backgroundColor=%23070b11&primaryColor=%234a9be6` | dark |
| `?default=false&backgroundColor=%23fdfdfd&primaryColor=%231f65a8` | light |
| anything else (including the calendar's own `#0D141D`) | follows the OS |

> ⚠️ **Always send `primaryColor` together with `backgroundColor`.** If the URL has a background colour but no primary colour, HighLevel's server crashes and returns **500 Server Error**. Their code reads `primaryColor.length` without checking that it exists. We verified this on the live widget.

- **Colours:** every colour is a token with a light and a dark value, copied from the site's two themes in `src/assets/css/site.css`. Browsers older than about 2024 that can't switch tokens get the dark theme.

### Gear scroller

- **Desktop:** the details form scrolls inside its own panel.
  - A red → green **rev bar** is pinned to the top of the form and fills as the visitor scrolls.
  - A **GEAR n / 6** HUD sits at the bottom of the left rail, in the space where the site puts its HUD in the margin. It shifts gears 1→6 with the site's colours (red, orange, orange, amber, amber, green), and its rev meter refills within each gear.
- **Mobile:** the whole page scrolls, so the rev bar is fixed to the top of the screen. The HUD is hidden on small screens, as on the site.
- **Scrollbars:** a thin rail with a gear-gradient thumb. Firefox gets an amber thumb.
- **How it's built:** pure CSS scroll-driven animations, no JavaScript. Browsers that don't support them (currently Firefox) simply don't show the rev bar and HUD. Nothing breaks.

### Logo

The uploaded calendar logo is a round badge whose wordmark sits off-centre inside its ring. That's in the image itself, so CSS can't re-centre it. The CSS hides the badge and shows the site header's wordmark instead, loaded from the site's Webflow CDN:
- light-text version on dark
- dark-text version on light

To keep the badge instead, upload a re-centred version to the calendar and delete the two "Logo" rules in section 6 of the CSS.

## Install

### Step 1: colours (no code, safe, do this first)

HighLevel → Calendars → each calendar → Edit → **Customizations** (Neo widget):

| Setting | Value |
|---|---|
| Widget style | Neo |
| Use default colours | Off |
| Background colour | `#0D141D` (the "follow the OS" marker) |
| Primary colour | `#4A9BE6` |

Calendars embedded on the site: `17jl7c…` (header), `l4rvIx…` (footer), `9g3ccV…` (home), `3bltGm…` (services), `o811nw…` (team), `usaNbU…` (contact).

### Step 2: the full theme + favicon (one paste)

Same calendar → Customizations → **Insert custom code** (under Primary settings): paste the **entire** contents of [`paste/calendar-custom-code.html`](paste/calendar-custom-code.html) and save.

That one snippet holds:
- the theme: a minified copy of `kd-booking-widget.css` in a `<style>` tag, pixel-identical to the tested version
- a small `<script>` that gives the booking page the speedometer favicon and the tab title "Book a Call · KPI DRIVER". The page has neither today.

Repeat steps 1 and 2 for every calendar the site embeds. After editing `kd-booking-widget.css`, rebuild the snippet with `python3 highlevel-theme/booking-widget/tools/build-paste.py`.

**To remove it:** clear the custom code box. The widget falls back to the step 1 colours.

**Other places the CSS could go:** a HighLevel funnel page's Custom CSS, or the form's Custom CSS. Those are only needed if the custom code box ever goes away.

### Step 3: favicon

The step 2 snippet already handles it. For a HighLevel funnel or website page instead, set its favicon in page settings to:
`https://cdn.prod.website-files.com/68974c57cac027f80fdf883f/6afa14d6fb4d11e63de9d2b5_kd-icon-gauge.png`
The files in `favicon/` are for anywhere that wants an uploaded icon instead.

### Step 4 (optional, not planned): follow the website's theme toggle

The site is not being edited, so the widget follows the visitor's OS. A visitor who switched the site to dark while their OS is light will see a light widget inside the dark pop-up. If that ever matters:

The CSS already follows the OS. To also follow the site's sun/moon toggle, the site needs to add the theme to the widget URL when it opens the pop-up. That's a small change in the existing site script (`src/assets/js/site.js`, and the same script in `webflow/site-footer.html`). This folder deliberately doesn't touch those files. Add the lines below in both places a widget URL is built: right after `var src = "https://link.kpidriver.com/widget/booking/" + …` in the booking pop-up, and after `var src = box.getAttribute("data-booking")` in the inline embed on the Book a Discovery Call page.

```js
var light = document.documentElement.getAttribute("data-theme") === "light";
src += (src.indexOf("?") < 0 ? "?" : "&") + "default=false"
  + "&backgroundColor=" + encodeURIComponent(light ? "#fdfdfd" : "#070b11")
  + "&primaryColor=" + encodeURIComponent(light ? "#1f65a8" : "#4a9be6");   // both params, always
```

In the same files, `.bookdlg__frame { background: #fff; }` should become `var(--ink)`, so dark mode doesn't flash white while the widget loads.

## Re-running the preview

```bash
node highlevel-theme/booking-widget/tools/preview.js                 # dark + light + auto
node highlevel-theme/booking-widget/tools/preview.js before          # current widget
CAL=usaNbU09ACXDqb1C52Rd node highlevel-theme/booking-widget/tools/preview.js dark
```

Run it after HighLevel updates. If something looks off, the class names in the CSS are the ones to check.

## Not covered yet

- **Confirmation screen.** It appears only after a real booking, so it got generic styling and hasn't been seen.
- **Dropdown option lists and validation errors.** They're styled but not screenshotted.
- **Theme in the funnel-page route.** Not yet tested whether a funnel page passes URL parameters on to the widget. If it doesn't, the widget there follows the OS only.
