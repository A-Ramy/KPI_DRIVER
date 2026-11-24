"""Classify English strings the Spanish helper still translates on one page.
usage: python3 classify.py TREE.raw CONTENT.raw  -> prints exposed / rebuild lists, writes es/trees/<name>.class.json
exposed  = the string sits inside an element Webflow Localization lists as a text node (just write Spanish)
rebuild  = it does not (text directly in a DOM element, or a Span directly in a block/link block)"""
import json, re, sys
H = open('kd-es-native-2.js').read()
T = json.loads(re.search(r'T=(\{.*?\})[,;]', H, re.S).group(1))
def objs(path):
    for x in json.load(open(path)) if open(path).read(1) == '[' else [json.load(open(path))]:
        t = x.get('text', x) if isinstance(x, dict) else x
        if isinstance(t, str):
            for line in t.split('\n'):
                line = line.strip()
                if line.startswith('{'):
                    try: yield json.loads(line)
                    except Exception: pass
        else: yield x
tree = next(o for o in objs(sys.argv[1]) if o.get('action') == 'get_all_elements')['result'][0]['data']
ids, nodes = set(), {}
for o in objs(sys.argv[2]):
    if o.get('action') == 'get_page_content':
        for n in o['result']['nodes']:
            ids.add(n['id']); nodes[n['id']] = n
out = {'exposed': [], 'rebuild': []}
def desc(e):
    s = e['type']
    tag = (e.get('settings') or {}).get('tag')
    if tag: s += ':' + tag
    if e.get('styleNames'): s += '.' + '.'.join(e['styleNames'])
    return s
def walk(e, anc):
    if e['type'] == 'String':
        k = ' '.join((e.get('textContent') or '').split())
        if k in T:
            hit = next((a for a in reversed(anc) if a['id']['element'] in ids), None)
            rec = {'text': k, 'es': T[k], 'string_id': e['id'], 'parent': anc[-1]['id'], 'chain': [desc(a) for a in anc[-4:]],
                   'siblings': [c['type'] for c in anc[-1].get('children', [])]}
            if hit: rec['node'] = hit['id']['element']; out['exposed'].append(rec)
            else: out['rebuild'].append(rec)
    for c in e.get('children', []): walk(c, anc + [e])
walk(tree, [])
name = sys.argv[1].rsplit('/', 1)[1].split('.')[0]
json.dump(out, open(f'es/trees/{name}.class.json', 'w'), ensure_ascii=False, indent=1)
print(name, 'content nodes', len(ids), '| exposed', len(out['exposed']), '| rebuild', len(out['rebuild']))
from collections import Counter
for kind in ('exposed', 'rebuild'):
    print(' ', kind, Counter(' > '.join(r['chain'][-2:]) for r in out[kind]).most_common(40))
