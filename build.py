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
BOOK_BASE = "https://link.kpidriver.com/widget/booking/"
# Booking calendars, as embedded on the current live site (one per placement).
CAL = {"header": "17jl7cP7dvOAU48s6C3L", "footer": "l4rvIxCnb9DtsSTM6SoQ", "home": "9g3ccVyd2a9NsV51QuKN",
       "services": "3bltGmUYGxpIUtG09p3V", "team": "o811nwxOSIS90zvrwX33", "contact": "usaNbU09ACXDqb1C52Rd"}
PAGE_CAL = "header"


def cal_for(path):
    if path == "index.html": return "home"
    if path.startswith("services"): return "services"
    if path == "our-team.html": return "team"
    if path == "contact-us.html": return "contact"
    return "header"


def book_attrs(key):
    """Used inside href="…": the link opens the scheduler directly; JS upgrades it to the embedded popup."""
    return f'{BOOK_BASE}{CAL[key]}" target="_blank" rel="noopener" data-book="{CAL[key]}'
FONTS = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap"

THEME_JS = ("<script>(function(){var d=document.documentElement;try{if(!d.hasAttribute('data-theme')){var s=null;"
            "try{s=localStorage.getItem('kd-theme')}catch(e){}"
            "d.setAttribute('data-theme',s||(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))}"
            "if(window.matchMedia&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window)d.classList.add('anim')}catch(e){}"
            # gear-shift page transition: remember the page being left, then tag the incoming page as an up- or down-shift
            "var g=+d.getAttribute('data-gear')||0,S=function(){try{sessionStorage.setItem('kd-from',g)}catch(e){}};"
            "addEventListener('pagehide',S);addEventListener('pageswap',S);"
            "addEventListener('pagereveal',function(e){if(!e.viewTransition)return;var f=null;try{f=sessionStorage.getItem('kd-from')}catch(x){}"
            "if(f===null)return;var c=+f>g?'vt-down':'vt-up',z=function(){d.classList.remove('vt',c)};d.classList.add('vt',c);"
            "e.viewTransition.finished.then(z,z)})})()</script>")
GEARS = ["index.html", "services.html", "services/crm.html", "services/ai-suite.html", "services/ai-agent.html", "our-team.html", "blog.html",
         "contact-us.html", "book-discovery-call.html"]
TEAM = [("Brandy Pollack", "Chief Executive Officer"), ("Ahmed Ramy", "Chief Technology Officer"), ("Jan Arpilleda", "Lead Account Manager"),
        ("Anas Abid", "Tech & Support Team Lead"), ("Mostafa Kourany", "Accounting & Financial Advisor")]
NOINDEX = set()

ES_PAGES = ["index.html", "services.html", "services/crm.html", "services/ai-suite.html", "services/ai-agent.html", "our-team.html",
            "contact-us.html", "book-discovery-call.html", "thank-you.html"]
_esf = SRC / "data" / "es.json"
ES = json.loads(_esf.read_text(encoding="utf8")) if _esf.exists() else {}
ES_VALUES = set(ES.values())
ES_MISSING = []
LANG = "en"
_norm = lambda s: re.sub(r"\s+", " ", s).strip()


def T(s):
    """Translate one string to Spanish when building the /es/ pages; unknown strings are collected for translation."""
    if LANG != "es": return s
    k = _norm(s)
    if not k or not re.search(r"[A-Za-z]{2}", k) or k in ES_VALUES: return s
    if k in ES:
        lead, tail = s[:len(s) - len(s.lstrip())], s[len(s.rstrip()):]
        return lead + ES[k] + tail
    if k not in ES_MISSING: ES_MISSING.append(k)
    return s


_TOK = re.compile(r"(<script.*?</script>|<style.*?</style>|<!--.*?-->|<[^>]+>)", re.S)
_ATTR = re.compile(r'\b(aria-label|alt|placeholder|data-name)="([^"]+)"')


