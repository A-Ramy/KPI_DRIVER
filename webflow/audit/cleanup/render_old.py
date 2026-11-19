"""Rebuild viewable HTML previews of the first-build pages from their saved Webflow structures.
Uses the site's stylesheet as it was before the clean-up (old-site.css) and the downloaded images.
Not pixel-perfect: custom code embeds, CMS lists and animations are not part of the saved structure."""
import json, os, html, glob, re

B = 'backup'
OUT = f'{B}/old-site-preview'
os.makedirs(OUT, exist_ok=True)
comps = json.load(open('comps_all.json'))
files = {f.split('_', 1)[0]: f for f in os.listdir(f'{B}/files/all')}
pages = json.load(open('pagenames.json'))
slug_of = {pid: slug for pid, slug in pages.items()}
VOID = {'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'stop', 'use'}


def cls(n):
    return ' '.join(s.strip().lower().replace(' ', '-') for s in (n.get('styleNames') or []) if s)


def href(link):
    if not link: return '#'
    t = link.get('linkType')
    if t == 'page':
        pid = link.get('pageId')
        return f"{slug_of[pid]}.html" if pid in slug_of else '#'
    for k in ('url', 'href', 'email', 'phone'):
        if link.get(k):
            v = link[k]
            return ('mailto:' + v) if k == 'email' and not v.startswith('mailto:') else ('tel:' + v) if k == 'phone' and not v.startswith('tel:') else v
    return '#'


def render(n, depth=0, seen=()):
    if n is None or depth > 60: return ''
    t = n.get('type') or ''
    s = n.get('settings') or {}
    if t == 'String':
        return html.escape(n.get('textContent') or '')
    kids = lambda: ''.join(render(c, depth + 1, seen) for c in (n.get('children') or []))
    if t == 'ComponentInstance':
        cid = (n.get('instanceDetails') or {}).get('id')
        if cid in seen or cid not in comps: return f'<!-- component {html.escape(str((n.get("instanceDetails") or {}).get("name")))} -->'
        out = render(comps[cid], depth + 1, seen + (cid,))
        props = (n.get('instanceDetails') or {}).get('props') or []
        texts = [p['value'] for p in props if isinstance(p.get('value'), str) and p.get('name') not in ('Variant',) and not re.fullmatch(r'[0-9a-f-]{20,}', p['value'])]
        for tx in texts:
            out, k = re.subn(r'(<(div|p|h[1-6]|span)( [^>]*)?>)(</\2>)', lambda m: m.group(1) + html.escape(tx) + m.group(4), out, count=1)
            if not k: out += f'<span>{html.escape(tx)}</span>'
        link = next((p['value'] for p in props if isinstance(p.get('value'), dict) and p['value'].get('mode') == 'url'), None)
        if link and link.get('to'): out = re.sub(r'^<a([^>]*?) href="#"', lambda m: f'<a{m.group(1)} href="{html.escape(link["to"], quote=True)}"', out, count=1)
        return out
    if t == 'Slot':
        return kids()
    tag = {'Body': 'div', 'Section': 'section', 'Paragraph': 'p', 'Link': 'a', 'List': 'ul', 'ListItem': 'li', 'Strong': 'strong',
           'Emphasized': 'em', 'Span': 'span', 'Superscript': 'sup', 'Subscript': 'sub', 'Image': 'img', 'Blockquote': 'blockquote',
           'FormForm': 'form', 'FormTextInput': 'input', 'FormButton': 'input', 'FormBlockLabel': 'label', 'FormTextarea': 'textarea',
           'FormSelect': 'select', 'LineBreak': 'br'}.get(t, 'div')
    if t == 'Heading': tag = f"h{s.get('headingLevel') or 2}"
    if t == 'DOM': tag = (s.get('dom') or {}).get('tag') or s.get('tag') or 'div'
    elif s.get('tag') and t not in ('Heading',): tag = s['tag']
    c = cls(n)
    extra = {'Grid': 'w-layout-grid', 'RichText': 'w-richtext', 'HtmlEmbed': 'w-embed', 'TabsWrapper': 'w-tabs', 'TabsMenu': 'w-tab-menu',
             'TabsLink': 'w-tab-link w-inline-block', 'TabsContent': 'w-tab-content', 'TabsPane': 'w-tab-pane', 'Container': 'w-container',
             'FormWrapper': 'w-form', 'FormButton': 'w-button', 'FormTextInput': 'w-input'}.get(t)
    if t == 'Link' and any((ch.get('type') not in ('String', 'Strong', 'Emphasized', 'Span')) for ch in (n.get('children') or [])): extra = 'w-inline-block'
    c = ' '.join(x for x in (c, extra) if x)
    attrs = dict(n.get('attributes') or {})
    if c: attrs['class'] = c
    if t == 'Link': attrs['href'] = href(s.get('link'))
    if t == 'Image':
        f = files.get(s.get('assetId') or '')
        attrs['src'] = f'../files/all/{f}' if f else ''
        attrs.setdefault('alt', s.get('altText') or '')
        attrs['loading'] = 'lazy'
    if t == 'FormButton': attrs['type'] = 'submit'; attrs['value'] = s.get('value') or 'Submit'
    if s.get('visibility') is False: attrs['style'] = (attrs.get('style', '') + ';display:none').strip(';')
    a = ''.join(f' {k}="{html.escape(str(v), quote=True)}"' for k, v in attrs.items() if v is not None)
    if t == 'HtmlEmbed': return f'<div{a}><!-- custom code embed (not stored in the structure) --></div>'
    if tag in VOID: return f'<{tag}{a}>' if tag in ('img', 'br', 'hr', 'input') else f'<{tag}{a}/>'
    return f'<{tag}{a}>{kids()}</{tag}>'


TITLES = {'old-services': 'Services (first build)', 'old-our-team': 'Our Team (first build)', 'old-contact-us': 'Contact Us (first build)',
          'old-privacy-policy': 'Privacy Policy (first build)', 'old-terms-conditions': 'Terms & Conditions (first build)',
          'old-thank-you': 'Thank You (first build)', 'b2b': 'For Clients: B2B', 'b2c': 'For Clients: B2C', 'case-studies': 'Case Studies',
          'knowledge-base': 'Knowledge Base', 'log-in': 'Log in', 'home-current-structure': 'Home (structure as saved, includes the original home sections)',
          'template-article': 'Knowledge Base article template', 'template-knowledge-base-category': 'Knowledge Base category template',
          'template-project-audience': 'Project audience template', 'template-faq': 'FAQ template'}
HEAD = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t} | KPI DRIVER first build</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Inter+Tight:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="old-site.css">
<style>.kd-backup-bar{{position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#111;color:#eee;font:13px/1.4 system-ui,sans-serif;padding:8px 14px}}.kd-backup-bar a{{color:#9cf}}.cursor{{display:none!important}}body{{padding-bottom:40px}}</style>
</head><body><div class="kd-backup-bar">KPI DRIVER first build, preview rebuilt from the saved Webflow structure · <a href="index.html">all pages</a></div>
'''
made = []
for pid, slug in pages.items():
    d = json.load(open(f'{B}/structure/pages/{slug}.json'))
    body = render(d['tree'])
    open(f'{OUT}/{slug}.html', 'w').write(HEAD.format(t=html.escape(TITLES.get(slug, slug))) + body + '</body></html>')
    made.append((slug, len(body)))
idx = HEAD.format(t='All pages') + '<div style="max-width:760px;margin:40px auto;font:16px/1.6 system-ui,sans-serif;padding:0 16px"><h1 style="font-size:28px">KPI DRIVER, first build</h1><p>Previews rebuilt from the Webflow structure saved before the clean-up, styled with the original stylesheet and images. Custom-code embeds, CMS lists, forms and animations are not included, so some sections look emptier than the original.</p><ul>' + ''.join(f'<li><a href="{s}.html">{html.escape(TITLES.get(s, s))}</a></li>' for s, _ in made) + '</ul></div></body></html>'
open(f'{OUT}/index.html', 'w').write(idx)
for s, n in made: print(f'{n:8} {s}')
