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
- Page head code (same for every page): kd-head.js + fonts + kd-site.css. Page footer code: kd-site.js. Check whether duplicates inherit it; if not, set it.
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
| Thank You | 6afa182cf610cfffbefd4cb2 | /kd-thank-you | content + code set, not yet verified |
| Our Team, Contact, Services, CRM, AI Suite, AI Agent, Home, 404, Privacy, Terms, Blog | | | to do |

## Open decisions for the owner
- Knowledge Base, Log in, Case studies, For-clients pages use Memberstack / old design: keep, redirect or retire?
- Spanish: Localization add-on.
- Blog: restyle CMS templates (Blog, post, category) and import 26 new posts + categories (`webflow/cms`).