_KEEP = re.compile(r"(iMessage|iOS|[\w.+-]+@[\w-]+\.[\w.]+|(?:crm\.|www\.)?kpidriver\.(?:com|ai))")


def keep_case(h):
    """Names and addresses that must not be re-cased by the site's capitalised typography."""
    out = []
    for tok in _TOK.split(h):
        out.append(tok if tok.startswith("<") else _KEEP.sub(r'<span class="keep-case">\1</span>', tok))
    return "".join(out)


def tr_html(h):
    out = []
    for tok in _TOK.split(h):
        if tok.startswith("<"):
            if not tok.startswith(("<script", "<style", "<!--")):
                tok = _ATTR.sub(lambda m: f'{m.group(1)}="{T(m.group(2))}"', tok)
            out.append(tok)
        else:
            out.append(T(tok))
    return "".join(out)


FAQS = json.loads((SRC / "data" / "faqs.json").read_text(encoding="utf8"))
BLOG = json.loads((SRC / "data" / "blog.json").read_text(encoding="utf8"))
def load_text_posts():
    """Posts written as light text (=== header, # title, > summary, ## heading, - bullet, paragraphs)."""
    out = []
    for f in sorted((SRC / "data").glob("posts-*.txt")):
        for block in f.read_text(encoding="utf8").split("\n=== "):
            block = block.removeprefix("=== ").strip()
            if not block: continue
            lines = block.split("\n")
            slug, d, cat, typ, pil = [x.strip() for x in lines[0].split("|")]
            title = summary = ""; body = []; ul = False
            for ln in lines[1:]:
                ln = ln.strip()
                if not ln: continue
                if ln.startswith("- "):
                    if not ul: body.append("<ul>"); ul = True
                    body.append(f"<li>{html.escape(ln[2:], quote=False)}</li>"); continue
                if ul: body.append("</ul>"); ul = False
                if ln.startswith("# "): title = ln[2:]
                elif ln.startswith("> "): summary = ln[2:]
                elif ln.startswith("## "): body.append(f"<h2>{html.escape(ln[3:], quote=False)}</h2>")
                else: body.append(f"<p>{html.escape(ln, quote=False)}</p>")
            if ul: body.append("</ul>")
            out.append({"slug": slug, "title": title, "date": d, "author": "Ahmed Ramy", "summary": summary, "body": "".join(body),
                        "category_slug": cat, "category": cat, "type": typ, "pillar": pil == "1", "related": []})
    return out


POSTS = sorted(BLOG["posts"] + load_text_posts(), key=lambda p: p["date"], reverse=True)
esc = html.escape


def route_of(path):
    """site-relative file path -> production route (Webflow slug)."""
    r = "/" + path[:-5]
    return "/" if r == "/index" else r


def nav(root, current, path="index.html"):
    if LANG == "es":
        lang_link = f'<a class="lang-toggle" href="{root}../{path}" hreflang="en" lang="en" aria-label="View this page in English" data-event="language_switch" data-label="en"><b>EN</b></a>'
    else:
        target = path if path in ES_PAGES else "index.html"
        lang_link = f'<a class="lang-toggle" href="{root}es/{target}" hreflang="es" lang="es" aria-label="Ver esta página en español" data-event="language_switch" data-label="es"><b>ES</b></a>'
    def cur(p):
        return ' aria-current="page"' if current == p else ""
    return f"""
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{root}index.html" aria-label="KPI DRIVER home"><img class="logo--dark" src="{root}assets/img/brand/logo-h-light.png" alt="KPI DRIVER" width="178" height="24"><img class="logo--light" src="{root}assets/img/brand/logo-h-dark.png" alt="" width="178" height="24"></a>
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
      <a class="btn btn--primary btn--sm nav__cta" href="{book_attrs('header')}" data-event="discovery_call_click" data-label="header">Book a Discovery Call</a>
    </nav>
    <details class="login">
      <summary>Client login</summary>
      <div><a href="https://crm.kpidriver.com" rel="noopener" data-event="client_login_click" data-label="crm"><b>CRM</b><span>crm.kpidriver.com</span></a><a href="https://kpidriver.ai" rel="noopener" data-event="client_login_click" data-label="ai suite"><b>AI Suite</b><span>kpidriver.ai</span></a></div>
    </details>
    {lang_link}
    <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch colour theme">
      <svg class="i-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      <svg class="i-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/></svg>
    </button>
  </div>
</header>"""


