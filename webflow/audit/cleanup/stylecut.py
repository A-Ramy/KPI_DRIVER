"""Find Webflow styles no element uses any more (after the old pages/components were removed) and whose
class name appears nowhere in the live HTML or in our hosted CSS/JS. Output: removal actions."""
import json, re, glob
T = '/root/.claude/projects/-home-user-KPI-DRIVER/e3dc9ffd-4c54-5ea5-bfef-d94aaa22dc31'
raw = open(f'{T}/tool-results/mcp-Webflow-data_style_tool-1795101032538-vbjnf9.txt').read()
styles = json.JSONDecoder().raw_decode(raw, raw.find('{'))[0]['result']
print('styles', len(styles))

# used chains: the three live pages with native elements (latest tree reads in the transcript)
used = set()
pat = re.compile(r'\\*"styleNames\\*":(\[[^\]]*\])')
for line in open(f'{T}.jsonl'):
    if 'tree-blog' in line or 'tree-cat' in line or 'tree-post' in line:
        for m in pat.finditer(line):
            s = m.group(1).replace('\\"', '"')
            try: ch = tuple(json.loads(s))
            except Exception: continue
            for i in range(1, len(ch) + 1): used.add(ch[:i])
print('used chains', len(used))

sel2name = {s['selector']: s['name'] for s in styles}
def chain(s):
    toks = s['selector'].lstrip('.').split('.')
    out = []
    for i in range(1, len(toks) + 1):
        out.append(sel2name.get('.' + '.'.join(toks[:i]), toks[i - 1]))
    return tuple(out)

# names appearing in live HTML class attributes, our CSS/JS, ES bundles, booking files
D = '/tmp/claude-0/-home-user-KPI-DRIVER/e3dc9ffd-4c54-5ea5-bfef-d94aaa22dc31/scratchpad'
live_cls = set()
for f in glob.glob(f'{D}/d24/*.html'):
    for c in re.findall(r'class="([^"]*)"', open(f, encoding='utf-8', errors='replace').read()): live_cls |= set(c.split())
code = ''
for f in ['/home/user/KPI_DRIVER/webflow/dist/kd-site.css', '/home/user/KPI_DRIVER/webflow/dist/kd-site.js', f'{D}/6afcd30a34c9736907449f20_kd-booking-2.css', f'{D}/kdb5.js'] + glob.glob('/home/user/KPI_DRIVER/webflow/dist/es/*.js'):
    code += open(f, encoding='utf-8', errors='replace').read()

remove, kept_token = [], []
for s in styles:
    if s.get('isFromLibrary'): continue
    ch = chain(s)
    if ch in used: continue
    tok = s['selector'].lstrip('.').split('.')[-1]
    if tok in live_cls or re.search(r'[.\s"\']' + re.escape(tok) + r'(?![\w-])', code):
        kept_token.append(s['name']); continue
    remove.append({'name': ch[-1], 'parents': list(ch[:-1]), 'combo': s['isComboClass']})
remove.sort(key=lambda r: -len(r['parents']))   # deepest combos first
json.dump(remove, open(f'{D}/style_remove.json', 'w'), indent=0)
print('remove', len(remove), '| kept because the name appears in live HTML/code:', len(kept_token))
print('kept sample:', kept_token[:40])
