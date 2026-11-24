"""Rule-based version of classify.py (no content dump needed). A string is translatable by Webflow
Localization when it sits inside a Paragraph/Heading, or inside a Link/ListItem/div Block whose whole
subtree is native inline elements (String/Span/Strong/Emphasized/Link...). DOM (custom) elements are never
inline. Rules derived from sandbox tests on 24 Nov. usage: python3 classify2.py TREE.raw [--check CONTENT.raw]"""
import json, re, sys, collections
H = open('kd-es-native-2.js').read()
T = json.loads(re.search(r'T=(\{.*?\})[,;]', H, re.S).group(1))
INL = {'String', 'Span', 'Strong', 'Emphasized', 'Link', 'Superscript', 'Subscript', 'InlineCode', 'LineBreak'}
def load(p):
    s = open(p).read(); i = s.find('{"label"'); o = json.loads(s[i:]) if i >= 0 else json.loads(s)
    if isinstance(o, list): o = json.loads(o[0]['text'][o[0]['text'].find('{'):])
    return o['result'][0]['data']
def inline_only(e): return all(c['type'] in INL and inline_only(c) for c in e.get('children', []))
def is_root(e):
    t = e['type']
    if t in ('Paragraph', 'Heading', 'Blockquote'): return True
    if t in ('Link', 'ListItem') or (t == 'Block' and (e.get('settings') or {}).get('tag') == 'div'):
        return bool(e.get('children')) and inline_only(e)
    return False
def desc(e):
    s = e['type']; tag = (e.get('settings') or {}).get('tag')
    if tag and e['type'] in ('DOM', 'Block'): s += ':' + tag
    if e.get('styleNames'): s += '.' + '.'.join(e['styleNames'])
    return s
out = {'exposed': [], 'rebuild': []}
def walk(e, anc):
    if e['type'] == 'String':
        k = ' '.join((e.get('textContent') or '').split())
        if k in T:
            root = next((a for a in anc if is_root(a)), None)
            rec = {'text': k, 'es': T[k], 'string': e['id']['element'], 'comp': e['id']['component'],
                   'chain': [desc(a) for a in anc[-3:]], 'parent': anc[-1]['id']['element'],
                   'gp': anc[-2]['id']['element'], 'parent_type': desc(anc[-1]), 'gp_type': desc(anc[-2]),
                   'n_sib': len(anc[-1].get('children', [])), 'gp_children': [desc(c) for c in anc[-2].get('children', [])]}
            if root: rec['node'] = root['id']['element']; out['exposed'].append(rec)
            else: out['rebuild'].append(rec)
    for c in e.get('children', []): walk(c, anc + [e])
if __name__ == '__main__':
    walk(load(sys.argv[1]), [])
    name = sys.argv[1].rsplit('/', 1)[1].split('.')[0]
    json.dump(out, open(f'es/trees/{name}.rule.json', 'w'), ensure_ascii=False, indent=1)
    print(name, '| exposed', len(out['exposed']), '| rebuild', len(out['rebuild']))
    for kind in ('rebuild',):
        for c, n in collections.Counter(r['parent_type'] + ' < ' + r['gp_type'] for r in out[kind]).most_common(): print(f'   {n:3d}  {c}')
    if '--check' in sys.argv:
        old = json.load(open(f'es/trees/{name}.class.json'))
        a = {r['string_id']['element'] for r in old['rebuild']}; b = {r['string'] for r in out['rebuild']}
        print('agreement with real content dump:', 'IDENTICAL' if a == b else f'DIFF only_real={len(a-b)} only_rule={len(b-a)}')