def footer(root):
    return f"""
<footer class="site-footer">
  <div class="wrap">
    <div class="footer__top">
      <div class="footer__brand">
        <img src="{root}assets/img/brand/logo-stack-light.png" alt="KPI DRIVER" width="124" height="64" loading="lazy">
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
          <li><a href="{book_attrs('footer')}" data-event="discovery_call_click" data-label="footer">Book a Discovery Call</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h2>CLIENTS</h2>
        <ul>
          <li><a href="https://crm.kpidriver.com" rel="noopener" data-event="client_login_click" data-label="crm">CRM login</a></li>
          <li><a href="https://kpidriver.ai" rel="noopener" data-event="client_login_click" data-label="ai suite">AI Suite login</a></li>
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
      <p>© <span id="year">{date.today().year}</span> KPI DRIVER, LLC. All rights reserved. · <a href="{root}policies/privacy-policy.html">Privacy Policy</a> · <a href="{root}policies/terms-conditions.html">Terms &amp; Conditions</a> · <a href="https://kpidriver.ai" rel="noopener">AI Suite terms at kpidriver.ai</a></p>
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
    items = [(T(q), T(a)) for q, a in items]
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
    return (body.replace("{{root}}", root).replace("{{book}}", book_attrs(PAGE_CAL))
            .replace("{{booking_url}}", BOOKING_URL).replace("{{status_url}}", STATUS_URL))


def ld(obj):
    return f'<script type="application/ld+json">{json.dumps(obj, ensure_ascii=False)}</script>'


def crumbs_ld(path, meta):
    if path in ("index.html", "404.html", "thank-you.html"):
        return ""
    label = meta.get("crumb") or meta["title"].split(" | ")[0].split(" — ")[0]
    trail = [("Home", "/")]
    if path.startswith("services/"): trail.append(("Services", "/services"))
    if path.startswith(("post/", "blog-category/")): trail.append(("Blog", "/blog"))
    trail.append((label, route_of(path)))
    return ld({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": ORIGIN + u} for i, (n, u) in enumerate(trail)]})


def page_ld(path):
    if path == "index.html":
        return ld({"@context": "https://schema.org", "@type": "WebSite", "name": "KPI DRIVER", "url": ORIGIN, "inLanguage": "en-US",
                   "description": "CRM, KPI tracking and AI Suite for real estate investors and their teams."})
    if path == "services.html":
        return ld({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "KPI DRIVER Enterprise Optimization Suite",
                   "applicationCategory": "BusinessApplication", "applicationSubCategory": "Real estate CRM", "operatingSystem": "Web, iOS, Android",
                   "description": "A real estate CRM with dedicated pipelines, KPI tracking and included access to a nine-tool AI Suite, built by investors for investors.",
                   "audience": {"@type": "BusinessAudience", "audienceType": "Real estate investors and their teams"},
                   "featureList": ["Lead capture and acquisitions pipeline", "Bilingual nurture campaigns", "Dispositions pipeline", "Transaction coordination and document signatures",
                                   "Contractor and vendor management", "Owned and rental property management", "KPI dashboards", "AI Notes Taker", "AI Sales Coach", "AI Training Coach",
                                   "AI Underwriting", "AI Skiptracing", "AI Data Enrichment", "AI Dashboard", "AI Insights", "AI Projections"],
                   "provider": {"@type": "Organization", "name": "KPI DRIVER", "url": ORIGIN}})
    if path == "our-team.html":
        return ld({"@context": "https://schema.org", "@type": "Organization", "name": "KPI DRIVER", "url": ORIGIN,
                   "employee": [{"@type": "Person", "name": n, "jobTitle": r, "worksFor": {"@type": "Organization", "name": "KPI DRIVER"}} for n, r in TEAM]})
    return ""


def head(meta, path, root):
    title, desc = meta["title"], meta["description"]
    title, desc = T(title), T(desc)
    r = route_of(path)
    canonical = ORIGIN + ("/es" + ("" if r == "/" else r) if LANG == "es" else r)
    alt = ""
    if path in ES_PAGES:
        alt = (f'<link rel="alternate" hreflang="en" href="{ORIGIN}{r}">\n<link rel="alternate" hreflang="es" href="{ORIGIN}/es{"" if r == "/" else r}">\n'
               f'<link rel="alternate" hreflang="x-default" href="{ORIGIN}{r}">\n')
    if meta.get("robots") == "noindex": NOINDEX.add(path)
    robots = "index, follow, max-image-preview:large, max-snippet:-1" if PRODUCTION and meta.get("robots") != "noindex" else "noindex, nofollow"
    extra = meta.get("jsonld", "") + crumbs_ld(path, meta) + page_ld(path)
    return f"""<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canonical}">
{alt}<meta property="og:locale" content="{'es_US' if LANG == 'es' else 'en_US'}">
<meta property="og:type" content="{meta.get('og_type', 'website')}">
<meta property="og:site_name" content="KPI DRIVER">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{ORIGIN}/assets/img/og-default.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#070b11">
{THEME_JS}
<link rel="icon" href="{root}assets/img/favicon.png" type="image/png" sizes="64x64">
<link rel="icon" href="{root}assets/img/brand/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="{root}assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="{FONTS}" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="{FONTS}"></noscript>
<link rel="stylesheet" href="{root}assets/css/site.css">
{extra}"""


def render(path, meta, body):
    global PAGE_CAL, LANG
    PAGE_CAL = cal_for(path)
    for LANG in (["en", "es"] if path in ES_PAGES else ["en"]):
        depth = path.count("/")
        root = "../" * depth
        current = meta.get("nav", path)
        inner = f"""{nav(root, current, path)}
