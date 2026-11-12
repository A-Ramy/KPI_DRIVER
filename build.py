#!/usr/bin/env python3
"""KPI DRIVER static preview builder.

    python3 build.py              # preview build  -> site/   (noindex, relative .html links)
    python3 build.py --production # same pages with indexable robots meta

Pages live in src/pages/*.html (front matter + body). Blog posts come from
src/data/blog.json (exported from the Webflow "Blog Posts" collection).
No dependencies beyond the Python standard library.
"""
import html, json, re, shutil, sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
SRC, OUT = ROOT / "src", ROOT / "site"
ORIGIN = "https://www.kpidriver.com"
PRODUCTION = "--production" in sys.argv
BOOKING_URL = "https://link.kpidriver.com/widget/booking/17jl7cP7dvOAU48s6C3L"
STATUS_URL = "https://app.pulsetic.com/status/bXxHxF27/"
FONTS = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap"

FAQS = json.loads((SRC / "data" / "faqs.json").read_text(encoding="utf8"))
BLOG = json.loads((SRC / "data" / "blog.json").read_text(encoding="utf8"))
POSTS = sorted(BLOG["posts"], key=lambda p: p["date"], reverse=True)
esc = html.escape


def route_of(path):
    """site-relative file path -> production route (Webflow slug)."""
    r = "/" + path[:-5]
    return "/" if r == "/index" else r


def nav(root, current):
    def cur(p):
        return ' aria-current="page"' if current == p else ""
    return f"""
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{root}index.html" aria-label="KPI DRIVER home"><img src="{root}assets/img/logo-light-text.svg" alt="KPI DRIVER" width="121" height="30"></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h16M3 11h16M3 16h16"/></svg>
    </button>
    <nav class="nav" id="site-nav" aria-label="Main">
      <ul class="nav__list">
        <li class="nav__item"><a class="nav__link" href="{root}index.html"{cur('index.html')}>Home</a></li>
        <li class="nav__item nav__item--has-menu">
          <a class="nav__link" href="{root}services.html"{cur('services.html')}>Services</a>
          <button class="nav__trigger" type="button" aria-expanded="false" aria-controls="services-menu" aria-label="Show Services pages">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 4l4 4 4-4"/></svg>
          </button>
          <div class="nav__menu" id="services-menu" hidden>
            <a class="tone-crm" href="{root}services/crm.html"><i></i><b>CRM</b><span>The engine of your operation</span></a>
            <a class="tone-suite" href="{root}services/ai-suite.html"><i></i><b>AI Suite</b><span>Nitro for the CRM engine. Access included.</span></a>
            <a class="tone-agent" href="{root}services/ai-agent.html"><i></i><b>AI Agent</b><span>Optional follow-up and communication</span></a>
          </div>
        </li>
        <li class="nav__item"><a class="nav__link" href="{root}our-team.html"{cur('our-team.html')}>Our Team</a></li>
        <li class="nav__item"><a class="nav__link" href="{root}blog.html"{cur('blog.html')}>Blog</a></li>
        <li class="nav__item"><a class="nav__link" href="{root}contact-us.html"{cur('contact-us.html')}>Contact Us</a></li>
      </ul>
      <a class="btn btn--primary btn--sm nav__cta" href="{root}book-discovery-call.html" data-event="discovery_call_click" data-label="header">Book a Discovery Call</a>
    </nav>
  </div>
</header>"""


def footer(root):
    return f"""
<footer class="site-footer">
  <div class="wrap">
    <div class="footer__top">
      <div class="footer__brand">
        <img src="{root}assets/img/logo-light-text.svg" alt="KPI DRIVER" width="137" height="34">
        <p class="footer__sig">Make The Gear Shift!</p>
        <div class="gearline" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <p class="muted">The command center for real estate investors and their teams. Built by investors, for investors.</p>
      </div>
      <div class="footer__col">
        <h2>SERVICES</h2>
        <ul>
          <li><a href="{root}services.html">Services overview</a></li>
          <li><a href="{root}services/crm.html">CRM</a></li>
          <li><a href="{root}services/ai-suite.html">AI Suite</a></li>
          <li><a href="{root}services/ai-agent.html">AI Agent</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h2>COMPANY</h2>
        <ul>
          <li><a href="{root}our-team.html">Our Team</a></li>
          <li><a href="{root}blog.html">Blog</a></li>
          <li><a href="{root}contact-us.html">Contact Us</a></li>
          <li><a href="{root}book-discovery-call.html" data-event="discovery_call_click" data-label="footer">Book a Discovery Call</a></li>
          <li><a href="{STATUS_URL}" rel="noopener">CRM Status</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h2>CONTACT</h2>
        <ul>
          <li>KPI DRIVER, LLC</li>
          <li><a href="tel:+17868228188">(786) 822-8188</a></li>
          <li><a href="mailto:info@kpidriver.com">info@kpidriver.com</a></li>
          <li>1858 NW 141st Ave<small>Pembroke Pines, FL 33028</small></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <p>© <span id="year">{date.today().year}</span> KPI DRIVER, LLC. All rights reserved. · <a href="{root}policies/privacy-policy.html">Privacy Policy</a> · <a href="{root}policies/terms-conditions.html">Terms &amp; Conditions</a></p>
      <p class="social">
        <a href="https://www.linkedin.com/company/kpi-driver" rel="noopener">LinkedIn</a>
        <a href="https://www.youtube.com/@KPI_DRIVER" rel="noopener">YouTube</a>
        <a href="https://www.instagram.com/kpi_driver" rel="noopener">Instagram</a>
        <a href="https://www.facebook.com/KPI_DRIVER" rel="noopener">Facebook</a>
        <a href="https://x.com/KPIDriver" rel="noopener">X</a>
        <a href="https://www.tiktok.com/@kpidriver" rel="noopener">TikTok</a>
      </p>
    </div>
  </div>
</footer>"""


