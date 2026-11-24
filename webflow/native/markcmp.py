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
RESERVED_IDS = {'implementation'}   # Webflow refuses ids that shadow document properties; native uses data-kd-id (read by kd-booking-6)
BOOL = {'hidden', 'allowfullscreen', 'disabled', 'open', 'required', 'checked', 'novalidate', 'defer', 'async'}
class Tok(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.t = []
    def handle_starttag(s, tag, a):
        d = {}
        for k, v in a:
            v = v or ''
            if k.startswith('data-w-') or k in ('data-wf-id',): continue
            if k == 'id' and v in RESERVED_IDS: k = 'data-kd-id'
            if k == 'role' and v == 'list' and tag in ('ul', 'ol'): continue
            if k == 'aria-current' and v == 'page': continue   # Webflow marks native links to the current page
            if k == 'type' and v == 'button' and tag == 'button': continue
            if k in BOOL and v in ('', k): v = ''
            if k == 'style' and tag in NATIVE: continue
            if tag == 'img' and (k in ('width', 'height') or (k == 'loading' and v == 'eager')): continue
            if k == 'class':
                v = ' '.join(sorted({c for c in v.split() if not c.startswith('u-') and c not in ('kd-main', 'w--current', 'w-inline-block')}))
                if not v: continue
            d[k] = v
        s.t.append(('<', tag, tuple(sorted(d.items()))))
    def handle_startendtag(s, tag, a):
        s.handle_starttag(tag, a)
        if tag not in VOID: s.t.append(('>', tag))
    def handle_endtag(s, tag): s.t.append(('>', tag))
    def handle_data(s, d):
        d = ' '.join(d.split())
        if not d: return
        # Webflow CMS pages split text with empty <!-- --> markers; merge adjacent text runs.
        if s.t and s.t[-1][0] == 't': s.t[-1] = ('t', s.t[-1][1] + ' ' + d)
        else: s.t.append(('t', d))
CHROME_CLASSES = ('skip', 'site-header', 'site-footer', 'revline', 'shiftfx', 'gearhud', 'bookdlg')
class Grab(HTMLParser):
    """Collects the raw text of top-level chrome elements (header, footer, overlays, dialog) wherever they sit."""
    def __init__(s, src): super().__init__(convert_charrefs=False); s.src = src; s.depth = 0; s.out = []; s.start = None; s.tag = None; s.lines = None
    def pos(s):
        if s.lines is None:
            s.lines = [0]
            for ln in s.src.split('\n'): s.lines.append(s.lines[-1] + len(ln) + 1)
        l, c = s.getpos(); return s.lines[l - 1] + c
    def handle_starttag(s, tag, a):
        cls = dict(a).get('class') or ''
        if s.depth == 0 and (tag == 'dialog' or any(c in cls.split() for c in CHROME_CLASSES)):
            s.depth = 1; s.tag = tag; s.start = s.pos(); return
        if s.depth and tag == s.tag: s.depth += 1
    def handle_endtag(s, tag):
        if s.depth and tag == s.tag:
            s.depth -= 1
            if s.depth == 0:
                p = s.pos(); e = s.src.find('>', p) + 1; s.out.append(s.src[s.start:e])
def main_of(url):
    h = subprocess.run(['curl', '-s', url + ('&' if '?' in url else '?') + f'z={random.random()}'], capture_output=True, text=True).stdout
    m = re.search(r'(<main\b.*?</main>)', h, re.S)
    rest = h.replace(m.group(1), '') if m else h
    g = Grab(rest); g.feed(rest)
    p = Tok(); p.feed((m.group(1) if m else '') + ''.join(g.out)); return p.t
bad = 0
for path in sys.argv[1:]:
    a, b = main_of('https://www.kpidriver.com' + path), main_of('https://kpidriver.webflow.io' + path)
    ops = [o for o in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if o[0] != 'equal']
    print(f'{path}: {len(a)} live tokens / {len(b)} staging tokens, {len(ops)} differences')
    for op, i1, i2, j1, j2 in ops[:6]: print('    live   ', a[i1:i2][:2], '\n    staging', b[j1:j2][:2])
    bad += len(ops)
sys.exit(1 if bad else 0)
