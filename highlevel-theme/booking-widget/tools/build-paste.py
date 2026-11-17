"""Build the snippet to paste into HighLevel: Calendar → Customizations → "Insert custom code".

Wraps a minified copy of kd-booking-widget.css in <style>, plus a tiny <script> that gives the
widget page a favicon (speedometer) and a tab title, which the page otherwise lacks.

    python3 highlevel-theme/booking-widget/tools/build-paste.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
css = (ROOT / "kd-booking-widget.css").read_text()

css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)          # comments (no "/*" occurs inside urls)
css = re.sub(r"\s+", " ", css)                            # collapse whitespace
css = re.sub(r"\s*([{};,>])\s*", r"\1", css)              # tighten around punctuation
css = re.sub(r";}", "}", css).strip()

ICON = "https://cdn.prod.website-files.com/68974c57cac027f80fdf883f/6afa14d6fb4d11e63de9d2b5_kd-icon-gauge.png"
script = (
    "<script>(function(){try{var d=document,h=d.head;"
    "if(h&&!d.querySelector('link[rel~=\"icon\"]')){var l=d.createElement('link');"
    f"l.rel='icon';l.type='image/png';l.href='{ICON}';h.appendChild(l);"
    "var a=d.createElement('link');a.rel='apple-touch-icon';"
    f"a.href='{ICON}';h.appendChild(a);}}"
    "if(!d.title)d.title='Book a Call \\u00b7 KPI DRIVER';}catch(e){}})();</script>"
)

out = ROOT / "paste" / "calendar-custom-code.html"
out.parent.mkdir(exist_ok=True)
out.write_text(f"<style>{css}</style>\n{script}\n")
print(f"{out.relative_to(ROOT.parent.parent)}: {out.stat().st_size:,} characters")