def faq_block(name):
    items = FAQS[name]
    rows = "".join(f"<details><summary>{esc(q)}</summary><div><p>{a}</p></div></details>" for q, a in items)
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in items]}
    return f'<div class="faq">{rows}</div>\n<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'


def partial(name, root):
    p = SRC / "partials" / f"{name}.html"
    return expand(p.read_text(encoding="utf8"), root)


def expand(body, root):
    body = re.sub(r"\{\{> faq ([\w-]+)\}\}", lambda m: faq_block(m.group(1)), body)
    body = re.sub(r"\{\{> ([\w-]+)\}\}", lambda m: partial(m.group(1), root), body)
    return (body.replace("{{root}}", root).replace("{{book}}", root + "book-discovery-call.html")
            .replace("{{booking_url}}", BOOKING_URL).replace("{{status_url}}", STATUS_URL))


def head(meta, path, root):
    title, desc = meta["title"], meta["description"]
    canonical = ORIGIN + route_of(path)
    robots = "index, follow" if PRODUCTION and meta.get("robots") != "noindex" else "noindex, nofollow"
    extra = meta.get("jsonld", "")
    return f"""<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="{meta.get('og_type', 'website')}">
<meta property="og:site_name" content="KPI DRIVER">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{ORIGIN}/assets/img/og-default.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#070b11">
<link rel="icon" href="{root}assets/img/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="{root}assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="{root}assets/css/site.css">
{extra}"""


def render(path, meta, body):
    depth = path.count("/")
    root = "../" * depth
    current = meta.get("nav", path)
    inner = f"""{nav(root, current)}
<main id="main">
{expand(body, root)}
</main>
{footer(root)}
<script src="{root}assets/js/site.js" defer></script>"""
    page = f"""<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{head(meta, path, root)}
</head>
<body>
{inner}
</body>
</html>
"""
    dest = OUT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(page, encoding="utf8")
    if path == "index.html":
        # Fragment variant for hosts that wrap the page in their own document skeleton.
        frag = f'<title>KPI DRIVER Website Preview</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<link rel="stylesheet" href="{FONTS}">\n<link rel="stylesheet" href="assets/css/site.css">\n<script>document.documentElement.classList.add("no-js")</script>\n{inner}\n'
        (OUT / "_preview-index.html").write_text(frag, encoding="utf8")
    return path


def parse(text):
    fm, body = text.split("\n---\n", 1)
    meta = dict(l.split(": ", 1) for l in fm.strip().splitlines() if ": " in l)
    return meta, body


def fmt_date(iso):
    y, m, d = map(int, iso.split("-"))
    return f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} {d}, {y}"


def post_row(p, root):
    return f"""<a class="post-row" href="{root}post/{p['slug']}.html">
  <div class="post-row__meta"><b>{esc(p['category'])}</b><span>{fmt_date(p['date'])}</span></div>
  <div><h3>{esc(p['title'])}</h3><p>{esc(p['summary'])}</p></div>
  <span class="post-row__go" aria-hidden="true">→</span>
</a>"""


def cats_nav(root, current_slug=None):
    used = {p["category_slug"] for p in POSTS}
    links = [f'<a href="{root}blog.html"{"" if current_slug else " aria-current=\"page\""}>All articles</a>']
    for c in BLOG["categories"]:
        if c["slug"] in used:
            links.append(f'<a href="{root}blog-category/{c["slug"]}.html"{" aria-current=\"page\"" if c["slug"] == current_slug else ""}>{esc(c["name"])}</a>')
    return f'<nav class="cats" aria-label="Blog categories">{"".join(links)}</nav>'


