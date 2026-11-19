"""Static markup diff of <main> between live and staging, for a list of paths.
Ignores only differences known to be harmless and explained:
  role="list" Webflow adds on ul/ol; duplicate class tokens; kd-main on <main>; u-* utility classes that replace
  inline style="" on native tags (the style attribute is dropped from the comparison on those tags, and the
  computed-style check covers the result); type="button" (reserved in Webflow, buttons sit outside forms);
  boolean attrs written as name="name"; Webflow ids/data-w-*; attribute order;
  <img> width/height attributes (Webflow's native Image cannot carry them; the stylesheet sets the size, and the
  computed-style and pixel checks confirm identical rendering) and loading="eager" (= the browser default)."""
import re, sys, subprocess, random, difflib
from html.parser import HTMLParser
NATIVE = {'a', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'section', 'blockquote', 'figure', 'header', 'footer', 'nav', 'article', 'aside', 'main'}
VOID = {'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr'}
BOOL = {'hidden', 'allowfullscreen', 'disabled', 'open', 'required', 'checked', 'novalidate', 'defer', 'async'}
class Tok(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.t = []
    def handle_starttag(s, tag, a):
        d = {}
        for k, v in a:
            v = v or ''
            if k.startswith('data-w-') or k in ('data-wf-id',): continue
            if k == 'role' and v == 'list' and tag in ('ul', 'ol'): continue
            if k == 'type' and v == 'button' and tag == 'button': continue
            if k in BOOL and v in ('', k): v = ''
            if k == 'style' and tag in NATIVE: continue
            if tag == 'img' and (k in ('width', 'height') or (k == 'loading' and v == 'eager')): continue
            if k == 'class':
                v = ' '.join(sorted({c for c in v.split() if not c.startswith('u-') and c != 'kd-main'}))
                if not v: continue
            d[k] = v
        s.t.append(('<', tag, tuple(sorted(d.items()))))
    def handle_startendtag(s, tag, a):
        s.handle_starttag(tag, a)
        if tag not in VOID: s.t.append(('>', tag))
    def handle_endtag(s, tag): s.t.append(('>', tag))
    def handle_data(s, d):
        d = ' '.join(d.split())
        if d: s.t.append(('t', d))
def main_of(url):
    h = subprocess.run(['curl', '-s', url + ('&' if '?' in url else '?') + f'z={random.random()}'], capture_output=True, text=True).stdout
    m = re.search(r'(<main\b.*?</main>)', h, re.S)
    p = Tok(); p.feed(m.group(1) if m else ''); return p.t
bad = 0
for path in sys.argv[1:]:
    a, b = main_of('https://www.kpidriver.com' + path), main_of('https://kpidriver.webflow.io' + path)
    ops = [o for o in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if o[0] != 'equal']
    print(f'{path}: {len(a)} live tokens / {len(b)} staging tokens, {len(ops)} differences')
    for op, i1, i2, j1, j2 in ops[:6]: print('    live   ', a[i1:i2][:2], '\n    staging', b[j1:j2][:2])
    bad += len(ops)
sys.exit(1 if bad else 0)
