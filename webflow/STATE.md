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
| Home | 6afa6d7a38fcd20700ba38d7 | /kd-home | main content set; PAGE HEAD/FOOTER CODE NOT SET (owner declined that call) so it renders unstyled until set |
| 404, Privacy, Terms, Blog | | | to do |

## Open decisions for the owner
- Knowledge Base, Log in, Case studies, For-clients pages use Memberstack / old design: keep, redirect or retire?
- Spanish: Localization add-on.
- Blog: restyle CMS templates (Blog, post, category) and import 26 new posts + categories (`webflow/cms`).

## Owner decisions (2026-11-15)
- Member pages (Knowledge Base, Log in, Case studies, For clients): keep published but hidden, reachable by direct link only (not in nav; exclude from sitemap/search).
- Spanish: no Localization add-on; build ES pages as ordinary pages under an `es` folder with the header toggle. Page folders (`es`, `services`) need the Designer open: owner must launch https://kpidriver.design.webflow.com?app=dc8209c65e3ec02254d15275ca056539c89f6d15741893a0adf29ad6f381eb99
- Contact form: use the existing GHL survey `hs57W9QgapW3WAyGZeZb` (done).
- JSON-LD scripts are stripped from embeds for now; add from `page-meta.json` via the page schema tool.
