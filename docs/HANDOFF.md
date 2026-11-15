# KPI DRIVER website revamp — handoff

Status: **preview complete, live site untouched.** Nothing was published, no Webflow page, CMS item, script or setting was changed. All Webflow access so far was read-only.

## Revision 5 (2026-11-15)

- **Brand assets** (supplied PNGs, trimmed and resized into `src/assets/img/brand/`): horizontal logo in the header (white version on dark, black version on light), stacked white logo in the footer, speedometer icon as favicon and on the 404 and thank-you pages, white circular badge as the Apple touch icon and the Organization logo in structured data. The dark-text and light-text circular badges and the plain gauge mark are stored there for social profiles and print.
- **Capitalised typography:** `body { text-transform: capitalize }` gives every word in running text an initial capital. Exempt: blog pages, legal text, quoted speech in the illustrations, and form input. Names and addresses that must keep their own casing (iMessage, iOS, email addresses, kpidriver domains) are wrapped in `.keep-case` at build time. In Webflow: set the same rule on the Body style and add a `keep-case` class.

## Revision 4 (2026-11-15)

- **Client logins:** header menu and footer column link to `crm.kpidriver.com` (CRM) and `kpidriver.ai` (AI Suite). The footer also links "AI Suite terms at kpidriver.ai", since the AI Suite carries its own terms.
- **Booking attribution:** each placement keeps its own calendar (the `CAL` map in `build.py`), because bookings are attributed in the CRM by embed link.
- **Customer stories:** the Boast video widget from the live site (`data-widget-id="cedc94cc-993c-4cc9-aae5-b6ac0b340cf4"`) sits above the Google reviews on Home.
- **Illustration slots:** four `<figure data-replace="…">` blocks mark where real screenshots or demos go: CRM pipeline board (CRM page), AI Underwriting report and AI Dashboard (AI Suite page), AI Agent conversation (AI Agent page). The home hero panel and the workflow demo are the other two illustrative pieces. Search the source for `data-replace` to find them.
- **Spanish:** nine core pages are built in Spanish under `/es/` (Home, Services, CRM, AI Suite, AI Agent, Our Team, Contact, Booking, Thank you), with a language toggle beside the theme toggle, `hreflang` tags and Spanish form messages. Blog and legal pages stay in English. Translations live in `src/data/es.json` as English → Spanish pairs; the build prints any string that still needs translating to `docs/es-missing.txt`. In Webflow this maps to Localization with a Spanish secondary locale.
- **Blog:** 26 new articles, one per Tuesday from 2026-05-19 to 2026-11-10, in `src/data/posts-2026-fill-*.txt`. They carry the existing byline (Ahmed Ramy) to match the other posts. Each should be read and approved by the team before it goes into the CMS. Three of them are the first cornerstone guides for Acquisitions & Sales, Dispositions & Transactions, and Rentals & Portfolio.

## Revision 3 (2026-11-15)

See `docs/AUDIT.md` for the full audit, the list of changes and measured scores. In short: light and dark themes, Brandfetch palette, expanded bilingual nurtures, human-support section, knowledge base inside the AI Suite, motion system, structured data and `llms.txt`, new blog taxonomy with hub-and-spoke linking, and `docs/editorial-calendar.csv`.

Webflow notes for this revision:
- **Themes:** build the tokens as Webflow Variables with two modes (dark, light). The toggle and the head bootstrap script are custom code.
- **Custom code embeds:** hero tachometer, gear indicator, lifecycle circuit, booking popup, scroll reveals, theme toggle. About 20 KB of JavaScript in total, added as site footer code or a hosted script.
- **Blog CMS:** add `Type` (option), `Pillar` (switch) and replace the six old categories with the ten in `build.py` (`CATS`). Related posts can stay a multi-reference; the "part of" box reads the category.
- **AI search:** Webflow can serve `llms.txt` and custom `robots.txt` from site settings.

## 0. Revision 2 (your feedback, 2026-11-12)

