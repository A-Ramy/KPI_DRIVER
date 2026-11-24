"""Map Webflow primary-locale text nodes to Spanish text from the old ES bundle.

usage: python3 esalign.py NODES.json BUNDLE.js PATH STAGING_URL > updates.json
NODES.json: [[nodeId, html], ...] text nodes in page order (from get_page_content).
Aligns each node to an element of the English #main (by tag skeleton + text), takes the
element at the same document position in the Spanish #main from the bundle, and writes the
node's HTML back with only its text runs replaced, so Webflow's tags and data-w-id stay intact.
"""
import json, re, sys, html, urllib.request
from html.parser import HTMLParser

VOID = {'br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'wbr', 'area', 'col', 'embed', 'track', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'stop', 'use'}


class Tree(HTMLParser):
    """Flat preorder list of elements: (tag, start, end, depth) with raw source offsets."""
    def __init__(s, src):
        super().__init__(convert_charrefs=False)
        s.src = src; s.els = []; s.stack = []
        s.lines = [0]
        for m in re.finditer('\n', src): s.lines.append(m.end())
        s.feed(src); s.close()
    def pos(s):
        l, c = s.getpos(); return s.lines[l - 1] + c
    def handle_starttag(s, tag, a):
        i = len(s.els); s.els.append([tag, s.pos(), None, len(s.stack)])
        if tag in VOID or s.get_starttag_text().endswith('/>'):
            s.els[i][2] = s.pos() + len(s.get_starttag_text())
        else:
            s.stack.append(i)
    def handle_startendtag(s, tag, a):
        i = len(s.els); s.els.append([tag, s.pos(), s.pos() + len(s.get_starttag_text()), len(s.stack)])
    def handle_endtag(s, tag):
        for k in range(len(s.stack) - 1, -1, -1):
            if s.els[s.stack[k]][0] == tag:
                for j in s.stack[k:]:
                    if s.els[j][2] is None: s.els[j][2] = s.pos() + len(tag) + 3
                del s.stack[k:]
                return


class Tok(HTMLParser):
    """Tokens: ('<', tag, raw) / ('>', tag, raw) / ('t', text-raw)."""
    def __init__(s, src):
        super().__init__(convert_charrefs=False); s.t = []; s.feed(src); s.close()
    def handle_starttag(s, tag, a):
        s.t.append(('<', tag, s.get_starttag_text()))
        if tag in VOID: s.t.append(('>', tag, ''))
    def handle_startendtag(s, tag, a):
        s.t.append(('<', tag, s.get_starttag_text())); s.t.append(('>', tag, ''))
    def handle_endtag(s, tag):
        if tag in VOID: return
        s.t.append(('>', tag, '</%s>' % tag))
    def _txt(s, x):
        if s.t and s.t[-1][0] == 't': s.t[-1] = ('t', s.t[-1][1] + x)
        else: s.t.append(('t', x))
    def handle_data(s, d): s._txt(d)
    def handle_entityref(s, n): s._txt('&%s;' % n)
    def handle_charref(s, n): s._txt('&#%s;' % n)


def skel(h):
    return [(k[0], k[1]) for k in Tok(h).t if k[0] != 't']


def text_of(h):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', '', h)).split())


def slots(toks):
    """Text between successive tags (empty string where none)."""
    out, cur = [], ''
    for k in toks:
        if k[0] == 't': cur += k[1]
        else: out.append(cur); cur = ''
    out.append(cur)
    return out


def rebuild(en_html, es_html):
    et, st = Tok(en_html).t, Tok(es_html).t
    # Webflow's API shows some inline tags differently (e.g. <small> as <div>): compare open/close shape only.
    if [k[0] for k in et if k[0] != 't'] != [k[0] for k in st if k[0] != 't']:
        return None
    es_slots = slots(st); out = []; i = 0; cur_has = False
    for k in et:
        if k[0] == 't': continue
        out.append(es_slots[i]); i += 1; out.append(k[2])
    out.append(es_slots[i])
    return ''.join(out)


def main_html(src):
    t = Tree(src)
    for tag, a, b, d in t.els:
        if tag == 'main': return src[a:b]
    raise SystemExit('no <main>')


def run(nodes, bundle, path, url):
    D = json.loads(re.search(r'var D=(\{.*?\}),d=document', open(bundle).read(), re.S).group(1))
    es_main = D['p'][path]
    en_src = urllib.request.urlopen(url).read().decode()
    en_main = main_html(en_src)
    EN, ES = Tree(en_main), Tree(es_main)
    ens = [e[0] for e in EN.els]; ess = [e[0] for e in ES.els]
    rep = {'diverge': None}
    if ens != ess:
        for i, (a, b) in enumerate(zip(ens, ess)):
            if a != b: rep['diverge'] = (i, a, b, en_main[EN.els[i][1]:EN.els[i][1] + 120], es_main[ES.els[i][1]:ES.els[i][1] + 120]); break
        else: rep['diverge'] = (min(len(ens), len(ess)), 'len', len(ens), len(ess))
    import difflib
    amap = {}
    for a0, b0, n in difflib.SequenceMatcher(None, ens, ess, autojunk=False).get_matching_blocks():
        for q in range(n): amap[a0 + q] = b0 + q
    out, miss, skip = [], [], []
    j = 0
    for ent in nodes:
        nid, h = ent[0], ent[1]
        compact = len(ent) == 3  # [id, exact start tag, leading words]: a node with no inline children
        if compact:
            tagname = re.match(r'<([a-z0-9]+)', h).group(1)
        else:
            sk, tx = skel(h), text_of(h)
        found = None
        for k in range(j, len(EN.els)):
            tag, a, b, d = EN.els[k]
            eh = en_main[a:b]
            if compact:
                if tag == tagname and len(skel(eh)) == 2 and text_of(eh).startswith(ent[2]):
                    found = k; tx = text_of(eh); h = h + html.escape(tx, quote=False) + '</%s>' % tagname; sk = skel(h); break
                continue
            if tag != sk[0][1] and not (sk[0][1] == 'div' and tag == 'small'): continue
            if text_of(eh) == tx and [x[0] for x in skel(eh)] == [x[0] for x in sk]:
                found = k; break
        if found is None:
            miss.append([nid, (ent[2] if compact else tx)[:60]]); continue
        j = found + 1
        if found not in amap:
            miss.append([nid, 'no es counterpart ' + tx[:50]]); continue
        tag, a, b, d = ES.els[amap[found]]
        es_h = es_main[a:b]
        new = rebuild(h, es_h)
        if new is None:
            miss.append([nid, 'skeleton ' + tx[:50] + ' || ' + text_of(es_h)[:50]]); continue
        if text_of(new) == tx:
            skip.append(nid); continue
        out.append({'nodeId': nid, 'text': new})
    rep.update(updates=len(out), unchanged=len(skip), missed=miss)
    return out, rep


if __name__ == '__main__':
    nodes = json.load(open(sys.argv[1]))
    out, rep = run(nodes, sys.argv[2], sys.argv[3], sys.argv[4])
    json.dump(out, open(sys.argv[1].replace('.json', '.es.json'), 'w'), ensure_ascii=False)
    print(json.dumps(rep, ensure_ascii=False, indent=1))
