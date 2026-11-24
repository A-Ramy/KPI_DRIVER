"""Build the residual English->Spanish word list from esdiff dumps.

Only strings Webflow Localization cannot hold end up here (text inside custom DOM elements,
aria-labels). usage: python3 esdict.py DUMP_DIR > es/residual.json
"""
import json, glob, sys, difflib, re

text, attrs, review = {}, {}, []
for f in sorted(glob.glob(sys.argv[1] + '/*.json')):
    d = json.load(open(f)); L, N = d['L'], d['N']
    sm = difflib.SequenceMatcher(None, N['lines'], L['lines'], autojunk=False)
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == 'equal': continue
        if op == 'replace' and a1 - a0 == b1 - b0:
            for en, es in zip(N['lines'][a0:a1], L['lines'][b0:b1]):
                if text.get(en, es) != es: review.append([d['path'], 'conflict', en, text[en], es])
                text[en] = es
        else:
            review.append([d['path'], op, N['lines'][a0:a1], L['lines'][b0:b1]])
    na, la = N['attrs'], L['attrs']
    if len(na) == len(la):
        for en, es in zip(na, la):
            ka, va = en.split('=', 1); kb, vb = es.split('=', 1)
            if ka == kb and va != vb: attrs[va] = vb
            elif ka != kb: review.append([d['path'], 'attr-mismatch', en, es])
    else:
        review.append([d['path'], 'attr-count', len(na), len(la)])
print(json.dumps({'text': text, 'attrs': attrs, 'review': review}, ensure_ascii=False, indent=1))
