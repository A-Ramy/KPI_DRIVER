#!/usr/bin/env python3
"""Build webflow/kd-es.js (Spanish header, footer, dialog and page bodies swapped in on /es/*) and webflow/kd-posts.js (related-post index)."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.argv = ["x"]
import webflow_export as W
def squash(h): return re.sub(r">\s+<", "><", re.sub(r"\s*\n\s*", " ", h)).strip()
def fix(h): return squash(W.links(W.declash_html(h)))
src = (ROOT / "site/es/index.html").read_text(encoding="utf8")
header = fix(W.part(src, "<header", "</header>")); footer = fix(W.part(src, "<footer", "</footer>")); dialog = fix(W.part(src, "<dialog", "</dialog>"))
pages = {}
for f in sorted((ROOT / "webflow/pages/es").rglob("*.html")):
    rel = f.relative_to(ROOT / "webflow/pages/es").as_posix()[:-5]
    pages["/" if rel == "index" else "/" + rel] = squash(f.read_text(encoding="utf8"))
TEMP = {"/kd-home": "/", "/kd-services": "/services", "/kd-crm": "/services/crm", "/kd-ai-suite": "/services/ai-suite", "/kd-ai-agent": "/services/ai-agent",
        "/kd-our-team": "/our-team", "/kd-contact-us": "/contact-us", "/kd-thank-you": "/thank-you"}
T = {"Blog": "Blog", "All posts": "Todas las publicaciones", "Keep reading": "Sigue leyendo", "Back to the blog": "Volver al blog", "Next": "Siguiente", "Previous": "Anterior"}
js = """(function(){var D=%s,d=document,r=d.documentElement,p=location.pathname.replace(/^\\/es(?=\\/|$)/,'').replace(/\\/$/,'')||'/';p=D.t[p]||p;
function sw(sel,html){var e=d.querySelector(sel);if(e&&html)e.outerHTML=html}
try{sw('header.site-header',D.h);sw('footer.site-footer',D.f);sw('#book-dialog',D.d);if(D.p[p])sw('#main',D.p[p]);
var s=d.querySelector('a.skip');if(s)s.textContent='Saltar al contenido';
[].forEach.call(d.querySelectorAll('a[href^="/"]'),function(a){var h=a.getAttribute('href');if(a.classList.contains('lang-toggle')||/^\\/es(\\/|$|#|\\?)/.test(h)||/^\\/\\//.test(h))return;a.setAttribute('href','/es'+(h==='/'?'':h))});
[].forEach.call(d.querySelectorAll('[data-success]'),function(f){f.setAttribute('data-success','/es/thank-you')});
[].forEach.call(d.querySelectorAll('[data-kd-t]'),function(e){var k=e.getAttribute('data-kd-t');if(D.s[k])e.textContent=D.s[k]});
r.setAttribute('lang','es')}catch(e){}r.classList.remove('es-wait')})();""" % json.dumps({"h": header, "f": footer, "d": dialog, "p": pages, "t": TEMP, "s": T}, ensure_ascii=False, separators=(",", ":"))
(ROOT / "webflow/kd-es.js").write_text(js, encoding="utf8")
idx = json.loads((ROOT / "webflow/cms/post-index.json").read_text())
by = {p["slug"]: p for p in idx}
import importlib.util, io, contextlib
posts = {p["slug"]: {"t": p["title"], "d": p["date"], "s": p["summary"], "c": p["cat"], "n": p["catname"], "y": p["type"], "r": p["related"]} for p in idx}
(ROOT / "webflow/kd-posts.js").write_text("window.KD_POSTS=" + json.dumps(posts, ensure_ascii=False, separators=(",", ":")) + ";window.KD_POSTS_READY&&KD_POSTS_READY();", encoding="utf8")
print("kd-es.js", len(js), "pages", list(pages), "| kd-posts.js", len(posts))
