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
- **Post template restyled (in place, staging only):** old `page-wrapper` (8847df60-c7c4-099b-32de-4d973e8e3548) and pop-ups div (0bb08c85-825a-0194-b19f-5d9e43847805) set to hidden (reversible), old cursor component hidden by CSS. New native layout `main` 416e2b19-e080-61a2-c45a-aac444ddb060 with title/summary/date bound to CMS; RichText moved into `.article__body`; header embed 7950f61c-8931-6775-10ef-4e3415f80553 (also holds small blog CSS), footer embed 1f1b62a5-cd62-95e2-3ab4-353f4d9f25c4; page head/footer code set. Verified on staging for a new and an old post.
- WHTML builder keeps a class only if the `css` param has a rule (even empty) for a class on that element.
- CMS bindings must be set after the element exists (create, then `set_settings` with `binding`).
- To do: paragraph spacing in post body is tight (rich-text rule in header embed not winning; add stronger selector); category breadcrumb, "Keep reading" related posts, hub box; Blog list page and category template still old design; images for new posts.
- 2026-11-16: owner imported the remaining 16 posts by CSV (all 41 posts in CMS, categories set).
- **Blog list page** (68974c57cac027f80fdf882a) restyled in place: old `page-wrapper` ab62f4ce-3bbf-1ed2-d1ca-347ecf38f0f0 hidden; CMS list section 6e17c30f-fc18-7709-fc10-5629ca0d68c1 moved to body and restyled by CSS in header embed 21d47800-4b73-a984-6555-b6c157f233ca + override embed 253c0607-e4f3-3adf-e5e5-c9d49d19bd8f; footer embed 9b1c19ce-e875-3f6a-adc0-1ba93b2c7e34.
- **Category template** (68974c57cac027f80fdf882b) restyled in place: wrapper 7e4f9f5c-3f86-acb6-2927-670277f19bb7 hidden; list section 7e4f9f5c-3f86-acb6-2927-670277f19bcb moved; native hero cae76a9f-8948-25bd-5179-dea2b16a006e bound to category name/description; header embed 62479b02-a0e9-ae2b-c9e6-6b30bfdbf5d2, override embed 6c882971-eae3-8c28-0f28-e45fa972bbd4, footer embed 9a568611-32d7-aa47-a031-7a8409afabbf. Card date hidden there (old binding shows created date, element not reachable by API).
- Post template: Webflow renamed the layout class to `kd-post-1`; spacing overrides (embed 900eed9b-363f-df51-0b1b-451e41ac6434) target `main.is-blog`.
- Blog still to do: related posts + category breadcrumb on posts, images for the 26 new posts, extra old categories (Industry Insights, Tips & Tricks, Webinars & Events) are empty.
- Language decision pending: owner asked add-on vs manual; recommended the Localization add-on.

## 2026-11-16 (later): go-live prep, owner asked for a full publish
- Owner bought Localization. Locales: primary `68974c57cac027f80fdf8845` (cms `…8846`), Spanish `6afb6419e78a2109902d68ac` (cms `6afb6419e78a2109902d68b1`, subdirectory `es`). The MCP localization tool cannot write html-embed nodes (needs `html`, schema only allows `text`), so Spanish page bodies are delivered by a hosted bundle `kd-es.js` that swaps header/main/footer on `/es/*` (see kd-head.js).
- 4 gap posts added (2026-02-10..03-03), ids in `webflow/cms/post-ids.json` (all 45 slugs -> item ids).
- Covers: `tools/covers.js` -> `webflow/covers/`. CMS image fields accept the public raw GitHub URL of this branch (Webflow copies the file). 30 posts (26 + 4 new) have the new covers; the original 15 keep the owner's existing images.
- Related posts: `webflow/cms/post-index.json` (hub-and-spoke relations from build.py) -> hosted `kd-posts.js`, rendered by kd-site.js on /post/ pages.
- Hosted v2 files (2026-11-16): head js `…/6afb6a420fb8f221316e3e1e_kd-head-2.js`, site js `…/6afb6b5f93952b962386fae2_kd-site-3.js`, Spanish bundle `…/6afb6a2ccdedf3e0cadbe563_kd-es.js` (built by tools/build_es.py; URL is inside kd-head.js), posts index `…/6afb6a2dfb12da21134b8439_kd-posts.js`. Every page's head/footer code must point at the v2 head/site files.

