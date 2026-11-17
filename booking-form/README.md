# KPI DRIVER · native booking + contact forms

Replaces the six HighLevel booking widgets and the HighLevel "Contact Us" survey with **one booking form and one contact form**, styled by the website's own design system (light and dark), wired to HighLevel: bookings go through **n8n** (live free slots + booking via the API), the contact form posts straight to a **HighLevel inbound webhook**.

- **One booking form, one calendar.** Every booking button opens the same form. A hidden field records where it came from, for example `booking_source = "Home – Header"`. To add a CTA, add a button; nothing else is needed.
- **Same questions** as today's HighLevel forms. Each answer is written to the same HighLevel custom field the old forms used, by field id, so smart lists, workflows and reports keep working.
- **Native date/time picker** with live HighLevel availability and a **time zone picker** (defaults to the visitor's zone).
- **Contact form** with the same fields as the old survey. It also records its source.

Nothing on the live site or in HighLevel has been changed. Everything below runs here on sample data and was tested end to end.

## What's here

| Path | What it is |
|---|---|
| `kd-booking.js`, `kd-booking.css` | The forms (source, readable). |
| `webflow/embed-1-styles.html`, `webflow/embed-2-script.html` | **What goes into Webflow**: minified, about 16K and 32K characters. Built by `tools/build-webflow.sh`. |
| `n8n/kd-booking-slots.json` | n8n workflow: free slots for the picker. |
| `n8n/kd-booking-create.json` | n8n workflow: create/update the contact, book the appointment, tag it, add a note. |
| `n8n/src/*.js` | The workflows' logic, one file per Code node. `tools/build-n8n.py` assembles the JSON from these. |
| `demo/index.html`, `demo/contact.html` | Demo pages using the site's real stylesheet (sample availability; nothing is sent). |
| `tools/test-flow.js` | Browser test: 32 checks on both forms, both themes, mobile. |
| `tools/test-n8n.js` | Runs the generated workflows in a simulator with fake HighLevel replies (`tools/n8n-sim.js`). |
| `review/` | The approval page (also published as an Artifact): every screen per device/theme and 12 payload scenarios. Rebuilt by `tools/review-capture.js`. |
| `screenshots/` | Every step in dark, light and mobile, plus `sample-payload*.json` (exactly what n8n receives). |

## Where a booking came from

`booking_source` is `<page> – <placement>`:

- **Page:** taken from the URL (`/` → Home, `/services/crm` → CRM, `/contact-us` → Contact Us…; Spanish pages get "(ES)").
- **Placement:** taken from the button's existing `data-label` (`header`, `hero`, `cta band`, `crm hero`…). Header and footer links are detected automatically.
- **Override:** give any button `data-source="Pricing – Banner"` to set the full value.
- **New CTA:** any link with `data-book="…"` (all current buttons have it) or `data-kd-book` opens the form.

In HighLevel the source shows up as:

| Where | Booking | Contact form |
|---|---|---|
| **Campaign** custom field (`O5yyMN7TXsWzblxrHUfO`) | `Business Discovery (SEO) Home – Header` | `Contact Us (SEO) Contact Us – Inquiry Form` |
| Tags | `website booking`, `src: home – header` | `website contact form`, `src: contact us – inquiry form` |
| Contact note | source, time, every answer, consent record, landing page, referrer, UTMs | source, answers, consent record, landing page, referrer, UTMs |

The campaign keeps the old prefixes ("Business Discovery (SEO) …", "Contact Us (SEO) …"), so filters written for the old values still match. UTM, gclid and fbclid values from the landing page are remembered for the visit.

## Set-up

### 1. HighLevel

1. **The one calendar** is `9g3ccVyd2a9NsV51QuKN` ("Business Discovery | KPI DRIVER", slug `seo_home`, collective, 45 min, 3 team members). It's the only website calendar still active: the header, footer, services, team and contact calendars (`17jl7c…`, `l4rvIx…`, `3bltGm…`, `o811nw…`, `usaNbU…`) are deleted in HighLevel, although their public booking pages still load. To use another, change `CALENDAR_ID` in `n8n/src/config.js` and run `python3 booking-form/tools/build-n8n.py`, or edit the "Validate" node in n8n.
2. **Create a Private Integration token** in the KPI DRIVER sub-account (Settings → Private Integrations) with these scopes:
   - `calendars.readonly`
   - `calendars/events.write`
   - `contacts.write`
3. **Calendar automations:** appointments are created with `toNotify: true`, so the calendar's confirmation and reminder automations run. Check that your workflows trigger on appointment creation and not only on "booked through the widget".

### 2. Booking bridge (replaces n8n)

`bridge/worker.js` is the only thing that holds the Private Integration token. It is a standard fetch handler, so it runs unchanged as a **Cloudflare Worker** or a **Webflow Cloud** function.
- `GET /slots`: free times from the one calendar.
- `POST /book`: validate, upsert the contact (24 custom fields, SMS consent), book the appointment (`toNotify` on), then add tags and a note.
- Secret `HL_TOKEN`. Optional variables: `LOCATION_ID`, `CALENDAR_ID`, `ALLOWED_ORIGINS`, `TO_NOTIFY`.

Once it is deployed, put `<bridge>/slots` and `<bridge>/book` into `slotsUrl` / `bookUrl` (Webflow site footer code, and `BOOKING_BRIDGE_URL` in build.py). Until then the popup shows the full form design but offers "Open the scheduler" (the HighLevel page for `9g3cc…`) instead of live times.

The n8n files in `n8n/` still work if you ever prefer n8n, but nothing uses them.

### 2b. HighLevel contact workflow

Contact forms post straight to the HighLevel inbound webhook (`contactUrl`); no bridge is needed. Create a workflow with that **Inbound Webhook** trigger and add Create/Update Contact, Add Tag and Add Note. Map the flat values the form sends (`first_name`, `last_name`, `email`, `phone`, `business_name`, `which_bundle_are_you_interested_in`, `your_message`, `booking_source`, `campaign`, `tags`, `note`…). The form first tries a JSON post; if the browser blocks that, it re-sends the same values as a form post.

### 3. Webflow (staging: kpidriver.webflow.io)

Installed through the **site-wide custom code**, not page embeds:
- **Head** (after the existing Finsweet + Memberstack code): `kd-booking-1.css`
- **Footer:** `window.KD_BOOKING_CONFIG` plus `kd-booking-3.js` (hosted Webflow assets, minified copies in `webflow/forms/`)

At load the script (`enhancePage()` in `kd-booking.js`) brings the Webflow pages in line with the repo build:
- **Calendar links:** every booking link and scheduler link points at the one calendar.
- **Booking buttons:** any `a[data-book]` (header, hero, section, CTA band, footer) opens the native popup and reports its own `booking_source`.
- **Contact forms:** the old HighLevel contact embed becomes the native contact form ("Contact Us – Inquiry Form"). The FAQ sections of Home, Services, CRM, AI Suite and AI Agent get an embedded contact form ("<Page> – FAQ Contact Form"). The Contact Us FAQ gets an image instead.
- **Section buttons:** every section without one gets a "Book a Discovery Call" style button, labelled `<Page> – <Section>`. The section name is its id, or "Hero", "Intro" or "Section N" (the same rule as build.py, so English and Spanish match).
- **Booking page:** the scheduler embed becomes the inline booking form.

Analytics events: `discovery_call_open`, `discovery_call_booked` and `contact_form_sent` are pushed to `dataLayer` with `booking_source`.

## Decisions to confirm

- **SMS consent text.** The booking forms say "…from KPI DRIVER, LLC… Text HELP to (786) 822-8188". The old contact survey says "…from **company**… Text HELP to (786) **404-9848**". "company" is an unfilled placeholder.
  - Both new forms currently use the booking wording.
  - Confirm which number is registered for your A2P campaign, and set `contactConsentText` if the contact form needs different wording.
- **Required consent.** Both old forms made the SMS box required, and the new forms copy that. Carrier reviewers generally expect SMS consent to be optional, not a condition of booking. To make it optional, set `req: false` on the two consent fields in `kd-booking.js`, and remove the consent check in `n8n/src/validate-*.js`, which currently rejects submissions without consent.
- **Contact source.** Contacts keep `source: "SEO"`, as the old forms set it (`CONTACT_SOURCE` in `n8n/src/config.js`).

## Live tests

- `tools/live-test.js` (earlier): ran the workflow logic against the real account and deleted everything afterwards.
- `tools/live-site-tests.js`: real submissions through the built site.
  - 2 bookings from randomly chosen booking buttons, through the local bridge (normal automations).
  - 2 contact forms from random placements, to the real inbound webhook.
  - The records are **kept for review**, and their ids are in `review/live-tests.json`. Delete them only once the owner confirms the mapping.
- The token is not in this repo; the test session's network proxy supplies it.

## Not done yet

- **Bridge not deployed** (Cloudflare Worker or Webflow Cloud, the owner's choice).
- **Custom domain not published.** Staging only. The next custom-domain publish will take these changes live.

## Rebuild / test

```bash
node booking-form/tools/test-flow.js                 # forms, both themes, mobile (screenshots → screenshots/)
python3 booking-form/tools/build-n8n.py              # n8n JSON from n8n/src
node booking-form/tools/test-n8n.js                  # workflow simulator
NODE_USE_ENV_PROXY=1 node booking-form/tools/live-site-tests.js   # REAL submissions (2 bookings + 2 contacts)
npx esbuild booking-form/kd-booking.js --minify --target=es2019 > webflow/forms/kd-booking.js   # hosted copy
```
