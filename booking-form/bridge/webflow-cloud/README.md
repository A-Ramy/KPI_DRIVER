# Booking bridge on Webflow Cloud

A thin Astro app around `../worker.js`, the only copy of the bridge logic. Webflow Cloud runs it on the edge, under the KPI DRIVER site's own domain:

- `GET  /api/booking/slots` – free times for the one calendar
- `POST /api/booking/book`  – books the call in HighLevel (contact, appointment, tags, note)
- `POST /api/booking/contact` – passes the contact form to the HighLevel inbound webhook, so the webhook URL is never in the page source (same-site origin check, field whitelist, honeypot, about 5 messages per 10 minutes per IP)

## Set up (once, in Webflow)

1. **Open Webflow Cloud.** Go to Site settings → **Webflow Cloud**, then **Create app**.
2. **Connect the code.** Pick the GitHub repo `a-ramy/kpi_driver` and the branch that holds this folder. If Webflow asks, allow its GitHub app on that repo.
3. **Set the location.**
   - **Mount path:** `/api/booking`
   - **App root (Advanced settings):** `booking-form/bridge/webflow-cloud`
4. **Add the key.** In the environment, open **Environment variables** and add `HL_TOKEN` = your HighLevel Private Integration token. Turn on **Secret**.
   - Add `CONTACT_WEBHOOK_URL` = the HighLevel workflow's Inbound Webhook URL. Turn on **Secret**.
   - Optional variables: `TO_NOTIFY` (`false` mutes the calendar's notifications), `CALENDAR_ID`, `LOCATION_ID`.
5. **Deploy.** Then the website config points at it with same-site addresses:
   `window.KD_BOOKING_CONFIG = { slotsUrl: "/api/booking/slots", bookUrl: "/api/booking/book", contactUrl: "/api/booking/contact" }`

## Notes

- **Base path:** no `base` is set in `astro.config.mjs`, on purpose. Webflow Cloud sets it from the mount path.
- **Edge runtime:** each route declares `export const config = { runtime: "edge" }`, as Webflow Cloud requires.
- **Secrets:** they arrive as `locals.runtime.env` and are passed to the bridge unchanged.
- **Local check:** `npm install && npx astro build && npx wrangler pages dev dist`. Put a placeholder `HL_TOKEN=…` in `.dev.vars`, which is git-ignored. Never use the real key locally.