<main id="main"{' class="is-blog"' if current == "blog.html" else ''}>
{expand(body, root)}
</main>
{footer(root)}
<div class="revline" aria-hidden="true"></div>
<div class="shiftfx" aria-hidden="true"><b><i></i><i></i><i></i><i></i></b></div>
<div class="gearhud" aria-hidden="true"><span class="gearhud__label">GEAR</span><ol><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li><li>6</li></ol><span class="gearhud__rev"><i></i></span></div>
<dialog class="bookdlg" id="book-dialog" aria-labelledby="book-dialog-title">
  <div class="bookdlg__bar"><h2 id="book-dialog-title">Book a Discovery Call</h2><button class="bookdlg__close" type="button" aria-label="Close scheduler">Close ✕</button></div>
  <div class="bookdlg__frame"></div>
  <p class="bookdlg__foot">Scheduler not loading? <a class="link" href="{BOOK_BASE}{CAL['header']}" target="_blank" rel="noopener">Open it in a new tab</a>.</p>
</dialog>
<script src="{root}assets/js/site.js" defer></script>"""
        hd = head(meta, path, root)
        if LANG == "es":
            inner, hd = tr_html(inner), hd
            # Spanish pages live in /es/: assets and untranslated sections (blog, legal) stay one level up
            fix = lambda h: re.sub(r'((?:href|src)=")((?:\.\./)*)(assets/|blog\.html|post/|blog-category/|policies/|404\.html)', r"\1\2../\3", h)
            inner, hd = fix(inner), fix(hd)
        inner = keep_case(inner)
        page = f"""<!doctype html>
