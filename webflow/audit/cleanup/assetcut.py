"""Which library assets does the live site still reference? Crawls all sitemap pages, then every hosted
script/stylesheet they load (recursively, so bundles loaded by kd-head are included), plus CMS exports."""
import json, re, subprocess, glob, random
T = '/root/.claude/projects/-home-user-KPI-DRIVER/e3dc9ffd-4c54-5ea5-bfef-d94aaa22dc31/tool-results/mcp-Webflow-data_assets_tool-1795112754963-e39zyy.txt'
raw = json.load(open(T)); assets = []
for blk in raw:
    t = blk['text']; dec = json.JSONDecoder(); i = 0
    while True:
        j = t.find('{', i)
        if j < 0: break
        try: d, e = dec.raw_decode(t, j)
        except ValueError: i = j + 1; continue
        if isinstance(d, dict) and 'result' in d: assets += d['result']['assets']
        i = e
print('assets', len(assets))
get = lambda u: subprocess.run(['curl', '-s', '-m', '30', u], capture_output=True, text=True, errors='replace').stdout
urls = re.findall(r'<loc>([^<]+)', get('https://www.kpidriver.com/sitemap.xml'))
texts = []; seen = set()
for u in urls + ['https://www.kpidriver.com/no-such-page-404']:
    texts.append(get(u + ('&' if '?' in u else '?') + 'z=' + str(random.random())))
CDN = re.compile(r'https://cdn\.prod\.website-files\.com/68974c57cac027f80fdf883f/[^"\'\s)]+\.(?:js|css)')
queue = set(m for t in texts for m in CDN.findall(t))
while queue:
    u = queue.pop()
    if u in seen: continue
    seen.add(u); body = get(u); texts.append(body)
    queue |= set(CDN.findall(body)) - seen
    for idf in re.findall(r'[0-9a-f]{24}_[A-Za-z0-9._%-]+\.(?:js|css)', body):   # bundles referenced by id+name only
        queue.add('https://cdn.prod.website-files.com/68974c57cac027f80fdf883f/' + idf)
for f in glob.glob('backup/cms/*.json'):
    if any(k in f for k in ('blog-posts', 'blog-categories', 'faqs')): texts.append(open(f).read())
blob = '\n'.join(texts)
used = set(re.findall(r'([0-9a-f]{24})_', blob))
print('pages', len(urls), '| hosted code files read', len(seen))
unused = [a for a in assets if a['id'] not in used]
keep = [a for a in assets if a['id'] in used]
json.dump([{'id': a['id'], 'name': a.get('displayName'), 'size': a.get('size')} for a in unused], open('asset_unused.json', 'w'), indent=0)
print('used', len(keep), '| unused', len(unused), '| unused MB', round(sum(a.get('size') or 0 for a in unused) / 1e6, 1))
for a in sorted(unused, key=lambda a: a.get('displayName') or '')[:400]: print('  ', a['id'], a.get('displayName'))
