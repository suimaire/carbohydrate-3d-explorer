"""Measure unannotated browser captures and assemble unchanged before/after crops.
Uses the existing largest-connected-component method; no new dependency.
Run with bundled Python/Pillow. All sizes are approximate CSS pixels (±2px).
"""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
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


folder = ROOT / 'docs/comparison-viewport-screenshots'
records = json.loads((folder/'measurements.json').read_text(encoding='utf-8'))
for record in records:
    shot = Image.open(folder/record['screenshot']).convert('RGB')
    for pane in record['panes']:
        b = pane['canvas']
        x, y, w, h = [round(b[k]) for k in ['x','y','width','height']]
        crop = shot.crop((x+2,y+2,x+w-2,y+h-2))
        darkness = ImageChops.darker(ImageChops.darker(*crop.split()[:2]),crop.split()[2])
        box = molecular_component(darkness.point(lambda v:255 if v<205 else 0))
        if box:
            l,t,r,d=box
            pane['foregroundBox']={'x':l+2,'y':t+2,'width':r-l,'height':d-t,
                'edgeMargin':min(l+2,t+2,w-r-2,h-d-2)}
        pane['canvasRatio']=b['height']/pane['stage']['height']
        pane['topReservation']=b['y']-pane['stage']['y']
pairs=[]
for before in records:
    if not before['label'].startswith('before-'):continue
    after=next((r for r in records if r['label']==before['label'].replace('before-','after-',1)),None)
    if not after:continue
    pairs.append({'case':before['label'][7:],'panes':[{'name':a['name'],
        'stageBefore':a['stage']['height'],'stageAfter':b['stage']['height'],
        'canvasBefore':a['canvas']['height'],'canvasAfter':b['canvas']['height'],
        'ratioBefore':a['canvasRatio'],'ratioAfter':b['canvasRatio'],
        'headingBefore':a['heading']['height'],'headingAfter':b['heading']['height'],
        'moleculeBefore':a['foregroundBox'],'moleculeAfter':b['foregroundBox'],
        'referenceBefore':a['reference']['height'],'referenceAfter':b['reference']['height']}
        for a,b in zip(before['panes'],after['panes'])]})
(folder.parent/'comparison-viewport-validation.json').write_text(json.dumps({
    'date':'2026-10-03','method':'DOM rectangles in CSS px; WebGL backing size also recorded. Molecular bbox from largest 8-connected foreground pixel component (min RGB <205), excluding 2px canvas perimeter. Text is disconnected from molecules in unannotated before/after captures. Approximate tolerance 2px. Annotated captures are not molecular-size evidence. Full-page capture may remove scrollbar, moving x/width by about 8px; heights and largest component size remain comparable.',
    'beforeAfter':pairs,'records':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Unscaled crops side by side for a direct same-size visual comparison.
shots=[]
for label in ['before-1600-compare-anomer','after-1600-compare-anomer']:
    row=next(r for r in records if r['label']==label)
    box=row['panes'][0]['stage']; x,y,w,h=[round(box[k]) for k in ['x','y','width','height']]
    shots.append(Image.open(folder/row['screenshot']).convert('RGB').crop((x,y,x+w,y+h)))
joined=Image.new('RGB',(shots[0].width+shots[1].width+20,max(s.height for s in shots)+40),'#f2f5f4')
draw=ImageDraw.Draw(joined);draw.text((10,12),'BEFORE | canvas 270 px',fill='black');draw.text((shots[0].width+30,12),'AFTER | canvas 385 px',fill='black')
joined.paste(shots[0],(0,40));joined.paste(shots[1],(shots[0].width+20,40));joined.save(folder/'before-after-anomer.jpg',quality=95)
# Both alpha/beta panes, together with their unchanged 2D references.
pair_shots=[]
for label in ['before-1600-compare-anomer','after-1600-compare-anomer']:
    row=next(r for r in records if r['label']==label)
    left,right=row['panes']; a=left['stage']; b=right['reference']
    pair_shots.append(Image.open(folder/row['screenshot']).convert('RGB').crop(
        (round(a['x']),round(a['y']),round(b['x']+b['width']),round(b['y']+b['height']))))
pair=Image.new('RGB',(sum(s.width for s in pair_shots)+20,max(s.height for s in pair_shots)+40),'#f2f5f4')
draw=ImageDraw.Draw(pair)
draw.text((10,12),'BEFORE | alpha / beta glucose',fill='black')
draw.text((pair_shots[0].width+30,12),'AFTER | alpha / beta glucose',fill='black')
pair.paste(pair_shots[0],(0,40));pair.paste(pair_shots[1],(pair_shots[0].width+20,40))
pair.save(folder/'before-after-anomer-pair.jpg',quality=95)
print(json.dumps(pairs,ensure_ascii=False,indent=2))
