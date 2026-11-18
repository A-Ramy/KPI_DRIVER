"""Collect class chains (styleNames lists) from saved get_all_elements outputs, whatever their wrapping (audit C7)."""
import json, re, sys
PAT = re.compile(r'"styleNames":(\[[^\]]*\])')
def chains(path):
    t = open(path).read()
    try:
        o = json.loads(t)
        if isinstance(o, list) and o and isinstance(o[0], dict) and 'text' in o[0]:
            t = ''.join(x.get('text', '') for x in o)
    except Exception:
        pass
    out = []
    for m in PAT.finditer(t):
        try: out.append(tuple(json.loads(m.group(1))))
        except Exception: pass
    return out
if __name__ == '__main__':
    allc = set()
    for f in sys.argv[1:]:
        c = chains(f); allc |= set(c); print(f, len(c))
    print('distinct', len(allc))
