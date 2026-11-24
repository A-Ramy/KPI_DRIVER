"""Build set_link actions (URL -> native Page link) from the saved node maps."""
import json, re, sys, glob
PAGES = {'/': '68974c57cac027f80fdf8828', '/services': '6afa6ce5a6769cca503f0934', '/services/crm': '6afa1f119ba75560d9c1652d',
 '/services/ai-suite': '6afa6c72b8bbfbdd8948a38f', '/services/ai-agent': '6afa191e7b59d3ca770d4e6a', '/our-team': '6afa188c23514ef7a01c1579',
 '/contact-us': '6afa1e999eb44edc324f9215', '/book-discovery-call': '6afa0d6e369e94ec1c852b8a', '/blog': '68974c57cac027f80fdf882a',
 '/policies/privacy-policy': '6afa6eb7cff8a37e634fd4c7', '/policies/terms-conditions': '6afa6eb8cb9446c6d1f6ab20', '/thank-you': '6afa182cf610cfffbefd4cb2'}
FILES = {'ai-agent': '6afa191e7b59d3ca770d4e6a', 'thank-you': '6afa182cf610cfffbefd4cb2', 'book': '6afa0d6e369e94ec1c852b8a', 'our-team': '6afa188c23514ef7a01c1579',
 'contact-us': '6afa1e999eb44edc324f9215', 'crm': '6afa1f119ba75560d9c1652d', 'services': '6afa6ce5a6769cca503f0934', 'ai-suite': '6afa6c72b8bbfbdd8948a38f', 'home': '68974c57cac027f80fdf8828'}
out = {}
for name, pid in FILES.items():
    acts = []
    for ent in json.load(open('es/n_%s.json' % name)):
        nid, h = ent[0], ent[1]
        m = re.match(r'<a [^>]*href="(/[^"#]*)"', h)
        if m and m.group(1) in PAGES:
            acts.append((nid, m.group(1)))
        for m in re.finditer(r'<a [^>]*href="(/[^"#]*)"[^>]*data-w-id="([^"]+)"', h):
            if m.group(1) in PAGES: acts.append((m.group(2), m.group(1)))
    out[pid] = [{'label': str(i), 'set_link': {'id': {'component': pid, 'element': e}, 'linkType': 'page', 'link': PAGES[p]}} for i, (e, p) in enumerate(acts)]
    print(name, pid, len(acts))
json.dump(out, open('es/links.json', 'w'))