1. **AI Suite is live.** All "Upcoming / January 2027" labels and wording are removed. The suite FAQ now says the nine tools are available.
2. **Design.** Added an instrument layer: a canvas tachometer behind the hero that follows the pointer, a gear indicator and rev bar that shift as the page scrolls, an interactive lifecycle circuit, HUD corner marks, pointer spotlights and a gauge-gradient headline. All of it respects reduced-motion.
3. **Reviews.** The home page embeds your Elfsight Google Reviews widget (`elfsight-app-6ec34f8d-848c-473b-87f5-2de77c78fd65`, same as the live site), with a link-to-Google fallback until it renders.
4. **CTAs.** Every "Book a Discovery Call" opens the embedded scheduler in a popup, using the same calendar per placement as the live site (header `17jl7c…`, footer `l4rvIx…`, home `9g3ccV…`, services `3bltGm…`, team `o811nw…`, contact `usaNbU…`). Without JavaScript the link opens the scheduler directly. The AI Agent's primary CTA is "Call the AI Agent · +1 786-786-8382".
5. **Nurture** is positioned as backup for the acquisitions team: it takes stalled leads, revives them and hands them back to acquisitions to close. The lifecycle order is now Capture → Acquisitions → Nurture.

Not verifiable from this environment: the Elfsight widget and the scheduler iframes are blocked by the sandbox network and by the hosted preview, so both were verified by markup/URL only.

## 1. Audit summary (what the current site has)

- Webflow site "KPI DRIVER", last published 2026-08-26. 20 static/template pages, 6 CMS collections.
- **Placeholder content is live:** lorem ipsum on Home ("Solutions for all", "Benefits"), `/for-clients/b2b`, `/for-clients/b2c`, `/case-studies`, a "Documents and certificates" block on Services, and a stray template email (`contact@brainchildos.com`) in the footer.
- **Outdated packaging is live:** "Elite Performance Pack", "Bundles", "Which Bundle Are You Interested In" on the contact form, AI Agent described as "Separate Monthly Subscription".
- **Unsupported/stale claims are live:** "30 Active Clients", "what our 30 clients achieved within the last 30 days" (30k leads, 6k appointments, 3m communications, 250 deals), "most advanced KPI tracking in the industry", "You name it we handle it".
- **Blog is blocked from search:** `robots.txt` disallows `/blog`, `/post/` and `/blog-category/`, while the sitemap lists them. 15 genuine posts (Jan–May 2026, author Ahmed Ramy) are therefore not indexable.
- **FAQ mismatch:** "How long does it take to migrate my CRM?" is answered with integrations copy.
- No analytics or consent tooling is installed (only Finsweet Attributes, Memberstack, jQuery counters).
- Five different booking calendars are embedded across pages (see §5).
- Journey images on Services are illustrations, not product screenshots. No authentic product screenshot exists on the site apart from the mobile app mockup.

## 2. Sitemap

| Route | Preview file | Notes |
|---|---|---|
| `/` | `index.html` | Hero → pillars → lifecycle → KPIs → product areas → AI Suite → workflow → AI Agent → R&D → onboarding → FAQ → CTA |
| `/services` | `services.html` | Three areas, the two offerings, lifecycle, onboarding, scoped services |
| `/services/crm` | `services/crm.html` | |
| `/services/ai-suite` | `services/ai-suite.html` | Flagship: access model, nine tools, workflow, AI Nurture |
| `/services/ai-agent` | `services/ai-agent.html` | |
| `/our-team` | `our-team.html` | |
| `/blog` | `blog.html` | |
| `/blog-category/{slug}` | `blog-category/*.html` | All 6 existing category URLs kept; empty ones show an empty state and are noindex |
| `/post/{slug}` | `post/*.html` | All 15 existing post URLs kept |
| `/contact-us` | `contact-us.html` | |
| `/book-discovery-call` | `book-discovery-call.html` | New. Every "Book a Discovery Call" button lands here |
| `/policies/privacy-policy`, `/policies/terms-conditions` | `policies/*.html` | Text preserved verbatim |
| `/thank-you`, `/404` | | noindex |

