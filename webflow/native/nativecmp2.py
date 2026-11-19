"""Like nativecmp.py, but splits the native <main> into top-level sections by depth, and ignores known
harmless builder differences (role=list on ul, duplicated class tokens, empty-vs-bare boolean attrs)."""
import json, re, sys, subprocess, random
from html.parser import HTMLParser
chunks = json.load(open('home_chunks.json'))
idx = [int(x) for x in sys.argv[1].split(',')]
html = subprocess.run(['curl', '-s', f'https://kpidriver.webflow.io/kd-native-pilot?x={random.random()}'], capture_output=True, text=True).stdout
native = re.search(r'<main[^>]*class="kd-main"[^>]*>(.*)</main>', html, re.S).group(1)
VOID = {'br','img','input','meta','link','hr','source','wbr','path','circle','rect','line','polyline','polygon','stop','use','ellipse'}
class Tok(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.t = []
    def handle_starttag(s, tag, a):
        a = {k: (v or '') for k, v in a if not k.startswith('data-w-') and k not in ('data-wf-id', 'target')}
        if tag == 'ul' and a.get('role') == 'list': del a['role']
        if 'class' in a: a['class'] = ' '.join(sorted(set(a['class'].split())))
        s.t.append(('<', tag, tuple(sorted(a.items()))))
    def handle_startendtag(s, tag, a): s.handle_starttag(tag, a); s.t.append(('>', tag))
    def handle_endtag(s, tag): s.t.append(('>', tag))
    def handle_data(s, d):
        d = ' '.join(d.split())
        if d: s.t.append(('t', d))
def toks(h): p = Tok(); p.feed(h); p.close(); return p.t
# split native into top-level sections
nt = toks(native); secs = []; depth = 0; cur = None
for t in nt:
    if t[0] == '<' and t[1] == 'section' and depth == 0: cur = []
    if cur is not None: cur.append(t)
    if t[0] == '<' and t[1] == 'section': depth += 1
    if t[0] == '>' and t[1] == 'section':
        depth -= 1
        if depth == 0: secs.append(cur); cur = None
print('native top-level sections:', len(secs))
for i in idx:
    ot = toks(chunks[i]); seg = secs[i] if i < len(secs) else []
    if seg == ot: print(f'section {i}: identical ({len(ot)} tokens)'); continue
    import difflib
    sm = difflib.SequenceMatcher(None, ot, seg, autojunk=False)
    ops = [o for o in sm.get_opcodes() if o[0] != 'equal']
    print(f'section {i}: {len(ops)} diff blocks (orig {len(ot)} / native {len(seg)} tokens)')
    for op, a1, a2, b1, b2 in ops[:6]: print('   ', op, '\n      orig  ', ot[a1:a2][:3], '\n      native', seg[b1:b2][:3])
