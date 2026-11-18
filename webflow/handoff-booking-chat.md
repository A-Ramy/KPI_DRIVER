# For the booking chat — approved by the owner (site audit items D1–D3)

The site-wide head/footer code belongs to you, so these are yours to apply.

1. **Move the contact webhook server-side (D1, high).** `window.KD_BOOKING_CONFIG.contactUrl` in the site footer puts the GoHighLevel inbound webhook URL (`services.leadconnectorhq.com/hooks/…/webhook-trigger/…`) in every page's source. Anyone can post fake leads straight into the CRM with it. Route the contact form through the existing Webflow Cloud app (for example `/api/booking/contact`), keep the webhook URL as a server secret there, and add basic rate limiting and validation.

2. **Remove Finsweet Attributes v2 from the site head (D2).** `<script async type="module" src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js" fs-list>` loads on every page, but no page uses `fs-list`. The knowledge-base category template loads its own Finsweet v1 scripts in its page head, so it does not need this.

3. **Remove Memberstack (D3).** Update 2026-11-18: the owner retired the Knowledge Base. The Knowledge Base and Log in pages are drafts, and the articles, KB categories and audiences are unpublished, so nothing on the live site uses Memberstack any more. Please remove the Memberstack script (and its config) from the site-wide head code; it currently loads on every page for nothing. Also drop the Finsweet v2 script if it is still there (D2).

Also worth knowing:
- The booking buttons' fallback `href`s still point at GoHighLevel calendar links, and five of the six IDs return 404 (`17jl7cP7dvOAU48s6C3L` header, `l4rvIxCnb9DtsSTM6SoQ` footer, `3bltGmUYGxpIUtG09p3V` Services/CRM, `o811nwxOSIS90zvrwX33` Our Team, `usaNbU09ACXDqb1C52Rd` Contact; `9g3ccVyd2a9NsV51QuKN` works). Your pop-up intercepts normal clicks, but new-tab opens, long-presses and crawlers land on the 404s. Pointing the fallback at `/book-discovery-call` would fix it.
- Five old booking files remain in the asset library (`kd-booking-1.js` to `-4.js` and the older `kd-booking-2.css`, id `6afcb9ee866378494a4755c5`). They are not loaded anywhere; delete them if you no longer need them.
- On my side, the old GoHighLevel booking pop-up code in kd-site.js (which opened `#book-dialog` with a GHL iframe on `[data-book]` clicks) has been removed, since your pop-up replaced it. The `#book-dialog` markup is still in the page chrome but no longer opens.
