"""Build kd-posts-es.js: the related-posts index (webflow/kd-posts.js) with Spanish titles,
summaries, category names and type labels taken from the Spanish CMS locale (es/blog_es.json).
Loaded on /es/post/ pages in place of kd-posts.js. usage: python3 build_posts_es.py"""
import json, re
src = open('../kd-posts.js').read()
P = json.loads(re.search(r'window\.KD_POSTS=(\{.*\});', src, re.S).group(1))
ES = json.load(open('es/blog_es.json'))
Y = {'Checklist': 'Lista de verificación', 'Comparison': 'Comparativa', 'Explainer': 'Explicación', 'Guide': 'Guía', 'How-to': 'Paso a paso'}
for slug, p in P.items():
    e = ES['posts'][slug]
    p['t'], p['s'], p['n'], p['y'] = e['t'], e['s'], ES['cats'][p['c']], Y[p['y']]
open('kd-posts-es.js', 'w').write('window.KD_POSTS=' + json.dumps(P, ensure_ascii=False, separators=(',', ':')) + ';window.KD_POSTS_READY&&KD_POSTS_READY();')
print(len(P), 'posts')
