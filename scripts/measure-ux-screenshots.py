"""Measure saved browser captures; never infer molecular size from canvas size.

Run with Pillow available. Screenshots are full-page JPEGs at browser CSS scale.
The foreground threshold rejects JPEG noise in the white WebGL background.
Use only unannotated, unrotated before/after captures for framing comparisons.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
from PIL import Image, ImageChops

def molecular_component(mask):
    """Ignore disconnected footer letters if full-page capture reflows text.

    Unannotated ball-and-stick molecules form one connected foreground object.
    Keep the component with the most pixels, using eight-neighbor connectivity.
    """
    w, h = mask.size
    pixels = bytearray(mask.tobytes())
    largest = (0, None)
    for seed, value in enumerate(pixels):
        if not value:
            continue
        stack = [seed]
        pixels[seed] = 0
        count = 0
        left, right, top, bottom = w, 0, h, 0
        while stack:
            p = stack.pop()
            x, y = p % w, p // w
            count += 1
            left, right, top, bottom = min(left,x), max(right,x), min(top,y), max(bottom,y)
            for ny in range(max(0,y-1),min(h,y+2)):
                for nx in range(max(0,x-1),min(w,x+2)):
                    q = ny*w+nx
                    if pixels[q]:
                        pixels[q] = 0
                        stack.append(q)
        if count > largest[0]:
            largest = (count, (left,top,right+1,bottom+1))
    return largest[1]

folder = ROOT / 'docs' / 'ux-polish-screenshots'
records = json.loads((folder / 'measurements.json').read_text(encoding='utf-8'))
for record in records:
    screenshot = Image.open(ROOT / 'docs' / record['screenshot']).convert('RGB')
    record['moleculePixels'] = []
    for bounds in record['canvases']:
        x, y = round(bounds['x']), round(bounds['y'])
        w, h = round(bounds['width']), round(bounds['height'])
        # Skip the boundary where neighboring UI or a one-pixel rule could enter.
        crop = screenshot.crop((x + 2, y + 2, x + w - 2, y + h - 2))
        darkness = ImageChops.darker(ImageChops.darker(*crop.split()[:2]), crop.split()[2])
        mask = darkness.point(lambda value: 255 if value < 205 else 0)
        box = molecular_component(mask)
        if not box:
            record['moleculePixels'].append(None)
            continue
        left, top, right, bottom = box
        record['moleculePixels'].append({
            'x': left + 2, 'y': top + 2, 'width': right-left, 'height': bottom-top,
            'widthOccupancy': (right-left)/bounds['width'],
            'heightOccupancy': (bottom-top)/bounds['height'],
            'edgeMargin': min(left+2, top+2, w-right-2, h-bottom-2),
        })
pairs = []
for before in records:
    if not before['label'].startswith('before-'):
        continue
    after = next((r for r in records if r['label'] == before['label'].replace('before-', 'after-', 1)), None)
    if not after:
        continue
    pairs.append({
        'case': before['label'].removeprefix('before-'),
        'threeD': [{'before': a, 'after': b,
            'widthChangePercent': 100*(b['width']/a['width']-1),
            'heightChangePercent': 100*(b['height']/a['height']-1)}
            for a,b in zip(before['moleculePixels'],after['moleculePixels']) if a and b],
        'twoD': [{'before': a['drawing'], 'after': b['drawing'],
            'widthChangePercent':100*(b['drawing']['width']/a['drawing']['width']-1),
            'heightChangePercent':100*(b['drawing']['height']/a['drawing']['height']-1),
            'shelfHeightChange':b['bounds']['height']-a['bounds']['height']}
            for a,b in zip(before['references'],after['references'])],
    })
result = {'date':'2026-10-03',
    'method':'Full-page browser JPEGs; 3D bbox: largest connected nonwhite pixel component (minimum RGB channel <205, 8-neighbor), 2px canvas boundary excluded. This isolates the connected unannotated ball-and-stick molecule from disconnected UI text when full-page capture reflows text. 2D bbox: union of painted SVG element DOM rectangles. Only before/after default unannotated views quantify molecular growth; annotated interaction bboxes are not molecular-size evidence. Approximate CSS pixels, screenshot/antialias tolerance 1–2px. No claim of physical device validation.',
    'records':records, 'beforeAfter':pairs}
(ROOT / 'docs' / 'ux-polish-validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'records':len(records),'comparisons':pairs},ensure_ascii=False,indent=2))