Main navigation: **Home | Services ▾ (CRM, AI Suite, AI Agent) | Our Team | Blog | Contact Us** + **Book a Discovery Call**. No Knowledge Base, no pricing page, no top-level product pages.

## 3. Design system

- **Concept:** an instrument panel. Graphite surfaces, a faint grid, condensed display type, and the brand gauge flattened into a four-segment "gear line" (red, orange, amber, green) as the single decorative device.
- **Colour roles (fixed across the site):** CRM = blue (engine), AI Suite = green (nitro), AI Agent = amber with a dashed outline (optional). Brand values come from the logo SVG: `#377DC0`, `#45B649`, `#FCAF17`, `#EA8C1C`, `#ED2024`, navy `#0D1B2B`.
- **Type:** Barlow Condensed (display, uppercase H1/H2), Barlow (body), JetBrains Mono (labels, data). All Google Fonts.
- **Sections:** dark (`.section`), raised dark (`.section--panel`), light (`.section--paper`) alternate for reading comfort. Components read contextual tokens, so they work on any of the three.
- **Components:** button (primary/ghost), badge (core/included/upcoming/optional), eyebrow, gear line, tabs, triad + bracket, access model, tool card, tool spec, workflow demo, offer card, comparison table, steps, feature, FAQ accordion, post row, person, form field, booking box, CTA band.
- **Status language:** every invented UI is captioned "Illustrative preview · sample data".

## 4. Webflow implementation plan

A Webflow connection is available and was used read-only. The preview is plain HTML/CSS/vanilla JS on purpose: class-based, no framework, so it maps onto Webflow elements and classes. It cannot be "imported" as-is. Recommended path:

1. **Work on a copy.** Duplicate the site (or use a Webflow staging branch if the plan allows) so the live site stays intact until sign-off.
2. **Variables and base styles.** Create Webflow variables from the `:root` tokens in `src/assets/css/site.css`; add the three fonts.
3. **Components (symbols).** Rebuild `navbar`, `section-footer`, `CTA band`, `FAQ Section CMS` (already exists, restyle), `triad`, `suite-model`, `journey`, `flow`. These are the files in `src/partials/` and `nav()`/`footer()` in `build.py`.
4. **Pages.** Rebuild the static pages. Create a `services` folder for `crm`, `ai-suite`, `ai-agent`. Create `book-discovery-call`.
5. **CMS.** Keep **Blog Posts**, **Blog Categories** and **FAQs**; restyle their templates. Add an Option/Switch field to FAQs for page placement (home/services/crm/suite/agent) and load the sets from `src/data/faqs.json`. Suggested small additions to Blog Posts: `author role` (plain text) so the byline is not hard-coded.
6. **Native Webflow pieces:** forms (use Webflow Forms, see §5), accordion can be Webflow dropdown or the `<details>` embed, tabs can be Webflow Tabs.
7. **Needs custom code (small):** the workflow demo stepper and analytics hook from `src/assets/js/site.js` (about 60 lines once tabs/forms are native); the SVG gauge in the hero (HTML embed); JSON-LD per page (Webflow page settings support this).
8. **Retire:** Knowledge Base page, Articles + Knowledge Base categories + Project audiences collections and templates, `/for-clients/*`, `/case-studies`, the Memberstack script if `/log-in` goes (decision needed), popup form components, the custom cursor, the jQuery counter script.
9. **Publish** only after the launch checklist is cleared and you authorise it.

I can do steps 2–8 through the Webflow connection on a duplicate or branch once you say which.

## 5. Connections still needed

