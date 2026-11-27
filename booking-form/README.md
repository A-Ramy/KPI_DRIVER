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
- **Footer:** `window.KD_BOOKING_CONFIG` plus `kd-booking-7.js` (hosted Webflow asset since 2026-11-28; minified copy in `webflow/forms/kd-booking.js`)

At load the script (`enhancePage()` in `kd-booking.js`) does the following, both on the Webflow pages and in the repo build (build.py no longer adds anything itself):
- **Calendar links:** every booking link and scheduler link points at the one calendar.
- **Booking triggers:** any `a[data-book]` or `[data-kd-book]` opens the native popup and reports its own `booking_source`, whether it's a button or text. `cta_type` says which kind: button, text link, inline form or contact form.
- **Section CTAs (`CTA_PLAN`):** one per section, as highlighted text rather than a button, placed where the section asks for the next step. There are four styles:
  - `lede`: a link at the end of the section's intro
  - `prompt`: a question plus a link under the content
  - `row`: joins the section's existing links
  - `phrase`: turns words already in the text into the link

  Each CTA's label is `<Page> – <Section>`, where the section is its id (or Hero / Intro / Section N without one).
- **New content:** new sections on these pages get a default CTA automatically. New pages need one line in `CTA_PLAN`. New blog posts get an end-of-article line automatically (`Blog: <Post> – End of Article`).
- **Closing band ("Make the gear shift."):** centred, with the booking form itself under the headline instead of a button (`<Page> – CTA Band`). It loads its free times only when scrolled near.
- **Contact forms:** two steps.
  - Step 1: first name, last name, email, phone.
  - Step 2: business name, bundle, message.
  - The SMS consent box shows on both steps with the same answer.
  - The old HighLevel embed becomes this form ("Contact Us – Inquiry Form").
  - FAQ sections on Home, Services, CRM, AI Suite and AI Agent embed it ("<Page> – FAQ Contact Form"), and their "Not covered here?" line is removed. The Contact Us FAQ gets an image instead.
- **Booking page:** the scheduler embed becomes the inline booking form.

Analytics events: `discovery_call_open`, `discovery_call_booked` and `contact_form_sent` are pushed to `dataLayer` with `booking_source`.

## Spanish pages (2026-11-28)
- On pages with `<html lang="es">` the forms show Spanish: step titles, labels, placeholders, option labels, buttons,
  errors, success messages, dates (Intl, `es`) and country names. One dictionary, `ES_TEXT` / `ES_PATTERNS`, applied by
  `tr()` inside `h()` and to status messages. Only visible text is translated: submitted values (CRM picklist options,
  country codes) stay exactly as before, so HighLevel receives the same answers.
- SMS consent: Spanish wording approved by the owner; HELP and STOP stay as the carrier keywords. `consent_text` records
  the text the visitor saw.
- Sections may name themselves with `data-kd-id` (used for the booking source label before the element id).
- Section CTAs and rewritten `/widget/booking/` links now point at the site's booking page (`/book-discovery-call`,
  `/es/book-discovery-call` on Spanish pages), not the HighLevel calendar. The "Open the scheduler" button that appears
  only when the booking service itself is unreachable still opens the HighLevel scheduler (the booking page would be
  down too).

## Decisions (confirmed by the owner, 2026-11-18)

- **SMS consent text:** both forms use the booking wording with **(786) 822-8188**, which is the registered texting number. The old contact survey's "company" placeholder and its (786) 404-9848 number are retired.
- **Required consent:** the SMS box is required on both forms. On the contact form, ticking it on step 1 carries over to step 2. The bridge also rejects a booking without consent.
- **Contact source:** contacts keep `source: "SEO"`, as the old forms set it.

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
