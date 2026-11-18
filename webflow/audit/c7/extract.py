"""Pull every data_element_tool get_all_elements result out of the session transcript into webflow/audit/c7/trees/."""
import json, os, glob
T = '/root/.claude/projects/-home-user-KPI-DRIVER/e3dc9ffd-4c54-5ea5-bfef-d94aaa22dc31.jsonl'
out = os.path.join(os.path.dirname(__file__), 'trees'); os.makedirs(out, exist_ok=True)
calls = {}
for line in open(T):
    try: o = json.loads(line)
    except Exception: continue
    m = o.get('message', {})
    c = m.get('content')
    if not isinstance(c, list): continue
    for b in c:
        if b.get('type') == 'tool_use' and b.get('name') == 'mcp__Webflow__data_element_tool':
            acts = b['input'].get('actions', [])
            if any('get_all_elements' in a for a in acts):
                calls[b['id']] = (b['input'].get('pageId'), acts)
        if b.get('type') == 'tool_result' and b.get('tool_use_id') in calls:
            pid, acts = calls[b['tool_use_id']]
            cont = b.get('content')
            txt = cont if isinstance(cont, str) else ''.join(x.get('text', '') for x in cont if isinstance(x, dict))
            if 'saved to' in txt and 'tool-results' in txt:
                p = txt.split('saved to ')[1].split('.txt')[0] + '.txt'
                if os.path.exists(p): txt = open(p).read()
            ga = [a['get_all_elements'] for a in acts if 'get_all_elements' in a][0]
            if ga.get('depth', -1) != -1 or 'success' not in txt[:400]: continue
            name = ga.get('scope_component_id') or pid
            open(os.path.join(out, f'{name}.txt'), 'w').write(txt)
print(len(os.listdir(out)), 'trees')
