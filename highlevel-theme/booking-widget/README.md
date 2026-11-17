# KPI DRIVER theme for the HighLevel booking widget

Restyles the public HighLevel **Neo** booking widget (`link.kpidriver.com/widget/booking/…`) in the KPI DRIVER "instrument panel" look from the website: graphite surfaces, hairline grid, Barlow Condensed headings, mono labels, HUD corners and the gear line.

Nothing in HighLevel has been changed. Everything here was tested against the live widget in a headless browser by injecting the CSS. See `screenshots/` (`before-*` is the current widget, `after-*` is the themed one).

| File | What it is |
|---|---|
| `kd-booking-widget.css` | The theme. Scoped to `#appointment_widgets--revamp`, so it can't leak into other page content. |
| `tools/preview.js` | Re-runs the before/after screenshots against the live widget. It clicks through to the form but never submits. |
| `screenshots/` | Date step, picked slot, details form, form options, mobile. |

## How the widget is built (what we found)

- It's the **Neo** layout. HighLevel themes it with 7 CSS variables (`--appointment_widgets-*`), generated from the calendar's **Customization → Primary colour / Background colour** settings.
- HighLevel's widget code switches to a built-in **dark preset** (light text, light borders) whenever the background colour is dark. So step 1 below already gets you a dark widget without any code.
- The details step is a separate HighLevel **Form** (id `YaAn4IuoDuNbeQ24gk90`) rendered inside the widget. It carries its own styles (a white card, grey inputs), which the CSS overrides.
- The website iframes the widget from another domain, so CSS on the Webflow site **cannot** reach inside it. The CSS has to be added on the HighLevel side.

## Install

### Step 1: colours (no code, safe, do this first)

HighLevel → Calendars → *Business Discovery | KPI DRIVER* → Edit → **Customizations** (Neo widget):

| Setting | Value |
|---|---|
| Widget style | Neo |
| Use default colours | Off |
| Background colour | `#0D141D` |
| Primary colour | `#4A9BE6` |

Repeat for each calendar the site embeds: `17jl7c…` (header), `l4rvIx…` (footer), `9g3ccV…` (home), `3bltGm…` (services), `o811nw…` (team), `usaNbU…` (contact).

The details form will still be a white card after this step. Either do step 2, or as a code-free fallback, open the form in **Sites → Forms → Builder → Styles** and set: form background transparent, label colour `#E9EEF5`, field background `#070B11`, field border `#33404F`, field text `#E9EEF5`.

### Step 2: the full theme (custom CSS)

Paste the whole of `kd-booking-widget.css` in **one** of these places. The `@import` line must stay first.

1. **The calendar's own Custom CSS field**, if your account shows one under the calendar's Customizations. This is the simplest option. Not every account has the field, so check yours.
2. **A HighLevel funnel or website page** (for example `link.kpidriver.com/book`) holding a Calendar element. Paste the CSS into that page's **Settings → Custom CSS**, then point the site's booking pop-up at that page instead of the raw widget URL. Send me the test page URL and I'll check it here before you switch.
3. **The form's Custom CSS** (Forms → Builder → Styles → Custom CSS). This only styles the details step, so pair it with step 1.

**To remove it:** delete the pasted CSS. The widget falls back to the step 1 colours.

## Re-running the preview

```bash
node highlevel-theme/booking-widget/tools/preview.js            # themed (after-*)
node highlevel-theme/booking-widget/tools/preview.js --before   # current widget (before-*)
CAL=usaNbU09ACXDqb1C52Rd node highlevel-theme/booking-widget/tools/preview.js   # another calendar
```

Run it after HighLevel updates. If something looks off, the class names in the CSS are the ones to check.

## Not covered yet

- **Confirmation screen.** It appears only after a real booking, so it got generic styling and hasn't been seen.
- **Dropdown option lists and validation errors** (open "Country", or submit an empty form). These are styled from HighLevel's class names but not yet screenshotted.
- **Website pop-up frame.** The site's pop-up gives the iframe a white background (`.bookdlg__frame` in `src/assets/css/site.css`). Changing it to `#070b11` stops a white flash while the widget loads. That's a one-line change in the existing site files, which this folder doesn't touch.