<html lang="{LANG}" class="no-js" data-gear="{GEARS.index(current) + 1 if current in GEARS else len(GEARS) + 1}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{hd}
</head>
<body>
{inner}
</body>
</html>
"""
        dest = OUT / ("es/" + path if LANG == "es" else path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(page, encoding="utf8")
        if path == "index.html" and LANG == "en":
            # Fragment variant for hosts that wrap the page in their own document skeleton.
            frag = f'<title>KPI DRIVER Website Preview</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<link rel="stylesheet" href="{FONTS}">\n<link rel="stylesheet" href="assets/css/site.css">\n<script>document.documentElement.classList.add("no-js")</script>{THEME_JS}\n{inner}\n'
            (OUT / "_preview-index.html").write_text(frag, encoding="utf8")
    LANG = "en"
    return path


def parse(text):
    fm, body = text.split("\n---\n", 1)
    meta = dict(l.split(": ", 1) for l in fm.strip().splitlines() if ": " in l)
    return meta, body


def fmt_date(iso):
    y, m, d = map(int, iso.split("-"))
    return f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} {d}, {y}"


CATS = [
    {"slug": "kpis-performance", "name": "KPIs & Performance", "desc": "Which numbers to track across acquisitions, dispositions and marketing, and how to read them."},
    {"slug": "crm-systems", "name": "CRM & Systems", "desc": "How to choose, set up and run the CRM and pipelines behind a real estate investing business."},
    {"slug": "ai-automation", "name": "AI & Automation", "desc": "Where AI agents, call coaching and automation help an investing team, and where they do not."},
    {"slug": "marketing-lead-generation", "name": "Marketing & Lead Generation", "desc": "Lead sources, follow-up and nurture, and how to measure what marketing returns."},
    {"slug": "acquisitions-sales", "name": "Acquisitions & Sales", "desc": "Seller conversations, underwriting, offers and coaching for lead and acquisition managers."},
    {"slug": "dispositions-transactions", "name": "Dispositions & Transactions", "desc": "Buyers lists, deal marketing, transaction coordination and closing."},
    {"slug": "rentals-portfolio", "name": "Rentals & Portfolio", "desc": "Owned properties, tenants, contractors and portfolio reporting."},
    {"slug": "scaling-leadership", "name": "Scaling & Leadership", "desc": "Hiring, process, finance and the systems that let an investing business grow."},
    {"slug": "product-news-updates", "name": "Product News & Updates", "desc": "Releases and walkthroughs from the KPI DRIVER team."},
    {"slug": "case-studies", "name": "Customer Stories", "desc": "How investors and their teams run on KPI DRIVER."},
]
CAT = {c["slug"]: c for c in CATS}
# slug -> (category, content type, is the category's pillar guide)
POST_META = {
    "real-estate-kpis-that-matter": ("kpis-performance", "Guide", True),
    "acquisition-kpis-real-estate-investors": ("kpis-performance", "Explainer", False),
    "disposition-kpis-real-estate-investors": ("kpis-performance", "Explainer", False),
    "how-real-estate-teams-track-deals": ("kpis-performance", "How-to", False),
    "best-real-estate-crm-for-investors": ("crm-systems", "Guide", True),
    "real-estate-investor-pipeline-system": ("crm-systems", "Guide", False),
    "why-real-estate-crms-fail-investors": ("crm-systems", "Explainer", False),
    "crm-vs-spreadsheets-real-estate-investors": ("crm-systems", "Comparison", False),
    "real-estate-investor-operating-system": ("crm-systems", "Explainer", False),
    "real-estate-automation-system-investors": ("ai-automation", "Guide", True),
    "ai-agents-real-estate-investors": ("ai-automation", "Explainer", False),
    "voice-ai-vs-human-appointment-setters": ("ai-automation", "Comparison", False),
    "automation-reduces-missed-leads-real-estate": ("ai-automation", "Explainer", False),
    "real-estate-marketing-roi": ("marketing-lead-generation", "How-to", True),
    "systems-that-scale-real-estate-investing": ("scaling-leadership", "Guide", True),
}
for _p in POSTS:
    _c, _t, _pl = POST_META.get(_p["slug"], (_p["category_slug"], _p.get("type", "Article"), _p.get("pillar", False)))
    _p.update(category_slug=_c, category=CAT[_c]["name"], type=_t, pillar=_pl)
BY_SLUG = {p["slug"]: p for p in POSTS}
PILLAR = {p["category_slug"]: p for p in POSTS if p["pillar"]}


def post_row(p, root):
    return f"""<a class="post-row" href="{root}post/{p['slug']}.html">
  <div class="post-row__meta"><b>{esc(p['category'])}</b><span>{fmt_date(p['date'])}</span><span class="typechip">{p['type']}</span></div>
  <div><h3>{esc(p['title'])}</h3><p>{esc(p['summary'])}</p></div>
  <span class="post-row__go" aria-hidden="true">→</span>
