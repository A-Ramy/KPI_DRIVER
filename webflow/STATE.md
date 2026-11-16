# Webflow build state (resume notes)

Site id `68974c57cac027f80fdf883f`. Owner chose to build inside the live site (no duplicate) and push live after review.
**Never publish to the custom domains without the owner's explicit go-ahead.** Staging = `kpidriver.webflow.io`
(publish with `publishToWebflowSubdomain: true, customDomains: []`).

## How pages are built
- Old pages are left untouched. Each new page is a **duplicate of the draft template page** under a temporary `kd-` slug.
  At go-live: old page -> draft / renamed, new page takes the real slug. Home must be filled in place or set as homepage by the owner.
- Template page `KD Template` id `6afa1600fe5a0100898bf4da` (draft) has three HtmlEmbeds (ids are the same in every duplicate):
  header `bd5aab1f-de22-9e3f-ee35-e194a0e124e5`, main `74099f78-f3ef-4fbb-764a-99f416dc0972`, footer+chrome `e9cae18e-fd76-612f-f67c-1e048ee4fee5`.
  Per page: `data_element_settings_tool > set_settings` key `code` on the main embed (component = new page id), content from `webflow/pages/<page>.html` (whitespace-collapsed).
- Page head code (same for every page): kd-head.js + fonts + kd-site.css. Page footer code: kd-site.js. Duplicates do NOT inherit page code: set head + footer code on every new page.
- Hosted files (Webflow assets, see `assets.json` for images):
  - css `https://cdn.prod.website-files.com/68974c57cac027f80fdf883f/6afa152298e25d0480845242_kd-site.css`
  - js `https://cdn.prod.website-files.com/68974c57cac027f80fdf883f/6afa152220683a92cfca82b7_kd-site.js`
  - head js `https://cdn.prod.website-files.com/68974c57cac027f80fdf883f/6afa185202bacf920d48ff43_kd-head.js`
  Re-upload = new asset id = new URL; then every page's head/footer code needs the new URL.
- Upload helper: create_asset (md5) then POST to S3 (see scratchpad `up.py` pattern: policy is rebuilt from key/date, signature from the tool result).
- The header currently has **no ES toggle** (Spanish needs the Localization add-on).

## Pages
| Page | Webflow page id | Slug now | Status |
|---|---|---|---|
| Book a Discovery Call | 6afa0d6e369e94ec1c852b8a | /book-discovery-call (final) | done, single embed, long-form head code; verified on staging |
| Thank You | 6afa182cf610cfffbefd4cb2 | /kd-thank-you | done, verified on staging |
| Our Team | 6afa188c23514ef7a01c1579 | /kd-our-team | done, verified on staging |
| AI Agent | 6afa191e7b59d3ca770d4e6a | /kd-ai-agent (final: /services/ai-agent, needs a services folder or flat slug decision) | done; FAQ JSON-LD left out of embed, add via page schema |
| Contact Us | 6afa1e999eb44edc324f9215 | /kd-contact-us | done, verified on staging (GHL survey form embed, inline ghl-form style) |
| CRM | 6afa1f119ba75560d9c1652d | /kd-crm (final /services/crm) | done, verified on staging |
| AI Suite | 6afa6c72b8bbfbdd8948a38f | /kd-ai-suite (final /services/ai-suite) | done, on staging |
| Services | 6afa6ce5a6769cca503f0934 | /kd-services | done, on staging |
| Home | 6afa6d7a38fcd20700ba38d7 | /kd-home | done, on staging |
| 404 | 6afa6eb63028d1c6abdee704 | /kd-404 | done (at go-live copy into the real 404 utility page) |
| Privacy | 6afa6eb7cff8a37e634fd4c7 | /kd-privacy-policy | done |
| Terms | 6afa6eb8cb9446c6d1f6ab20 | /kd-terms-conditions | done |
| Blog (list, post, category templates) + CMS import, Spanish pages | | | to do |

## Open decisions for the owner
- Knowledge Base, Log in, Case studies, For-clients pages use Memberstack / old design: keep, redirect or retire?
- Spanish: Localization add-on.
- Blog: restyle CMS templates (Blog, post, category) and import 26 new posts + categories (`webflow/cms`).

## Owner decisions (2026-11-15)
- Member pages (Knowledge Base, Log in, Case studies, For clients): keep published but hidden, reachable by direct link only (not in nav; exclude from sitemap/search).
- Spanish: no Localization add-on; build ES pages as ordinary pages under an `es` folder with the header toggle. Page folders (`es`, `services`) need the Designer open: owner must launch https://kpidriver.design.webflow.com?app=dc8209c65e3ec02254d15275ca056539c89f6d15741893a0adf29ad6f381eb99
- Contact form: use the existing GHL survey `hs57W9QgapW3WAyGZeZb` (done).
- JSON-LD scripts are stripped from embeds for now; add from `page-meta.json` via the page schema tool.

## Blog (CMS)
- Collections: Blog Posts `68974c57cac027f80fdf887c`, Blog Categories `68974c57cac027f80fdf885d`. Post template page `68974c57cac027f80fdf882c` (RichText element `4cea6f49-68f6-c25c-98a5-446bc9c1fa06`), category template `68974c57cac027f80fdf882b`, Blog list page `68974c57cac027f80fdf882a`.
- Category ids: KPIs `69ab434018303411a765f160`, CRM & Systems `6afa78c79b7b44763a080fd9`, AI & Automation `6afa78c79b7b44763a080fdb`, Marketing `6afa78c79b7b44763a080fdd`, Acquisitions `6afa78c79b7b44763a080fdf`, Dispositions `6afa78c79b7b44763a080fe1`, Rentals `6afa78c79b7b44763a080fe3`, Scaling `6afa78c79b7b44763a080fe5` (7 new ones created, staged).
- New posts are created with `create_collection_items` (isDraft false, fields: name, slug, date, post-summary, author-name, categories, post-body). Source: `webflow/cms/posts.csv`, posts dated 2026-05-19 onward, in date order, batches of 5.
- Batch 1 done (2026-05-19 .. 2026-06-16: speed-to-lead, acquisition-manager-playbook, seller-lead-nurture, migrate-real-estate-crm, seller-ghosted). Batch 2 done (2026-06-23 .. 2026-07-21: cost-per-contract, dispositions-guide, how-to-score-seller-calls, a2p-10dlc, offer-rejected). Remaining: 16 posts from rental-portfolio-management-system (2026-07-28) onward; ready as `webflow/cms/posts-remaining-16.csv` for Webflow's CMS import (cheaper than API batches, which echo every body back).
- New posts have no thumbnail/main image or author image yet. Blog templates still use the old design.
- Owner declined the `create_page_folder` call for `es`/`services` once; ask before retrying.