| Item | State in preview | Needed |
|---|---|---|
| Discovery-call scheduler | Uses `link.kpidriver.com/widget/booking/17jl7cP7dvOAU48s6C3L` (the calendar behind the current header button) | Confirm this is the right calendar. Five are embedded today: `17jl7c…`, `usaNbU…` (contact page), `l4rvIx…`, `9g3ccV…`, `3bltGm…`, `o811nw…` |
| Contact form | Validates, then states plainly that it is not connected. No success message is shown | Rebuild as a Webflow form (or point `data-endpoint` at the CRM form/webhook). The current page also embeds a hidden CRM survey `hs57W9QgapW3WAyGZeZb` |
| SMS consent checkbox | Existing wording kept verbatim, but made **optional** | Confirm. Carriers generally expect SMS marketing consent not to be a condition of submitting a form |
| Client login | Not linked | The only login on the site is the Memberstack gate for the Knowledge Base. Provide the CRM login URL if you want a "Client Login" link |
| CRM status | Linked (`app.pulsetic.com/status/bXxHxF27/`) | None |
| Analytics | `dataLayer` events fire: `discovery_call_click`, `product_explore`, `form_submit_attempt`, `form_complete`. Nothing is loaded | Choose analytics + consent tool; add cookie preferences if the tool sets non-essential cookies |
| Newsletter signup | Dropped from the footer | Say if you want it back (it was a Webflow form) |
| Product screenshots | None available; all UI is labelled illustrative | Real CRM and AI Suite screenshots would replace the illustrative panels |

## 6. Claims register

**Verified from supplied sources and used**

| Claim | Source |
|---|---|
| Two offerings; AI Suite access included, no extra subscription, PAYG; AI Agent separate | Your brief |
| Nine tools, three groups, tool descriptions | AI Suite brochure |
| AI Nurture: reads conversations and notes, 60-day campaign, SMS + email, no AI Agent needed | AI Suite brochure |
| Nurture Pipeline: 10+ situational 6-month drips and the nine named reasons | AI Suite brochure |
| AI Agent: runs on rules, new and older leads, AI voice/SMS/email/iMessage, number remediation, BYOC | AI Suite brochure |
| AI Suite live at launch; AI Agent test line +1 786-786-8382 | Your instruction (rev. 2) + live site |
| Usage "tracked in a clear billing dashboard" | AI Suite brochure |
| Built by investors over three years; pipelines list; document signing; mobile app | Company profile + live site |
| Team names, roles, bios; Brandy Pollack 30+ years in real estate investing | Company profile + live site |
| Dedicated account manager, CRM migration, training/support | Company profile + live FAQ |
| Address, `info@kpidriver.com`, (786) 822-8188, social links, status page | Live site |

**Deliberately left off public pages**

| Item | Why |
|---|---|
| $500 Founder Offer, "one-time setup", "monthly subscription", "migration fee" wording | Pricing is for the discovery call |
| "Under 5 minutes, not 30–45" (underwriting) | Speed claim needs substantiation |
| "Zillow data" | Named-provider rights need confirming; page says "available property data" |
| "30 active clients", last-30-days stats, US client map | Stale/unsubstantiated |
| "Most advanced KPI tracking in the industry", "millions of actions monthly", "enterprise-grade" | Superlative/capacity claims |
| AI Review Bot | In the profile and live site, absent from the brochure and your brief |
| Integration logo wall (Twilio, DocuSign, Mailchimp, ReadyMode, Kixie, REISift, …) | Implies partnerships; copy says integrations are scoped |
| Testimonials video section | No approved customer evidence supplied |

**Conflicts to resolve**

1. ~~Is any AI tool already live?~~ Resolved by you: the site launches with everything live, so nothing is marked upcoming.
2. **Phone numbers:** site uses (786) 822-8188 (also in the SMS consent text); the profile prints +1 786-404-9848. Preview uses the site number.
3. **AI Sales Coach scope:** the live site says "real-time insights"; the brochure describes post-call scoring. Preview follows the brochure.
4. **Social handles:** X is `KPIDriver` in the footer but `KPI_DRIVER` on the contact page; TikTok is `@kpidriver` vs `@KPI_DRIVER`. Preview uses the footer versions.
5. **Mobile app:** store links go to the "Lead Connector" app. Confirm you want those public links and how the app should be named.
6. **Terms & Conditions** mention "your chosen subscription plan" and recurring billing only. Legal should review against PAYG AI usage and the AI Agent, and against any analytics/cookies added. Text is otherwise unchanged (effective date 10/12/2024).
7. **Blog byline** shows Ahmed Ramy as CTO, taken from the team page.