</a>"""


def cats_nav(root, current_slug=None):
    used = {p["category_slug"] for p in POSTS}
    here = ' aria-current="page"'
    links = [f'<a href="{root}blog.html"{"" if current_slug else here}>All articles</a>']
    links += [f'<a href="{root}blog-category/{c["slug"]}.html"{here if c["slug"] == current_slug else ""}>{esc(c["name"])}</a>' for c in CATS if c["slug"] in used]
    return f'<nav class="cats" aria-label="Blog categories">{"".join(links)}</nav>'


def related_for(p):
    """Hub and spoke: the category's pillar guide first, then same-category posts, then the hand-picked ones."""
    out = []
    pil = PILLAR.get(p["category_slug"])
    for c in ([pil] if pil else []) + [x for x in POSTS if x["category_slug"] == p["category_slug"]] + [BY_SLUG[s] for s in p.get("related", []) if s in BY_SLUG]:
        if c["slug"] != p["slug"] and c not in out:
            out.append(c)
    return out[:3]


def blog_pages():
    built = []
    R = "{{root}}"
    first, rest = POSTS[0], POSTS[1:]
    guides = "".join(f'<a class="guide" href="{R}post/{g["slug"]}.html"><span class="note">{esc(g["category"])}</span><h3>{esc(g["title"])}</h3><span class="link arrow" style="margin-top:auto">Read the guide</span></a>' for g in PILLAR.values())
    body = f"""<section class="section phead section--grid"><div class="wrap">
<ol class="crumbs"><li><a href="{R}index.html">Home</a></li><li>Blog</li></ol>
<h1>Notes from the <span class="hl-green">operator's seat</span></h1>
<p class="lede">Practical writing on CRMs, KPI tracking, automation and AI for real estate investors and the teams who run their pipelines.</p>
</div></section>
<section class="section section--panel section--tight"><div class="wrap"><div class="head"><p class="eyebrow">Start here</p><h2>The guides</h2><p class="lede">One cornerstone guide per topic. Each links out to the shorter articles that go deeper.</p></div><div class="guides">{guides}</div></div></section>
<section class="section section--paper section--tight"><div class="wrap stack stack--lg">
{cats_nav(R)}
<div>
<a class="post-feature" href="{R}post/{first['slug']}.html">
  <span class="eyebrow">Latest · {esc(first['category'])} · {fmt_date(first['date'])}</span>
  <h2>{esc(first['title'])}</h2><p class="lede">{esc(first['summary'])}</p><span class="link arrow">Read the article</span>
</a>
<div class="posts">{''.join(post_row(p, R) for p in rest)}</div>
</div></div></section>
{{{{> cta}}}}"""
    built.append(render("blog.html", {"title": "Blog | KPI DRIVER — CRM, KPIs, Automation & AI for Real Estate Investors", "crumb": "Blog",
        "description": "Practical guides and articles on real estate CRMs, KPI tracking, automation and AI for investors and their teams."}, body))
    for c in CATS:
        ps = [p for p in POSTS if p["category_slug"] == c["slug"]]
        pil = PILLAR.get(c["slug"])
        start = f'<a class="post-feature" href="{R}post/{pil["slug"]}.html"><span class="eyebrow">Start here · the guide</span><h2>{esc(pil["title"])}</h2><p class="lede">{esc(pil["summary"])}</p><span class="link arrow">Read the guide</span></a>' if pil else ""
        others = [p for p in ps if p is not pil]
        listing = (start + f'<div class="posts">{"".join(post_row(p, R) for p in others)}</div>') if ps else \
            f'<div class="stack"><h2 style="font-size:var(--step-2);text-transform:none">Nothing published in {esc(c["name"])} yet.</h2><p class="muted">New articles land on the main blog page first.</p><p><a class="link arrow" href="{R}blog.html">Browse all articles</a></p></div>'
        body = f"""<section class="section phead section--grid"><div class="wrap">
<ol class="crumbs"><li><a href="{R}index.html">Home</a></li><li><a href="{R}blog.html">Blog</a></li><li>{esc(c['name'])}</li></ol>
<h1>{esc(c['name'])}</h1><p class="lede">{esc(c['desc'])}</p></div></section>
<section class="section section--paper section--tight"><div class="wrap stack stack--lg">{cats_nav(R, c['slug'])}<div>{listing}</div></div></section>
{{{{> cta}}}}"""
        built.append(render(f"blog-category/{c['slug']}.html", {"title": f"{c['name']} | KPI DRIVER Blog", "nav": "blog.html", "crumb": c["name"],
            "description": f"{c['desc']} Articles from the KPI DRIVER blog.", "robots": "index" if ps else "noindex"}, body))
    for p in POSTS:
        related = related_for(p)
        pil = PILLAR.get(p["category_slug"])
        post_ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"], "datePublished": p["date"], "dateModified": p["date"],
              "description": p["summary"], "articleSection": p["category"], "inLanguage": "en-US", "image": f"{ORIGIN}/assets/img/og-default.png",
              "author": {"@type": "Person", "name": p["author"], "jobTitle": "Chief Technology Officer", "url": f"{ORIGIN}/our-team"},
              "publisher": {"@type": "Organization", "name": "KPI DRIVER", "url": ORIGIN}, "mainEntityOfPage": f"{ORIGIN}/post/{p['slug']}"}
        hub_guide = f' Start with the guide: <a class="link" href="{R}post/{pil["slug"]}.html">{esc(pil["title"])}</a>.' if pil and pil is not p else ""
        hub = f'<aside class="hub tone-crm"><p class="note">Part of {esc(p["category"])}</p><p>{esc(CAT[p["category_slug"]]["desc"])}{hub_guide}</p><p><a class="link arrow" href="{R}blog-category/{p["category_slug"]}.html">All {esc(p["category"])} articles</a></p></aside>'
        rel = f"""<section class="section section--tight"><div class="wrap"><div class="head"><p class="eyebrow">Keep reading</p><h2>Related articles</h2></div>
<div class="posts">{''.join(post_row(r, R) for r in related)}</div></div></section>""" if related else ""
        body = f"""<section class="section phead section--grid"><div class="wrap">
<ol class="crumbs"><li><a href="{R}index.html">Home</a></li><li><a href="{R}blog.html">Blog</a></li><li><a href="{R}blog-category/{p['category_slug']}.html">{esc(p['category'])}</a></li></ol>
<h1 style="max-width:20ch">{esc(p['title'])}</h1>
<p class="lede">{esc(p['summary'])}</p>
<div class="byline"><img src="{R}assets/img/team/ahmed.webp" alt="" width="44" height="44"><span>By <a class="link" href="{R}our-team.html"><b>{esc(p['author'])}</b></a>, Chief Technology Officer</span><span>·</span><time datetime="{p['date']}">{fmt_date(p['date'])}</time><span class="typechip">{p['type']}</span></div>
</div></section>
<section class="section section--paper section--tight"><div class="wrap"><article class="article"><div class="article__body">{p['body']}</div>{hub}</article></div></section>
{rel}
{{{{> cta}}}}"""
        built.append(render(f"post/{p['slug']}.html", {"title": f"{p['title']} | KPI DRIVER Blog", "description": p["summary"], "nav": "blog.html", "crumb": p["title"],
            "og_type": "article", "jsonld": ld(post_ld)}, body))
    return built


