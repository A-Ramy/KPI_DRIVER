import re, json, subprocess, random, sys
from html.parser import HTMLParser
PAGES = {'services': '/services', 'crm': '/services/crm', 'ai-suite': '/services/ai-suite', 'ai-agent': '/services/ai-agent', 'our-team': '/our-team', 'contact-us': '/contact-us', 'book': '/book-discovery-call', 'thank-you': '/thank-you', 'privacy': '/policies/privacy-policy', 'terms': '/policies/terms-conditions', '404': '/404'}
def toplevel(html):
    # split inner html of <main> into top-level child elements
    out, depth, start, i = [], 0, None, 0
    for m in re.finditer(r'<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>', html):
        tag = m.group(2).lower(); void = tag in ('br','img','input','meta','link','hr','source','wbr','path','circle','rect','line','polyline','polygon','stop','use','ellipse') or m.group(4)
        if m.group(1):
            depth -= 1
            if depth == 0: out.append(html[start:m.end()])
        else:
            if depth == 0: start = m.start()
            if not void: depth += 1
            elif depth == 0: out.append(html[start:m.end()])
    return out
def run():
  for k, p in PAGES.items():
        h = subprocess.run(['curl', '-s', f'https://www.kpidriver.com{p}?z={random.random()}'], capture_output=True, text=True).stdout
        m = re.search(r'<main id="main"[^>]*>(.*?)</main>', h, re.S)
        if not m: print(k, 'NO MAIN'); continue
        secs = toplevel(m.group(1))
        json.dump(secs, open(f'pages/{k}.json', 'w'))
        mains = len(re.findall(r'<main', h))
        print(f'{k:11} mains={mains} sections={len(secs)} chars={sum(map(len,secs))} tags={[re.match(r"<(\w+)[^>]*?(class=\"([^\"]*)\")?", s).group(0)[:60] for s in secs]}')

if __name__=='__main__': run()
