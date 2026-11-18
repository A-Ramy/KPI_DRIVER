#!/usr/bin/env python3
"""One-step build of the hosted site files from source.

    python3 tools/build_hosted.py            -> webflow/dist/kd-site.css, webflow/dist/kd-site.js (+ .md5 sums)

kd-site.css = webflow/compat.css (Webflow reset layer) + src/assets/css/site.css, minified, with the class
names the old Webflow stylesheet also defines renamed (h4 -> kd-h4, faq -> kd-faq).
kd-site.js  = src/assets/js/site.js with the same renames in its selector strings, after
webflow/build_lifecycle.py has spliced the lifecycle block in.

Never edit the hosted files by hand or append to them: change src/, run this, upload the two files.
"""
import hashlib, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from webflow_export import mincss, declash_css, CLASH  # same rules the first export used

def build():
    subprocess.run([sys.executable, str(ROOT / "webflow/build_lifecycle.py")], check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
    css = mincss((ROOT / "webflow/compat.css").read_text()) + declash_css(mincss((ROOT / "src/assets/css/site.css").read_text()))
    if "../img/" in css: raise SystemExit("site.css still points at ../img/ — use hosted asset URLs")
    js = (ROOT / "src/assets/js/site.js").read_text()
    for a, b in CLASH.items():  # only inside selector strings, never in identifiers
        js = re.sub(r"(?<=[\"' ,(])\.%s(?![\w-])" % a, "." + b, js)
    out = ROOT / "webflow/dist"; out.mkdir(exist_ok=True)
    for name, body in (("kd-site.css", css), ("kd-site.js", js)):
        p = out / name; p.write_text(body)
        print(f"{name}: {len(body.encode()):,} bytes  md5 {hashlib.md5(body.encode()).hexdigest()}")
    node = subprocess.run(["node", "-e", "new Function(require('fs').readFileSync(process.argv[1],'utf8'))", str(out / "kd-site.js")], capture_output=True, text=True)
    if node.returncode: raise SystemExit("kd-site.js does not parse:\n" + node.stderr)

if __name__ == "__main__":
    build()