LLMS = """# KPI DRIVER

> KPI DRIVER is a real estate business operations platform built by investors for investors. Its CRM runs lead capture, acquisitions, nurture, dispositions, transaction coordination, contractors and vendors, and owned and rental properties, with KPI tracking across every pipeline and included access to a nine-tool AI Suite.

## Key facts
- Company: KPI DRIVER, LLC, Pembroke Pines, Florida, USA. Email: info@kpidriver.com
- Audience: real estate investors and their teams (acquisitions, dispositions, transaction coordination, property management)
- Offerings: (1) Enterprise Optimization Suite = CRM + AI Suite access. (2) Enterprise Optimization Suite + AI Agent.
- AI Suite access is included with no additional AI Suite subscription. Usage is optional and pay-as-you-go.
- The AI Agent is a separate, optional offering. It follows up with new and older leads by AI voice, SMS, email and iMessage within rules the client sets.
- AI Suite tools: AI Notes Taker, AI Sales Coach, AI Training Coach, AI Underwriting, AI Skiptracing, AI Data Enrichment, AI Dashboard, AI Insights, AI Projections.
- Nurture is backup for the acquisitions team: situational, timed and AI-tailored campaigns revive stalled leads and hand them back to acquisitions. All nurtures are in English and Spanish.
- Support is personal: every client has a dedicated channel with the team. No chatbots and no ticket queue.
- Pricing is discussed on a discovery call.

## Pages
- [Home]({o}/): overview of the platform
- [Services]({o}/services): the three product areas and the two offerings
- [CRM]({o}/services/crm): pipelines, communication, automations and KPI tracking
- [AI Suite]({o}/services/ai-suite): the nine AI tools, nurture and the built-in knowledge base
- [AI Agent]({o}/services/ai-agent): the optional follow-up agent
- [Our Team]({o}/our-team): the people behind the platform
- [Contact]({o}/contact-us): contact details and discovery call booking

## Guides
{guides}
"""


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
    today = date.today().isoformat()
    post_dates = {f"post/{p['slug']}.html": p["date"] for p in POSTS}
    indexable = sorted(p for p in built if p not in ("404.html", "thank-you.html") and p not in NOINDEX)
    urls = "\n".join(f"  <url><loc>{ORIGIN}{route_of(p)}</loc><lastmod>{post_dates.get(p, today)}</lastmod></url>" for p in indexable)
    es_urls = "\n".join(f"  <url><loc>{ORIGIN}/es{'' if route_of(p) == '/' else route_of(p)}</loc><lastmod>{today}</lastmod></url>" for p in ES_PAGES if p != "thank-you.html")
    urls += "\n" + es_urls
    (ROOT / "docs" / "es-missing.txt").write_text("\n".join(ES_MISSING), encoding="utf8")
    if ES_MISSING: print(f"  Spanish: {len(ES_MISSING)} strings still untranslated (docs/es-missing.txt)")
    (OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n', encoding="utf8")
    bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot"]
    ai = "".join(f"User-agent: {b}\n" for b in bots)
    robots = (f"User-agent: *\nAllow: /\nDisallow: /thank-you\n\n# AI search and assistant crawlers are welcome\n{ai}Allow: /\nDisallow: /thank-you\n\nSitemap: {ORIGIN}/sitemap.xml\n"
              if PRODUCTION else "User-agent: *\nDisallow: /\n")
    (OUT / "robots.txt").write_text(robots, encoding="utf8")
    guides = "\n".join(f"- [{g['title']}]({ORIGIN}/post/{g['slug']}): {g['summary']}" for g in PILLAR.values())
    (OUT / "llms.txt").write_text(LLMS.format(o=ORIGIN, guides=guides), encoding="utf8")
    print(f"built {len(built)} pages -> {OUT} ({'production' if PRODUCTION else 'preview, noindex'})")


if __name__ == "__main__":
    main()
