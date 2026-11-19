"""Turn page HTML sections into Webflow WHTML-builder actions.
- Every class gets an empty rule, so Webflow keeps the class names (the design itself lives in kd-site.css).
- Inline style="" on p/div/h*/li/ul/section (native types drop it) becomes a named utility combo class,
  e.g. <p class="note" style="margin-top:16px"> -> class "note u-mt-16" with rule .note.u-mt-16{margin-top:16px}.
  DOM-type tags (i, span, svg parts...) keep their style attribute as is.
usage: python3 wgen.py sections.json <pageId> <parentElementId> out.json [per_call=5]
"""
import json, re, sys
from html.parser import HTMLParser
NATIVE = {'a', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'section', 'blockquote', 'figure', 'header', 'footer', 'nav', 'article', 'aside'}
ABBR = {'margin-top': 'mt', 'margin-bottom': 'mb', 'margin-left': 'ml', 'margin-right': 'mr', 'margin': 'm', 'padding': 'p',
        'padding-top': 'pt', 'padding-bottom': 'pb', 'border': 'b', 'border-color': 'bc', 'gap': 'gap', 'font-size': 'fs',
        'display': 'd', 'text-transform': 'tt', 'text-align': 'ta', 'max-width': 'maxw', 'width': 'w'}
def val_code(v):
    v = v.strip()
    m = re.fullmatch(r'var\(--step-(-?\d+)\)', v)
    if m: return 's' + m.group(1).replace('-', 'm')
    m = re.fullmatch(r'var\(--([\w-]+)\)', v)
    if m: return m.group(1)
    m = re.fullmatch(r'(-?\d+(?:\.\d+)?)(px)?', v)
    if m: return m.group(1).replace('.', '_').replace('-', 'n')
    m = re.fullmatch(r'(\d+(?:\.\d+)?)%', v)
    if m: return m.group(1).replace('.', '_') + 'pc'
    if re.fullmatch(r'[a-z-]+', v): return v
    raise SystemExit(f'cannot name value "{v}"')
def util_for(style):
    decls = [d.strip() for d in style.split(';') if d.strip()]
    pairs = [[x.strip() for x in d.split(':', 1)] for d in decls]
    if len(pairs) == 1 and pairs[0] == ['font-size', 'var(--step--1)']: return [('u-text-sm', pairs)]
    codes = []
    for p, v in pairs:
        if p not in ABBR: raise SystemExit(f'no abbreviation for property "{p}" - add one')
        codes.append(ABBR[p] + '-' + val_code(v))
    return [('u-' + '-'.join(codes), pairs)]
def convert(html):
    classes, rules = set(), {}
    def rep(m):
        tag, attrs = m.group(1).lower(), m.group(2)
        sm = re.search(r'\sstyle="([^"]*)"', attrs)
        if tag in NATIVE and sm:
            cm = re.search(r'\sclass="([^"]*)"', attrs)
            base = cm.group(1).split() if cm else []
            utils = util_for(sm.group(1))
            names = [u[0] for u in utils]
            for n, pairs in utils:
                sel = ''.join('.' + b for b in base) + '.' + n   # Webflow combos belong to the full class chain
                for p, v in pairs:
                    if p == 'border' and v.strip() in ('0', 'none', '0px'):   # Webflow drops the shorthand
                        for side in ('top', 'right', 'bottom', 'left'):
                            rules.setdefault(sel, {})[f'border-{side}-width'] = '0px'
                            rules.setdefault(sel, {})[f'border-{side}-style'] = 'none'
                            rules.setdefault(sel, {})[f'border-{side}-color'] = 'currentcolor'
                    else: rules.setdefault(sel, {})[p] = v
            attrs = attrs.replace(sm.group(0), '')
            if cm: attrs = attrs.replace(cm.group(0), ' class="' + ' '.join(base + names) + '"')
            else: attrs = ' class="' + ' '.join(names) + '"' + attrs
        return '<' + m.group(1) + attrs + '>'
    html = re.sub(r'<(\w+)(\s[^<>]*?)?>', lambda m: rep(m) if m.group(2) else m.group(0), html)
    # Webflow drops boolean attributes with an empty value on publish, so give them their own name as value
    html = re.sub(r'(<\w+[^<>]*?\s)(hidden|allowfullscreen|disabled|open|required|checked|novalidate|defer|async)(?=[\s>/])(?!=)', lambda m: m.group(1) + m.group(2) + '="' + m.group(2) + '"', html)
    for c in re.findall(r'\sclass="([^"]*)"', html): classes |= set(c.split())
    css = ''.join(f'.{c}{{}}' for c in sorted(classes) if not c.startswith('u-')) + ''.join(s + '{' + ''.join(f'{p}:{v};' for p, v in r.items()) + '}' for s, r in rules.items())
    return html, css
if __name__ == '__main__':
    secs, page, parent, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    per = int(sys.argv[5]) if len(sys.argv) > 5 else 5
    sections = json.load(open(secs)); acts = []
    for i, h in enumerate(sections):
        html, css = convert(h)
        acts.append({'build_label': f's{i}', 'parent_element_id': {'component': page, 'element': parent}, 'creation_position': 'append', 'html': html, 'css': css})
    batches = [acts[i:i + per] for i in range(0, len(acts), per)]
    json.dump(batches, open(out, 'w'))
    print(len(acts), 'sections in', len(batches), 'calls; sizes', [len(json.dumps(b)) for b in batches])
