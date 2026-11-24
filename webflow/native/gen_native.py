"""Generate Webflow API actions that make helper-translated strings native to Localization.
  plan   TREE.raw            -> es/ops/<name>.plan.json  {builder:[...], whtml:[...], skipped:[...]}
  finish TREE.raw            -> es/ops/<name>.finish.json {moves:[...], removes:[...]}  (run on a fresh tree after plan)
  es     TREE.raw            -> es/ops/<name>.es.json     [{nodeId,text}] Spanish for every kd-t / kd-q node
Kinds: A text in dt/dd/td/th/caption/figcaption/li -> TextBlock.kd-t after the String, then remove String
       B text in FAQ summary -> h3.kd-q after the String, then remove String
       C native Span outside any text node -> empty div.kd-t before it, then move the Span inside
       D custom (DOM) span/b -> div.kd-t holding native span/strong (via HTML), then remove the DOM elements
Skipped (helper keeps them): button labels, SVG <text>, header login <summary>."""
import json, re, sys, html, os
from classify2 import load, is_root, T, INL  # noqa
os.makedirs('es/ops', exist_ok=True)
mode, path = sys.argv[1], sys.argv[2]
name = path.rsplit('/', 1)[1].split('.')[0]
tree = load(path)
def tag(e): return (e.get('settings') or {}).get('tag')
def norm(s): return ' '.join((s or '').split())
def txt(e): return ''.join(c.get('textContent', '') for c in e.get('children', []) if c['type'] == 'String')
def eid(e): return e['id']
targets = []  # (string, parent, gp, anc)
def walk(e, anc):
    if e['type'] == 'String' and norm(e.get('textContent')) in T and not any(is_root(a) for a in anc):
        targets.append((e, anc[-1], anc[-2], anc))
    for c in e.get('children', []): walk(c, anc + [e])
walk(tree, [])
A_TAGS = {'dt', 'dd', 'td', 'th', 'caption', 'figcaption'}
def kind(s, p, gp, anc):
    t = p['type']
    if t == 'DOM' and tag(p) in ('button', 'text') or any(tag(a) == 'svg' for a in anc): return 'skip'
    if t == 'DOM' and tag(p) == 'summary':
        return 'skip' if any('login' in (a.get('styleNames') or []) for a in anc) else 'B'
    if (t == 'DOM' and tag(p) in A_TAGS) or t == 'ListItem': return 'A'
    if t == 'Span': return 'C'
    if t == 'DOM' and tag(p) in ('span', 'b'): return 'D'
    return 'other'
def ser(c):
    """HTML for an inline subtree; None if it holds anything but text and inline elements."""
    if c['type'] == 'String': return html.escape(c.get('textContent', ''), quote=False)
    if c['type'] in ('Span', 'Strong') or (c['type'] == 'DOM' and tag(c) in ('span', 'b')):
        tg = 'strong' if c['type'] == 'Strong' or tag(c) == 'b' else 'span'
        cls = ' '.join(c.get('styleNames') or []); a = {k2: v for k2, v in (c.get('attributes') or {}).items() if k2 != 'class'}
        at = (f' class="{cls}"' if cls else '') + ''.join(f' {k2}="{html.escape(v)}"' for k2, v in a.items())
        inner = [ser(x) for x in c.get('children', [])]
        return None if None in inner else f'<{tg}{at}>' + ''.join(inner) + f'</{tg}>'
    return None
