# Raw HTML (no JS) scan of every Spanish page incl. all posts and categories: internal links that miss /es, scheduler widget links, pulsetic
import re,sys,urllib.request
host=sys.argv[1]
sm=urllib.request.urlopen(host+"/sitemap.xml").read().decode()
urls=sorted(set(u for u in re.findall(r'<loc>([^<]+)</loc>',sm)))
es=[re.sub(r'^https?://[^/]+','',u) for u in urls if re.search(r'/es(/|$)',u)]
if not es: es=['/es'+re.sub(r'^https?://[^/]+','',u).rstrip('/') for u in urls]
bad=0
for p in es+['/es/no-such-page-kd']:
    try: h=urllib.request.urlopen(host+p).read().decode()
    except Exception as e: h=e.read().decode()
    hits=[]
    for a in re.finditer(r'<a\b([^>]*)>',h):
        m=re.search(r'href="([^"]*)"',a.group(1))
        if not m: continue
        x=m.group(1)
        if re.match(r'/(?!es(/|$|#|\?))',x) and 'lang-toggle' not in a.group(1) and 'hreflang' not in a.group(1): hits.append(x)
        if 'widget/booking' in x or 'pulsetic' in x: hits.append(x)
    if hits: bad+=1; print(p, hits[:8])
print("pages checked",len(es)+1,"with issues",bad)
