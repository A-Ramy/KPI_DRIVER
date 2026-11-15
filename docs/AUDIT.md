# KPI DRIVER site audit (revision 3, 2026-11-15)

Written from the seat of someone who has to sell this product: what the site does well, what would stop a qualified investor from booking, and what to do about it. Items marked **Done** are in the current preview. The rest are recommendations.

## What is working

- **Positioning is clear in five seconds.** Audience, product and next step are all above the fold.
- **The packaging is easy to understand.** Two offerings, three product areas, one decision.
- **The "call our AI Agent" line is the best CTA on the site.** It lets a prospect experience the product with no form and no meeting.
- **Human support is a real differentiator** for an AI product, and it now has its own section.
- **Technical health is strong.** See the scores at the end.

## Changed in this revision (Done)

| Area | Change |
|---|---|
| Themes | Light and dark mode with a toggle in the header. Follows the visitor's system setting by default and remembers their choice. Palette aligned to Brandfetch (Boston Blue `#377DC0`, Dark Blue `#0D1C2A`, Green `#43B749`, Yellow `#FCAF17`, Orange `#EA8C1C`, Red `#ED2024`, Concrete `#F2F2F2`, White `#FDFDFD`). |
| Nurture | 13 situational nurtures (adds Ghosted, Offer Rejected, Contract Rejected, Cancelled Deal), 4 timed nurtures (30 days, 3, 6, 12 months), all marked bilingual English and Spanish. |
| Support | New "AI for your pipeline. Real people for your support." section on Home and Services: dedicated channel per client, no tickets, no bots, routine changes at no extra cost, substantial requests quoted first. FAQs updated to match. |
| Knowledge base | New section on the AI Suite page: recorded walkthroughs inside the Suite as on-demand onboarding. Old Knowledge Base URLs now redirect there. |
| Motion | Scroll reveals with stagger, bars that fill as they appear, hero entrance, page-to-page transitions, button sheen. All transform and opacity only. Off for reduced-motion visitors. Nothing is hidden without JavaScript. |
| Speed | Fonts no longer block rendering, with metric-matched fallbacks so text does not jump when they load. |
| Responsive | Tested at ten sizes from 360px phones to 1920px desktops, including tablet portrait and phone landscape. |
| SEO and AI search | Breadcrumb, WebSite, SoftwareApplication, Person, FAQ and BlogPosting structured data. `llms.txt` summary for AI assistants. `robots.txt` explicitly welcomes AI search crawlers. Sitemap with last-modified dates. |
| Blog | Ten topic categories, a content type on every post, one cornerstone guide per topic, and automatic "related" and "part of" links so posts connect as hub and spoke. |
| Onboarding | "Typical implementation is live in two to three weeks" added, taken from your SOW. |
| Bug fix | Correcting a form field could move the Send button mid-click so the click was lost. Fixed. |

## Recommendations, in priority order

### 1. Show the real product (highest impact)
Every screen on the site is an illustration. A buyer comparing CRMs wants to see the actual thing. Add:
- 6 to 10 real screenshots (pipeline board, KPI dashboard, a scored call, an underwriting report, the mobile app).
- A 60 to 90 second walkthrough video on the home page. Your current site embeds a YouTube video; if it is a product demo, it should come back.

### 2. Add proof with numbers
Google reviews are embedded, which is good. Missing: two or three named customer stories with a before and after (hours saved, leads revived, days to close). The "Customer Stories" category is ready and empty. Do not launch it until there is a real one.

### 3. Give visitors who are not ready to book somewhere to go
Today the only action is a sales call. Most first-time visitors are not ready for that. Add one lower-commitment step:
- "Call our AI Agent" promoted on the home hero, not only on the AI Agent page.
- A free KPI scorecard or "lead leak calculator" in exchange for an email.
- A newsletter signup on the blog.

### 4. Lean into bilingual
English and Spanish nurtures and a bilingual AI Agent are rare in this market. Consider a Spanish version of the home and Services pages (Webflow Localization supports this), and say "bilingual" in the hero facts.

### 5. Say who it is for
Add a short "Built for" section: wholesalers, fix-and-flip operators, buy-and-hold investors, hybrid teams. It helps visitors self-qualify and gives search engines the segment terms people type.

### 6. Bottom-of-funnel pages
Highest-intent searches are comparisons and alternatives. Add an integrations page and two or three honest comparison pages (for example "KPI DRIVER vs running your business on spreadsheets and a generic CRM"). Naming competitors needs care and accurate claims.

### 7. Legal and compliance (do before launch)
- **Call recording.** AI Notes Taker and AI Sales Coach process recorded calls. Several US states require all parties to consent. Terms and Privacy should cover recording and AI processing, and the product pages should say recording consent is the client's responsibility.
- **Terms** still describe a single subscription. They should reflect pay-as-you-go AI usage and the AI Agent.
- **Cookie consent** once analytics is installed.

### 8. Measurement
No analytics is installed today. The preview already fires events for booking clicks, AI Agent test calls, product exploration, form attempts and theme switches. Connect GA4 (or similar) and call tracking so you know which pages and posts produce booked calls.

### 9. Small things
- A "Client login" link in the header for existing customers.
- A glossary of investor and operations terms (good for search and AI answers).
- One calendar for all booking buttons unless you are deliberately tracking by placement.

## Blog: what I built and what I recommend

**Built:** the category system, content types, cornerstone guides, related-post logic, and a 52-article backlog in `docs/editorial-calendar.csv` mapped to categories, search queries and the guide each one links to.

**Not built yet:** the articles themselves. Two things are needed first: the company's creation date, and a decision on backdating.

**On backdating a post per week to the founding date, my advice is not to:**
- Search engines record when they first saw a page. A backdated post gets no credit for age, and 100+ posts appearing at once with old dates is the pattern Google's "scaled content" spam policy targets. The risk is to the whole domain, not only the blog.
- Posts dated before a feature existed cannot mention it, so the best material (AI Suite, nurtures, the AI Agent) would be off limits for most of them.
- AI search tools favour recent, specific content. Old dates work against you there.

**What I would do instead:** publish the five missing cornerstone guides and 15 to 20 strong supporting articles dated when they go live, then one a week from there. If you still want the archive filled, the safest version is to fill only the gap since your last post (May 2026, about 30 weeks) and keep each article accurate for its date.

Either way, each article should be reviewed by someone on your team before it goes out, and should carry real specifics from your own operation.

## Measured results (local build, Chromium, 2026-11-15)

| Check | Result |
|---|---|
| Lighthouse, mobile and desktop, Home / Services / AI Suite / Blog | Performance 100, Accessibility 100, SEO 100 on all eight runs. Best Practices 100, except Home at 96 because the reviews widget is blocked in the test sandbox. |
| Mobile largest contentful paint (simulated slow 4G) | 1.1 to 1.5 s |
| Layout shift | 0 to 0.004 |
| Pages x screen sizes x themes | 494 combinations, 0 horizontal overflow, 0 console errors, 0 broken links |
| axe WCAG A and AA, 12 key pages, both themes, desktop and phone | 0 violations |
| Interaction suite (keyboard, menus, tabs, booking popups, form, theme, reveals, no-JS, reduced motion) | 34 of 34 pass |

**Limits:** scores are from a local server, not Webflow hosting, and will move a little once real fonts, analytics and widgets load. Safari and Firefox were not run. The reviews widget and the scheduler could not be loaded from the test environment.
