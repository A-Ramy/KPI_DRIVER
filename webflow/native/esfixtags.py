"""Find Spanish payload nodes whose inline children the Localization API showed as <div>, look up
the real tag in the English page, and rewrite them as <span class="kd-as-TAG"> (the helper restores the tag)."""
import json, re, sys, urllib.request
sys.path.insert(0, '.')
from esalign import Tree, Tok, main_html, text_of
PAGES = {'ai-agent': '/services/ai-agent', 'thank-you': '/thank-you', 'book': '/book-discovery-call', 'our-team': '/our-team', 'contact-us': '/contact-us',
         'crm': '/services/crm', 'services': '/services', 'ai-suite': '/services/ai-suite', 'home': '/'}
out = {}
for name, path in PAGES.items():
    en_src = urllib.request.urlopen('https://kpidriver.webflow.io%s?z=1%s' % (path, name)).read().decode()
    main = main_html(en_src); T = Tree(main)
    nodes = {e[0]: e for e in json.load(open('es/n_%s.json' % name))}
    fixes = []
    for u in json.load(open('es/n_%s.es.json' % name)):
        if '<div data-w-id' not in u['text']: continue
        en = nodes[u['nodeId']][1]
        # find EN element: same leading tag and same text
        tx = text_of(en); tag0 = re.match(r'<([a-z0-9]+)', en).group(1)
        el = next((main[a:b] for t, a, b, d in T.els if t == tag0 and text_of(main[a:b]) == tx), None)
        if el is None: print('NOT FOUND', name, u['nodeId']); continue
        real = [k[1] for k in Tok(el).t if k[0] == '<']
        shown = [k[1] for k in Tok(en).t if k[0] == '<']
        if len(real) != len(shown): print('SHAPE', name, u['nodeId'], real, shown); continue
        new = u['text']; i = 0
        def rep(m):
            return m.group(0)
        toks = Tok(u['text']).t; buf = []; k = 0
        for t in toks:
            if t[0] == '<':
                r = real[k]; k += 1
                if t[1] == 'div' and r != 'div':
                    buf.append(t[2].replace('<div', '<span class="kd-as-%s"' % r, 1)); stack_fix = True
                    t = None
                else: buf.append(t[2])
            elif t[0] == '>':
                buf.append(t[2])
            else: buf.append(t[1])
        s = ''.join(buf)
        # close tags: replace </div> that close converted opens (walk again)
        res = []; st = []
        for t in Tok(s).t:
            if t[0] == '<':
                conv = t[1] == 'span' and 'kd-as-' in t[2] and t[2].startswith('<span class="kd-as-')
                st.append(conv); res.append(t[2])
            elif t[0] == '>':
                c = st.pop() if st else False
                res.append('</span>' if (t[1] == 'div' and c) else t[2])
            else: res.append(t[1])
        fixes.append({'nodeId': u['nodeId'], 'text': ''.join(res)})
    out[name] = fixes
    print(name, len(fixes), sorted({m for f in fixes for m in re.findall(r'kd-as-([a-z0-9]+)', f['text'])}))
json.dump(out, open('es/tagfix.json', 'w'), ensure_ascii=False)
