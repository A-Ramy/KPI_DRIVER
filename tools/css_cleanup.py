#!/usr/bin/env python3
"""One-off consolidation of src/assets/css/site.css (audit item B2). Rewrites the file in place.
1. Drops selectors for retired features (old lifecycle diagram, old contact form, old booking embed,
   paused calendar CTA, old GHL form, old blog layout pieces). A rule loses only the dead selectors in
   its list; a rule left with none is removed.
2. Folds repeated definitions of the same selector (same @media context) into the LAST one, so the
   later declarations keep winning; an earlier rule is removed once all its declarations are folded.
Verified with tools/style_diff.js (computed styles on every page type must be identical)."""
import re, sys
from pathlib import Path
P = Path(__file__).resolve().parent.parent / "src/assets/css/site.css"
src = P.read_text()

DEAD = re.compile(r"""(
  \.circuit\b | \.circuit__ |
  ^\.form\b | \s\.form\b | \.form__row | \.field\b | \.field__ | \.field\s | ^\.check\b | \s\.check\b | \.form__status | ^\.hp\b | \.hp\s |
  ^\.booking\b | \.booking__ | \.booking\s |
  \.cta--cal | \.cta__cal | \.cta__book |
  \.ghl-form |
  ^\.guides\b | ^\.guide\b | \.guide\s | ^\.cats\b | \.cats\s | ^\.post-feature\b | \.post-feature\s |
  \.tabs__tab\ small | ^\.tool\ a$ | \.gearline--full | \.badge--upcoming
)""", re.X)

def parse(t):
    """Yield (kind, start, end, prelude, body_start, body_end, ctx) for every rule; ctx = enclosing @-preludes."""
    out, stack, i, n = [], [], 0, len(t)
    last = 0
    while i < n:
        if t.startswith("/*", i):
            j = t.index("*/", i) + 2; i = j; last = i; continue
        c = t[i]
        if c == "{":
            pre = t[last:i].strip()
            stack.append((pre, last, i)); i += 1; last = i; continue
        if c == "}":
            pre, s, b = stack.pop()
            ctx = tuple(p for p, _, _ in stack)
            inner_has_rules = "{" in t[b + 1:i]
            if not pre.startswith("@") and not inner_has_rules and not any(p.startswith("@keyframes") for p in ctx):
                out.append(dict(pre=pre, start=s, end=i + 1, body=t[b + 1:i], ctx=ctx))
            i += 1; last = i; continue
        if c == ";" and not stack:
            last = i + 1
        i += 1
    return out

def decls(body):
    parts = [d.strip() for d in re.split(r";(?![^()]*\))", body) if d.strip()]
    return [(d.split(":", 1)[0].strip().lower(), d) for d in parts if ":" in d]

rules = parse(src)
edits = {}  # start -> (end, replacement)
dropped_sel = 0
# 1. dead selectors
for r in rules:
    sels = [s.strip() for s in re.split(r",(?![^()]*\))", r["pre"]) if s.strip()]
    keep = [s for s in sels if not DEAD.search(s)]
    if len(keep) == len(sels): continue
    dropped_sel += len(sels) - len(keep)
    if not keep: edits[r["start"]] = (r["end"], "")
    else:
        lead = src[r["start"]:r["start"] + len(src[r["start"]:]) - len(src[r["start"]:].lstrip())]
        edits[r["start"]] = (r["end"], lead + ", ".join(keep) + " {" + r["body"] + "}")
        r["pre"] = ", ".join(keep)
live_rules = [r for r in rules if not (r["start"] in edits and edits[r["start"]][1] == "")]
# 2. fold duplicates (exact same selector list, same context) into the last occurrence
groups = {}
for r in live_rules:
    key = (r["ctx"], re.sub(r"\s+", " ", r["pre"]))
    groups.setdefault(key, []).append(r)
folded = 0
FOLD = "--no-fold" not in sys.argv
order_idx = {id(r): n for n, r in enumerate(live_rules)}
def props_of(r):
    body = edits[r["start"]][1].split("{", 1)[1].rsplit("}", 1)[0] if r["start"] in edits and edits[r["start"]][1] else r["body"]
    return {p for p, _ in decls(body)}
for key, rs in groups.items():
    if len(rs) < 2 or not FOLD: continue
    # safe only if no rule between the first and last copy sets a property the earlier copies would move
    moved = set().union(*(props_of(r) for r in rs[:-1]))
    lo, hi = order_idx[id(rs[0])], order_idx[id(rs[-1])]
    ids = {id(r) for r in rs}
    between = [r for r in live_rules[lo + 1:hi] if id(r) not in ids]
    if any(moved & props_of(r) for r in between): continue
    last = rs[-1]; merged = {}
    order = []
    for r in rs:  # later declarations win, like the cascade
        body = edits[r["start"]][1].split("{", 1)[1].rsplit("}", 1)[0] if r["start"] in edits and edits[r["start"]][1] else r["body"]
        for prop, d in decls(body):
            if prop in merged: order.remove(prop)
            merged[prop] = d; order.append(prop)
    lead = src[last["start"]:last["start"] + len(src[last["start"]:]) - len(src[last["start"]:].lstrip())]
    edits[last["start"]] = (last["end"], lead + last["pre"] + " { " + "; ".join(merged[p] for p in order) + "; }")
    for r in rs[:-1]:
        edits[r["start"]] = (r["end"], ""); folded += 1

# 3. in duplicate groups that could not be folded, drop declarations an equal later copy re-declares
#    (same selector, same context, later in the file: the later one always wins). !important is kept as-is.
pruned = 0
for key, rs in groups.items():
    if len(rs) < 2: continue
    live_copies = [r for r in rs if not (r["start"] in edits and edits[r["start"]][1] == "")]
    for k, r in enumerate(live_copies[:-1]):
        later = set()
        for q in live_copies[k + 1:]:
            later |= {p for p, d in decls(edits[q["start"]][1].split("{", 1)[1].rsplit("}", 1)[0] if q["start"] in edits and edits[q["start"]][1] else q["body"]) if "!important" not in d}
        body = edits[r["start"]][1].split("{", 1)[1].rsplit("}", 1)[0] if r["start"] in edits and edits[r["start"]][1] else r["body"]
        ds = decls(body)
        keep = [d for p, d in ds if p not in later or "!important" in d]
        if len(keep) == len(ds): continue
        pruned += len(ds) - len(keep)
        lead = src[r["start"]:r["start"] + len(src[r["start"]:]) - len(src[r["start"]:].lstrip())]
        edits[r["start"]] = (r["end"], (lead + r["pre"] + " { " + "; ".join(keep) + "; }") if keep else "")
print("overridden declarations pruned:", pruned)

out, pos = [], 0
for s in sorted(edits):
    e, rep = edits[s]
    out.append(src[pos:s]); out.append(rep); pos = e
out.append(src[pos:])
res = "".join(out)
res = re.sub(r"\n[ \t]*\n(?:[ \t]*\n)+", "\n\n", res)
P.write_text(res)
print(f"dead selectors dropped: {dropped_sel}; duplicate rules folded: {folded}; {len(src):,} -> {len(res):,} bytes")