def blog_pages():
    built = []
    # index
    first, rest = POSTS[0], POSTS[1:]
    body = f"""<section class="section phead section--grid"><div class="wrap">
<ol class="crumbs"><li><a href="{{{{root}}}}index.html">Home</a></li><li>Blog</li></ol>
<h1>Notes from the <span class="hl-green">operator's seat</span></h1>
<p class="lede">Practical writing on CRMs, KPI tracking, automation and AI for real estate investors and the teams who run their pipelines.</p>
</div></section>
<section class="section section--paper section--tight"><div class="wrap stack stack--lg">
{cats_nav('{{root}}')}
<div>
<a class="post-feature" href="{{{{root}}}}post/{first['slug']}.html">
  <span class="eyebrow">Latest · {esc(first['category'])} · {fmt_date(first['date'])}</span>
  <h2>{esc(first['title'])}</h2><p class="lede">{esc(first['summary'])}</p><span class="link arrow">Read the article</span>
</a>
<div class="posts">{''.join(post_row(p, '{{root}}') for p in rest)}</div>
</div></div></section>
{{{{> cta}}}}"""
    built.append(render("blog.html", {"title": "Blog | KPI DRIVER — CRM, KPIs, Automation & AI for Real Estate Investors",
        "description": "Practical articles on real estate CRMs, KPI tracking, automation and AI for investors and their teams."}, body))
    # categories (all six existing URLs are kept; empty ones get a real empty state)
    for c in BLOG["categories"]:
        ps = [p for p in POSTS if p["category_slug"] == c["slug"]]
        listing = f'<div class="posts">{"".join(post_row(p, "{{root}}") for p in ps)}</div>' if ps else \
            f'<div class="stack"><h2 style="font-size:var(--step-2);text-transform:none">Nothing published in {esc(c["name"])} yet.</h2><p class="muted">New articles land on the main blog page first.</p><p><a class="link arrow" href="{{{{root}}}}blog.html">Browse all articles</a></p></div>'
        body = f"""<section class="section phead section--grid"><div class="wrap">
<ol class="crumbs"><li><a href="{{{{root}}}}index.html">Home</a></li><li><a href="{{{{root}}}}blog.html">Blog</a></li><li>{esc(c['name'])}</li></ol>
<h1>{esc(c['name'])}</h1></div></section>
<section class="section section--paper section--tight"><div class="wrap stack stack--lg">{cats_nav('{{root}}', c['slug'])}{listing}</div></section>
{{{{> cta}}}}"""
        built.append(render(f"blog-category/{c['slug']}.html", {"title": f"{c['name']} | KPI DRIVER Blog", "nav": "blog.html",
            "description": f"KPI DRIVER articles in {c['name']}.", "robots": "index" if ps else "noindex"}, body))
    # posts
    by_slug = {p["slug"]: p for p in POSTS}
    for p in POSTS:
        related = [by_slug[s] for s in p.get("related", []) if s in by_slug][:3]
        ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"], "datePublished": p["date"],
              "description": p["summary"], "author": {"@type": "Person", "name": p["author"]},
              "publisher": {"@type": "Organization", "name": "KPI DRIVER"}, "mainEntityOfPage": f"{ORIGIN}/post/{p['slug']}"}
        rel = f"""<section class="section section--tight"><div class="wrap"><div class="head"><p class="eyebrow">Keep reading</p><h2>Related articles</h2></div>
<div class="posts">{''.join(post_row(r, '{{root}}') for r in related)}</div></div></section>""" if related else ""
        body = f"""<section class="section phead section--grid"><div class="wrap">
<ol class="crumbs"><li><a href="{{{{root}}}}index.html">Home</a></li><li><a href="{{{{root}}}}blog.html">Blog</a></li><li><a href="{{{{root}}}}blog-category/{p['category_slug']}.html">{esc(p['category'])}</a></li></ol>
<h1 style="max-width:20ch">{esc(p['title'])}</h1>
<p class="lede">{esc(p['summary'])}</p>
<div class="byline"><img src="{{{{root}}}}assets/img/team/ahmed.webp" alt="" width="44" height="44"><span>By <b>{esc(p['author'])}</b>, Chief Technology Officer</span><span>·</span><time datetime="{p['date']}">{fmt_date(p['date'])}</time></div>
</div></section>
<section class="section section--paper section--tight"><div class="wrap"><article class="article"><div class="article__body">{p['body']}</div></article></div></section>
{rel}
{{{{> cta}}}}"""
        built.append(render(f"post/{p['slug']}.html", {"title": f"{p['title']} | KPI DRIVER Blog", "description": p["summary"], "nav": "blog.html",
            "og_type": "article", "jsonld": f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'}, body))
    return built


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    shutil.copytree(SRC / "assets", OUT / "assets")
    built = []
    for f in sorted((SRC / "pages").rglob("*.html")):
        meta, body = parse(f.read_text(encoding="utf8"))
        built.append(render(str(f.relative_to(SRC / "pages")).replace("\\", "/"), meta, body))
    built += blog_pages()
    indexable = [p for p in built if p not in ("404.html", "thank-you.html") and not p.startswith("blog-category/webinars") ]
    urls = "\n".join(f"  <url><loc>{ORIGIN}{route_of(p)}</loc></url>" for p in sorted(indexable))
    (OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n', encoding="utf8")
    robots = f"User-agent: *\nAllow: /\nDisallow: /thank-you\n\nSitemap: {ORIGIN}/sitemap.xml\n" if PRODUCTION else "User-agent: *\nDisallow: /\n"
    (OUT / "robots.txt").write_text(robots, encoding="utf8")
    print(f"built {len(built)} pages -> {OUT} ({'production' if PRODUCTION else 'preview, noindex'})")


if __name__ == "__main__":
    main()
