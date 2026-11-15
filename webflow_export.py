#!/usr/bin/env python3
"""Turn the production build in site/ into paste-ready pieces for Webflow (see webflow/README.md)."""
import csv, json, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).parent; SITE = ROOT / "site"; OUT = ROOT / "webflow"
LIMIT = 50000  # Webflow custom-code and Embed character limit

def mincss(s):
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S); s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s*([{};,>])\s*", r"\1", s); s = re.sub(r":\s+", ":", s)
    return s.replace(";}", "}").strip()

def split_rules(css, limit):
    """Split at top-level rule boundaries so each chunk fits one code block."""
    chunks, cur, depth, start = [], "", 0, 0
    for i, ch in enumerate(css):
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                rule = css[start:i + 1]; start = i + 1
                if len(cur) + len(rule) > limit: chunks.append(cur); cur = ""
                cur += rule
    if cur: chunks.append(cur)
    return chunks

ASSETS = json.loads((OUT / "assets.json").read_text()) if (OUT / "assets.json").exists() else {}
CLASH = {"h4": "kd-h4", "faq": "kd-faq"}  # class names the old Webflow stylesheet also defines

def declash_css(css):
    for a, b in CLASH.items(): css = re.sub(r"\.%s(?![\w-])" % a, "." + b, css)
    return css

def declash_html(h):
    def cls(m): return 'class="' + " ".join(CLASH.get(c, c) for c in m.group(1).split()) + '"'
    return re.sub(r'class="([^"]*)"', cls, h)

def links(h, lang_prefix=""):
    """Relative preview links -> root-absolute Webflow paths."""
    def fix(m):
        u = m.group(2)
        if re.match(r"(https?:|mailto:|tel:|#|/)", u): return m.group(0)
        u = re.sub(r"^(\.\./)+", "", u)
        if u.startswith("assets/"): return m.group(1) + ASSETS.get(u.split("/")[-1], "{{MISSING}}/" + u.split("/")[-1]) + '"'
        frag = ""
        if "#" in u: u, frag = u.split("#", 1); frag = "#" + frag
        u = re.sub(r"\.html$", "", u); u = "" if u in ("index", "") else u
        if u in ("es/index", "es"): u = "es"
        return m.group(1) + "/" + u + frag + '"'
    return re.sub(r'((?:href|src)=")([^"]*)"', fix, h)

def part(html, a, b):
    i = html.index(a); j = html.index(b, i)
    return html[i:j + len(b)]

def main():
    subprocess.run([sys.executable, str(ROOT / "build.py"), "--production"], check=True, stdout=subprocess.DEVNULL)
    (OUT / "pages").mkdir(parents=True, exist_ok=True); (OUT / "cms").mkdir(exist_ok=True)
    css = mincss((OUT / "compat.css").read_text()) + declash_css(mincss((SITE / "assets/css/site.css").read_text()))
    css = re.sub(r"\.\./img/(?:[\w-]+/)*", "{{ASSET_BASE}}/", css)  # asset URLs are filled in after upload to Webflow
    chunks = split_rules(css, LIMIT - 4000)
    home = (SITE / "index.html").read_text()
    theme = re.search(r"<script>\(function\(\)\{var d=document.documentElement.*?</script>", home, re.S).group(0)
    fonts = re.search(r'<link rel="preconnect" href="https://fonts.googleapis.com">.*?</noscript>', home, re.S).group(0)
    (OUT / "site-head.html").write_text(f"{theme}\n{fonts}\n<style>{chunks[0]}</style>\n")
    for n, c in enumerate(chunks[1:], 2): (OUT / f"css-part-{n}.html").write_text(f"<style>{c}</style>\n")
    js = (SITE / "assets/js/site.js").read_text()
    for a, b in CLASH.items(): js = re.sub(r"\.%s(?![\w-])(?=[^\n]*[\"'])" % a, "." + b, js) if re.search(r"[\"'][^\"'\n]*\.%s(?![\w-])" % a, js) else js
    (OUT / "site-footer.html").write_text(f"<script>{js}</script>\n")
    (OUT / "site-chrome.html").write_text(links(declash_html(part(home, '<div class="revline"', "</dialog>"))) + "\n")
    meta, sizes = [], {}
    for f in sorted(SITE.rglob("*.html")):
        rel = f.relative_to(SITE).as_posix()
        if rel.startswith(("post/", "blog-category/", "_")) : continue
        h = f.read_text()
        main_ = links(declash_html(part(h, "<main", "</main>")))
        dest = OUT / "pages" / rel; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_text(main_ + "\n")
        sizes[rel] = len(main_)
        g = lambda p: (re.search(p, h, re.S) or [None, ""])[1]
        meta.append({"file": rel, "title": g(r"<title>(.*?)</title>"), "description": g(r'<meta name="description" content="(.*?)">'),
                     "gear": g(r'data-gear="(\d+)"'), "lang": g(r'<html lang="(\w+)"'),
                     "jsonld": re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)})
    (OUT / "page-meta.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    for name in ("header", "footer"):
        tag = "<header" if name == "header" else "<footer"
        (OUT / f"{name}.html").write_text(links(declash_html(part(home, tag, f"</{name}>"))) + "\n")
    # Blog CMS import
    sys.path.insert(0, str(ROOT)); import build as B
    with open(OUT / "cms/categories.csv", "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["Name", "Slug", "Description"])
        for c in B.CATS: w.writerow([c["name"], c["slug"], c.get("desc", c.get("description", ""))]) if isinstance(c, dict) else w.writerow(list(c)[:3])
    rows = []
    for f in sorted((SITE / "post").glob("*.html")):
        h = f.read_text(); ld = [json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)]
        bp = next((x for x in ld if x.get("@type") == "BlogPosting"), {})
        body = (re.search(r'<div class="[^"]*\b(?:prose|post__body|article__body)\b[^"]*">(.*)</div>\s*(?:<aside|<section|</article)', h, re.S) or [None, ""])[1]
        rows.append([bp.get("headline", ""), f.stem, bp.get("datePublished", ""), bp.get("articleSection", ""), bp.get("description", ""), (bp.get("author") or {}).get("name", "") if isinstance(bp.get("author"), dict) else "", body.strip()])
    with open(OUT / "cms/posts.csv", "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["Name", "Slug", "Published On", "Category", "Summary", "Author", "Body"]); w.writerows(rows)
    print("css chunks:", [len(c) for c in chunks], "| js:", len(js), "| header:", len((OUT / "header.html").read_text()), "| footer:", len((OUT / "footer.html").read_text()))
    print("pages over one embed:", {k: v for k, v in sizes.items() if v > LIMIT})
    print("posts:", len(rows), "with body:", sum(1 for r in rows if r[6]), "| pages:", len(sizes))
    subprocess.run([sys.executable, str(ROOT / "build.py")], check=True, stdout=subprocess.DEVNULL)  # leave site/ as the noindex preview

if __name__ == "__main__": main()
