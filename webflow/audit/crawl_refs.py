import re, json, urllib.request, concurrent.futures as cf
B='https://www.kpidriver.com'
sm=open('sm.xml').read()
urls=set(re.findall(r'<loc>([^<]+)',sm))
urls|={B+u for u in ['/knowledge-base','/log-in','/404','/no-such-page']}
def get(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0 audit'}),timeout=30); return u,r.read().decode('utf-8','replace')
    except Exception as e: return u,''
pages={}
with cf.ThreadPoolExecutor(8) as ex:
    for u,h in ex.map(get,sorted(urls)): pages[u]=h
# member subpages discovered from KB
more=set()
for h in [pages.get(B+'/knowledge-base','')]:
    more|={B+m for m in re.findall(r'href="(/(?:article|knowledge-base-categories)/[^"#?]+)"',h)}
with cf.ThreadPoolExecutor(8) as ex:
    for u,h in ex.map(get,sorted(more)): pages[u]=h
refs=set(); cssjs=set()
for u,h in pages.items():
    refs|=set(re.findall(r'([0-9a-f]{24})_',h))
    cssjs|=set(re.findall(r'https://cdn\.prod\.website-files\.com/68974c57cac027f80fdf883f/[^"\'\s)]+\.(?:css|js)',h))
for f in cssjs:
    _,t=get(f); refs|=set(re.findall(r'([0-9a-f]{24})_',t))
json.dump({'pages':len(pages),'refs':sorted(refs),'cssjs':sorted(cssjs),'empty':[u for u,h in pages.items() if not h]},open('refs.json','w'))
print('pages',len(pages),'refs',len(refs),'cssjs',len(cssjs),'empty',[u for u,h in pages.items() if not h][:5])
