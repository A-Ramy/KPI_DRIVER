import sys
from PIL import Image, ImageChops
tag = sys.argv[1]
for w in (1440, 390):
    a = Image.open(f'px_{tag}_{w}_live.png').convert('RGB'); b = Image.open(f'px_{tag}_{w}_native.png').convert('RGB')
    if a.size != b.size: print(tag, w, 'SIZE DIFFERS', a.size, b.size); continue
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 16 else 0)
    print(tag, w, a.size, 'differing pixels:', d.histogram()[255], 'bbox', d.getbbox())
