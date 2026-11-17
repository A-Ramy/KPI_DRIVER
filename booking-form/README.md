# KPI DRIVER · native booking + contact forms

Replaces the six HighLevel booking widgets and the HighLevel "Contact Us" survey with **one booking form and one contact form**, styled by the website's own design system (light and dark), wired to HighLevel through **n8n**.

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
| `n8n/kd-contact.json` | n8n workflow: contact form → contact + tags + note. |
| `n8n/src/*.js` | The workflows' logic, one file per Code node. `tools/build-n8n.py` assembles the JSON from these. |
| `demo/index.html`, `demo/contact.html` | Demo pages using the site's real stylesheet (sample availability; nothing is sent). |
| `tools/test-flow.js` | Browser test: 32 checks on both forms, both themes, mobile. |
| `tools/test-n8n.js` | Runs the generated workflows in a simulator with fake HighLevel replies: 24 checks. |
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

1. **Choose the one calendar.** The workflows default to `17jl7cP7dvOAU48s6C3L`, the current header calendar. To use another, change `CALENDAR_ID` in `n8n/src/config.js` and run `python3 booking-form/tools/build-n8n.py`, or edit the "Validate" node in n8n.
2. **Create a Private Integration token** in the KPI DRIVER sub-account (Settings → Private Integrations) with these scopes:
   - `calendars.readonly`
   - `calendars/events.write`
   - `contacts.write`
3. **Calendar automations:** appointments are created with `toNotify: true`, so the calendar's confirmation and reminder automations run. Check that your workflows trigger on appointment creation and not only on "booked through the widget".

### 2. n8n

1. **Credential:** create one, type **Header Auth**, named `HighLevel PIT`. Header name `Authorization`, value `Bearer <token>`.
2. **Import the workflows:** import the three files in `n8n/`, open each HTTP node and select that credential.
3. **Activate** all three. Your webhook URLs will be `https://<your-n8n>/webhook/kd-booking-slots`, `/webhook/kd-booking-create` and `/webhook/kd-contact`.
4. **Allowed sites:** the webhooks only accept calls from `www.kpidriver.com`, `kpidriver.com` and `kpidriver.webflow.io`. That's the "Allowed origins" option on each Webhook node.

What each workflow does:
- **Booking:** checks the request, ignores unknown fields, rejects past slots and missing consent, and treats a filled spam trap as a fake success. Then it creates/updates the contact, books the slot, adds tags and adds the note.
- **Taken slot:** HighLevel rejects the booking and the visitor is sent back to pick another time.

### 3. Webflow

1. **Install the code:** in the **site-wide footer component**, add two Code Embeds, pasting `webflow/embed-1-styles.html` and then `webflow/embed-2-script.html`. These go in Code Embeds because the site's Head custom-code box is already at 47K of Webflow's 50K limit.
2. **Connect it:** in embed 2, put in the three webhook URLs and change `mock: true` to `mock: false`.
3. **Contact page:** replace the HighLevel survey iframe block with `<div data-kd-contact></div>`.
4. **Booking page** (optional inline form): replace the scheduler embed with `<div data-kd-booking></div>`.
5. **Booking buttons:** leave them as they are. The script intercepts `a[data-book]` before the site's old pop-up does. Without JavaScript the links still open the old HighLevel scheduler as a fallback.
6. **Analytics:** `discovery_call_open`, `discovery_call_booked` and `contact_form_sent` are pushed to `dataLayer` with `booking_source`.

## Decisions to confirm

- **SMS consent text.** The booking forms say "…from KPI DRIVER, LLC… Text HELP to (786) 822-8188". The old contact survey says "…from **company**… Text HELP to (786) **404-9848**". "company" is an unfilled placeholder.
  - Both new forms currently use the booking wording.
  - Confirm which number is registered for your A2P campaign, and set `contactConsentText` if the contact form needs different wording.
- **Required consent.** Both old forms made the SMS box required, and the new forms copy that. Carrier reviewers generally expect SMS consent to be optional, not a condition of booking. To make it optional, set `req: false` on the two consent fields in `kd-booking.js`, and remove the consent check in `n8n/src/validate-*.js`, which currently rejects submissions without consent.
- **Contact source.** Contacts keep `source: "SEO"`, as the old forms set it (`CONTACT_SOURCE` in `n8n/src/config.js`).

## Not verified yet

- **Real HighLevel calls.** The API calls follow HighLevel's current docs (`Version: v3`; free slots, contact upsert, create appointment, add tags, add note) and pass the simulator. They haven't run against your account; that needs the token.
- **Real n8n import.** The workflow files haven't been imported into a real n8n instance yet.

## Rebuild / test

```bash
node booking-form/tools/test-flow.js                 # forms, both themes, mobile (screenshots → screenshots/)
python3 booking-form/tools/build-n8n.py              # n8n JSON from n8n/src
node booking-form/tools/test-n8n.js                  # workflow simulator
bash booking-form/tools/build-webflow.sh             # Webflow embeds (uses npx esbuild)
```