## 2026-11-17: go-live switchover done on staging (live domain still old until the custom-domain publish)
- All 45 posts have kd-cover images (original 15 replaced too). Article template has a cover Image `704bf424-31cb-7457-1f03-ecf8b34f2dac` bound to Main Image; CSS in embed 900eed9b.
- Every new page footer code -> kd-site-3.js (`…/6afb6b5f93952b962386fae2_kd-site-3.js`: ES toggle only shows when /es exists, Spanish blog strings).
- SEO: Spanish titles/descriptions on all pages (locale `6afb6419e78a2109902d68ac`), OG image kd-og-default, JSON-LD (FAQ/breadcrumb/org) set via page schema API, EN + ES.
- Home: real homepage `68974c57cac027f80fdf8828` filled in place: embeds `78f33fd8-8958-3aaf-4243-63ff93cc45b1` (header+main) and `1fb5cc24-988c-e004-998d-3103ee77f3a1` (footer+chrome); old wrapper `ab62f4ce…f0f0` and pop-ups block `748bdac5…0189` hidden; old footer code saved in webflow/rollback/home-footer-code-old.html.
- 404 utility page `…8835` filled in place: embed `2412e5ef-1ed4-16b5-e8fa-515a84a5bdff`; old wrapper and block hidden.
- Old pages renamed old-* and set to draft: services 8836, our-team 883b, contact 8834, thank-you 883c, privacy 8838, terms 8839. kd-home and kd-404 drafted.
- New pages took real slugs: services, our-team, contact-us, thank-you, policies/privacy-policy, policies/terms-conditions; crm, ai-suite, ai-agent (waiting for the owner's `services` folder; then they become /services/*).
- Member pages excluded from sitemap. Spanish locale switched on by the owner.
- Rollback: unhide old wrappers, set old pages draft:false with original slugs, swap new ones back to kd-*.

## 2026-11-17: LIVE
- Owner said "go". Services folder `6afc2be72931cce2df0049b5` (created by owner) holds CRM / AI Suite / AI Agent -> /services/*.
- Published to www.kpidriver.com + kpidriver.com (three publishes: launch, then two sitemap clean-ups).
- Verified live: all main pages 200, /es and /es/services/* in Spanish, old-* pages 404, article covers + related posts, JSON-LD present, no horizontal scroll on mobile.
- Sitemap: member pages + knowledge base categories (6) + articles (33) excluded in EN and ES. All 45 posts listed.

## 2026-11-17: owner fixes, round 1 after launch (live)
- kd-site-2.css `…/6afc3ad0e9c990f48c2ea42d_kd-site-2.css` + kd-site-4.js `…/6afc3ad01cbf020bc26c2ab7_kd-site-4.js` on every page (home, 404, template, all new pages, blog list/category/post templates).
  - Services menu opens on hover (desktop, JS adds html.nav-hover; arrow hidden there, kept on phones).
  - Client login menu centred, labels only; CRM/AI Suite logins + CRM Status open in a new tab; CRM Status -> https://status.gohighlevel.com/ (JS rewrite of old pulsetic link; source partials updated too).
  - Every CTA band (.cta with a[data-book]) now embeds that booking calendar (GHL iframe + form_embed.js) instead of the button.
  - Boast cards were hidden by the old-cursor rule `[class*=cursor]` (matches `u-cursor-pointer`); override added. Reviews fallback note hides once Boast/Elfsight render.
  - Webflow pagination Next/Prev on one line.
- Thumbnails: `tools/thumbs.js` -> `webflow/thumbs/` (900x900, centred for the 220x300 / 350x300 list crops); set on all 45 posts' Thumbnail image.
- Deleted empty categories: Webinars & Events, Product News & Updates, Case Studies (Industry Insights and Tips & Tricks have posts, kept).
- Site-wide footer code (old counter + jQuery 2.1.3) removed; copy in webflow/rollback/site-footer-code-old.html.
- Drafts folder `6afc3d063f5ff7bba067635b` (/drafts) holds the 6 old pages, KD Template, Home (new), Not Found (new); all still draft.

## 2026-11-17: owner fixes, round 2 (live)
- kd-site-3.css `…/6afc89bf17b0f29d6cbfdf90_kd-site-3.css` + kd-site-5.js `…/6afc89bf7bb79608ac600a6b_kd-site-5.js` on all 16 pages that had round-1 code.
  - Services menu centred under its link (`.nav-hover .nav__menu` translateX(-50%)).
  - Client login opens on hover with a mouse (JS mouseenter/mouseleave, 160 ms close delay; invisible bridge so the pointer can reach it).
  - CTA band calendar embed paused at the owner's request (booking calendars and contact form being rebuilt in another chat): CTA bands show the button again. Re-enable later in site.js.
- Member area restyled and still hidden (not in nav, out of sitemap): Knowledge Base `…8837`, Log in `…883d`, KB categories template `…882f`, KB articles template `…882e`.
  - Each has a header embed (prepended to body; KB and Log in include a new hero) and a footer embed (appended). Embed ids: KB 729cc7da…/0605e9a9…, Log in 360db769…/d56287af…, categories f9317e67…/ab555572…, articles d82fc8db…/512401bd….
  - Head code = original Memberstack/Finsweet code kept first, then kd-head-2.js, fonts, kd-site-3.css, kd-members-3.css `…/6afc8d4801eb3ff6c4c36ee1_kd-members-3.css`, kd-site-5.js (defer). Original Memberstack footer scripts untouched.
  - kd-members.css (source) hides old navbar/footer/marquee/FAQ/cursor and restyles Memberstack login, Finsweet filter/sort, category cards, article body. Article hero order and phone overflow fixed.
- For Clients B2B (`…8831`), B2C (`…8833`) and Case Studies (`…882d`) were template lorem ipsum: moved to the Drafts folder as drafts at the owner's request (now 404; the empty for-clients folder `…8832` remains).
- Sentence case: the every-word capitals (`body { text-transform: capitalize }` in site.css v5 and in the old Webflow stylesheet) dropped at the owner's request. kd-site-4.css `…/6afc8ed7cad3565ff6306016_kd-site-4.css` (= kd-site-3.css + `html body { text-transform: none }`) on all 16 site pages + 4 member pages. Explicit ALL-CAPS headings/buttons unchanged.

## 2026-11-17: owner fixes, round 3 (live)
- kd-site-6.js `…/6afc95dd44dd75357540c0cf_kd-site-6.js` on all 16 site pages (footer code) + 4 member pages (head, deferred). Source: site.js "v4" block; hosted copy = site.js with `.faq` -> `.kd-faq` in the reveal selector.
  - Title Case (English only) for headings, nav, client login, footer links, buttons, `a.link`, `dt`, labels, tabs, breadcrumbs. Small words (a, and, the, of, to…) stay lower except first/last/after a sentence break. Acronyms and mixed-case words kept. Skipped: blog post pages (`.is-blog`, `.kd-post-1`, rich text), FAQ questions, form fields, `.keep-case`, `[data-no-tc]`. Paragraphs stay sentence case. Spanish keeps Spanish sentence case.
  - Footer: "AI Suite terms at kpidriver.ai" link removed (JS on live; removed from build.py and webflow/footer.html).
  - Contact page: Google map (keyless `google.com/maps?q=…&output=embed`, lazy) under the office address, EN + ES.
- Sources updated for the items the owner named: build.py header/footer (Client Login, Services Overview, CRM Login, AI Suite Login, no AI Suite terms), src/pages/contact-us.html (Book a Discovery Call, Existing Clients, Check CRM Status, Send a General Inquiry), webflow/header.html + footer.html. The embeds on Webflow still hold the old wording; the script corrects it at load.