## 7. Migration and redirects

Full map: `docs/redirects.csv` (48 rows).

- **Kept as-is:** `/`, `/services`, `/our-team`, `/contact-us`, `/blog`, all `/post/*`, all `/blog-category/*`, `/policies/*`, `/thank-you`.
- **Knowledge Base:** `/knowledge-base` and its 6 category pages → `/contact-us` for now. Of the 33 `/article/*` pages (client training videos), 9 pipeline/KPI/dashboard/document/onboarding articles redirect to the closest Services page; the other 24 have no public equivalent and should return **410** rather than redirect to an unrelated page. If these videos still serve clients, move them into a client help destination and redirect there instead.
- **Placeholders:** `/for-clients/b2b`, `/for-clients/b2c`, `/case-studies`, `/project-audience/*` → `/services` or `/blog`.
- **robots.txt:** remove the `/blog`, `/post/` and `/blog-category/` disallows so the blog can be indexed. Keep `/thank-you` disallowed. Staging stays `Disallow: /`.
- Each page has a unique title, description, canonical, Open Graph tags and a social image (`assets/img/og-default.png`). Structured data: Organization (home), FAQPage (pages with FAQs), BlogPosting (posts). No review schema.

## 8. Test results (run 2026-11-12, Chromium via Playwright, local server)

| Check | Result |
|---|---|
| Pages built | 34 |
| Horizontal overflow at 1440 / 820 / 390 px | 0 of 102 page-width combinations |
| Console errors | 0 |
| Broken internal links and anchors | 0 |
| Broken images | 0 |
| Exactly one H1 per page | 34 of 34 |
| Duplicate titles / descriptions | 0 / 0 |
| axe-core WCAG 2.0/2.1/2.2 A+AA, 12 key pages at 1440 and 390 px | 0 violations (after fixing button contrast, tab labels, link colours on light sections and scrollable tables) |
| Keyboard: skip link, Services menu (Enter/Tab/Escape), tabs (arrows/Home/End) | Pass |
| Mobile menu open/close, submenu, Escape | Pass |
| Workflow demo step + play | Pass |
| Reduced motion: animations off, play control hidden, content visible | Pass |
| JavaScript disabled: all lifecycle panels readable | Pass |
| Contact form: required fields, email format, focus on first error | Pass |
| Contact form: unconnected state says nothing was sent, no success message | Pass on direct check (the scripted assertion for this step misfired once; behaviour confirmed by a separate run) |
| Booking page: scheduler iframe uses the verified URL; direct link fallback | Pass |
| All "Book a Discovery Call" buttons → `/book-discovery-call` | Pass |
| Content scan: no tiers, no Founder Offer, no Knowledge Base nav, no lorem ipsum | Pass. Dollar figures appear only inside existing blog articles and one labelled sample asking price |
| Home page weight (local) | 4 requests besides fonts, about 60 KB transferred, LCP ≈ 0.4 s, CLS 0.05 |

**Limits of this testing:** automated accessibility checks do not replace a manual screen-reader pass; performance was measured locally, not on Webflow hosting or real devices; Safari and Firefox were not run; the scheduler iframe was verified by URL, not by completing a booking; redirects are specified, not deployed.

## 9. Launch checklist

- [ ] Resolve the remaining conflicts in §6
- [ ] Confirm the booking calendar and connect the contact form
- [ ] Decide `/log-in` and the Knowledge Base videos
- [ ] Supply product screenshots (optional but recommended)
- [ ] Choose analytics and consent tooling; legal review of Terms/Privacy
- [ ] Build in Webflow on a duplicate/branch; re-run the checks in §8 on the staging domain
- [ ] Add redirects, fix `robots.txt`, submit the sitemap
- [ ] Your explicit go-ahead to publish