if mode == 'plan':
    builder, whtml, skipped, other, doneD = [], [], [], [], set()
    targets.sort(key=lambda t: kind(t[0], t[1], t[2], t[3]) != 'D')  # D groups first so C does not duplicate them
    for s, p, gp, anc in targets:
        k = kind(s, p, gp, anc); text = s['textContent']
        if k == 'A' or k == 'B':
            schema = {'type': 'TextBlock', 'set_text': {'text': norm(text)}, 'set_style': {'style_names': ['kd-t']}} if k == 'A' else \
                     {'type': 'Heading', 'set_heading_level': {'heading_level': 3}, 'set_text': {'text': norm(text)}, 'set_style': {'style_names': ['kd-q']}}
            builder.append({'build_label': k + ':' + s['id']['element'], 'parent_element_id': eid(s), 'creation_position': 'after', 'element_schema': schema, 'remove': [eid(s)]})
        elif k in ('C', 'D'):
            if p['id']['element'] in doneD: continue
            kids = gp['children']; i = kids.index(p); j = i
            if k == 'D':   # group neighbouring inline siblings so :first-child/:last-child rules keep matching
                inl = lambda c: (c['type'] == 'DOM' and tag(c) in ('span', 'b')) or c['type'] == 'Span'
                while i > 0 and inl(kids[i - 1]): i -= 1
                while j + 1 < len(kids) and inl(kids[j + 1]): j += 1
            run = kids[i:j + 1]; parts = []
            for c in run:
                h = ser(c)
                if h is None: other.append(['complex', c['id']['element']]); parts = None; break
                parts.append(h); doneD.add(c['id']['element'])
            if parts is not None:
                whtml.append({'build_label': k + ':' + ','.join(c['id']['element'] for c in run), 'parent_element_id': eid(run[0]),
                              'creation_position': 'before', 'html': '<div class="kd-t">' + ''.join(parts) + '</div>',
                              'remove': [eid(c) for c in run]})
        elif k == 'skip': skipped.append(norm(text))
        else: other.append([k, p['type'], tag(p), norm(text)])
    json.dump({'builder': builder, 'whtml': whtml, 'skipped': skipped, 'other': other}, open(f'es/ops/{name}.plan.json', 'w'), ensure_ascii=False, indent=1)
    print(name, 'builder', len(builder), '| whtml', len(whtml), '| skipped', len(skipped), '| other', other)
if mode == 'finish':
    moves, removes = [], []
    def scan(e):
        kids = e.get('children', [])
        for i, c in enumerate(kids):
            # A/B: a kd-t TextBlock / kd-q heading right after a String with the same text -> remove that String
            if c['type'] in ('Block', 'Heading') and set(c.get('styleNames') or []) & {'kd-t', 'kd-q'} and i > 0:
                prev = kids[i - 1]
                if prev['type'] == 'String' and norm(prev.get('textContent')) == norm(txt(c)): removes.append(prev['id'])
                # D: kd-t div built from HTML, followed by the original DOM span/b run -> remove the run
                if c['type'] == 'Block' and c.get('children') and all(x['type'] in ('Span', 'Strong') for x in c['children']):
                    want = [norm(txt(x)) for x in c['children']]; run = kids[i + 1:i + 1 + len(want)]
                    if [norm(txt(x)) for x in run] == want and all(x['type'] == 'DOM' for x in run): removes += [x['id'] for x in run]
            # C: empty kd-t div immediately before a Span -> move the Span in
            if c['type'] == 'Block' and 'kd-t' in (c.get('styleNames') or []) and not c.get('children') and i + 1 < len(kids) and kids[i + 1]['type'] == 'Span':
                moves.append({'id': kids[i + 1]['id'], 'anchor_element_id': c['id'], 'creation_position': 'append'})
            scan(c)
    scan(tree)
    json.dump({'moves': moves, 'removes': removes}, open(f'es/ops/{name}.finish.json', 'w'), indent=1)
    print(name, 'moves', len(moves), '| removes', len(removes))
if mode == 'es':
    out, miss = [], []
    def attrs_html(x):
        cls = ' '.join(x.get('styleNames') or []); return (f' class="{cls}"' if cls else '')
    def scan(e):
        for c in e.get('children', []):
            sn = c.get('styleNames') or []
            if 'kd-t' in sn or 'kd-q' in sn:
                tg = 'h3' if c['type'] == 'Heading' else 'div'; inner = []
                for x in c.get('children', []):
                    if x['type'] == 'String':
                        k = norm(x['textContent']); inner.append(html.escape(T.get(k, k), quote=False)); (k in T) or miss.append(k)
                    else:
                        k = norm(txt(x)); t2 = 'strong' if x['type'] == 'Strong' else 'span'
                        inner.append(f'<{t2}{attrs_html(x)} data-w-id="{x["id"]["element"]}">{html.escape(T.get(k, k), quote=False)}</{t2}>')
                out.append({'nodeId': c['id']['element'], 'text': f'<{tg} class="{" ".join(sn)}">' + ''.join(inner) + f'</{tg}>'})
            scan(c)
    scan(tree)
    json.dump(out, open(f'es/ops/{name}.es.json', 'w'), ensure_ascii=False, indent=1)
    print(name, 'spanish nodes', len(out), '| not in dictionary (kept as is):', miss)
