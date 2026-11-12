# KPI DRIVER website revamp

A complete static preview of the redesigned **www.kpidriver.com**, plus the handoff material for rebuilding it in Webflow. The live Webflow site has not been changed.

## Run it

```bash
python3 build.py            # builds site/ (preview: noindex)
python3 -m http.server 4173 --directory site
```

`python3 build.py --production` emits indexable robots meta, `robots.txt` and `sitemap.xml` for a real deployment.

## Layout

| Path | What it is |
|---|---|
| `src/pages/` | One file per page: front matter (title, description) + HTML body |
| `src/partials/` | Shared sections: CTA band, product triad, lifecycle journey, AI Suite access model, workflow demo |
| `src/data/faqs.json` | FAQ sets (also emitted as FAQPage structured data) |
| `src/data/blog.json` | The 15 existing blog posts, exported from the Webflow "Blog Posts" collection |
| `src/assets/` | `css/site.css` (design system), `js/site.js` (interactions), images |
| `build.py` | Generator: layout, nav, footer, blog/category/post pages, sitemap, robots |
| `site/` | Built output (committed so the preview can be opened without building) |
| `docs/` | Handoff: Webflow plan, claims register, launch checklist, redirects, test results |

## Maintaining it

- **Edit copy:** change the file in `src/pages/` or `src/partials/`, run `python3 build.py`.
- **FAQs:** edit `src/data/faqs.json`.
- **Booking calendars / status link:** the `CAL` map and constants at the top of `build.py`. Every booking CTA uses `href="{{book}}"`.
- **Reviews:** the Elfsight widget ID lives in `src/partials/reviews.html`.
- **Blog:** in production the blog stays in the Webflow CMS. `blog.json` exists only to render the preview.
- Never add prices, rate cards or plan tiers. Commercial questions route to **Book a Discovery Call**.

See `docs/HANDOFF.md` for everything else.
