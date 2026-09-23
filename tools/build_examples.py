"""Extract source ink, trace smooth SVG contours, and build lesson study artwork.

The Key uses its source ink layer; the Compendium uses verified earlier JPEGs
from the same scan to retain hairlines lost during PDF recompression. Contours
are cleaned and traced, with narrowly reviewed scan-gap repairs. Requires
PyMuPDF, numpy, scipy, Pillow and the potrace executable.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import tempfile
import copy
import math
import xml.etree.ElementTree as ET

import fitz
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'app/src/main/assets'
SOURCES = {
    'New Spencerian Compendium_text.pdf': "New Spencerian Compendium, P. R. Spencer's Sons",
    'spencerian_penmanship.pdf': 'Spencerian Key to Practical Penmanship',
    'CLASS-SpenceModule-01download.pdf': 'Spencerian Practice Sheets, The Fozzy Book',
}


class InkSource:
    def __init__(self, folder, original=None):
        self.folder = folder
        self.documents = {}
        self.cache = {}
        self.original = fitz.open(original) if original else None

    def get(self, filename, number):
        key = (filename, number)
        if key in self.cache:
            return self.cache[key]
        if filename == 'New Spencerian Compendium_text.pdf':
            cache_file = ROOT / 'tools/source-pages' / f'compendium-{number:03d}.jpg'
            if not cache_file.exists() and self.original:
                page = self.original[number]  # Extra FreshView opening page.
                entry = page.get_images(full=True)[0]
                original = self.original.extract_image(entry[0])['image']
                cache_file.parent.mkdir(parents=True, exist_ok=True)
                cache_file.write_bytes(original)
            if cache_file.exists():
                gray = np.asarray(Image.open(cache_file).convert('L'))
                self.cache[key] = gray
                return gray
            raise ValueError('Compendium requires the verified pre-MRC page JPEGs or --original-compendium')
        if filename not in self.documents:
            self.documents[filename] = fitz.open(self.folder / filename)
        doc = self.documents[filename]
        page = doc[number - 1]
        masks = [i for i in page.get_images(full=True) if i[1]]
        if not masks:
            raise ValueError(f'{filename} page {number}: no isolated source ink layer')
        entry = max(masks, key=lambda i: i[2] * i[3])
        rects = page.get_image_rects(entry[0])
        if not any(abs(r.x0) < 1 and abs(r.y0) < 1 and
                   abs(r.width - page.rect.width) < 1 and
                   abs(r.height - page.rect.height) < 1 for r in rects):
            raise ValueError('Source mask does not cover the page: crop transform required')
        pix = fitz.Pixmap(doc, entry[1])
        ink = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width) > 127
        self.cache[key] = ink
        return ink


def extract_ink(source, spec):
    ink = source.get(spec['sourceFile'], spec['page'])
    h, w = ink.shape
    box = spec['crop']
    assert len(box) == 4 and all(0 <= v <= 1 for v in box)
    x0, y0, x1, y1 = [round(v * n) for v, n in zip(box, (w, h, w, h))]
    assert x1 > x0 and y1 > y0
    crop = ink[y0:y1, x0:x1].copy()
    grayscale = crop.dtype != np.bool_
    for exclusion in spec.get('excludeRects', []):
        ex0, ey0, ex1, ey1 = [round(v * n) for v, n in zip(exclusion, (w, h, w, h))]
        crop[max(0, ey0-y0):max(0, min(y1, ey1)-y0),
             max(0, ex0-x0):max(0, min(x1, ex1)-x0)] = 255 if grayscale else False
    if spec.get('repairLines'):
        assert not grayscale, 'Reviewed gap repairs are expressed in source mask pixels'
        repaired = Image.fromarray(crop)
        draw = ImageDraw.Draw(repaired)
        for repair in spec['repairLines']:
            points = [(round(x*w)-x0, round(y*h)-y0) for x,y in repair['points']]
            draw.line(points, fill=1, width=repair['width'])
        crop = np.asarray(repaired).copy()
    if grayscale:
        # The exact earlier JPEG scan retains hairlines lost in the later PDF.
        # Separate ink from paper illumination before tracing. Enlarging here
        # provides sub-pixel contour interpolation, not new source detail.
        im = Image.fromarray(crop).resize((crop.shape[1]*4, crop.shape[0]*4), Image.Resampling.LANCZOS)
        a = np.asarray(im, dtype=float)
        background = ndimage.gaussian_filter(ndimage.maximum_filter(a, size=25), sigma=10)
        crop = a / np.maximum(background, 1) < spec.get('threshold', .84)
    # Retain small detached dots and punctuation, while discarding scan specks.
    labels, count = ndimage.label(crop, structure=np.ones((3, 3)))
    counts = np.bincount(labels.ravel())
    keep = counts >= spec.get('minArea', 24 if grayscale else 4)
    keep[0] = False
    if spec.get('keepLargest'):
        keep[:] = False
        keep[1 + np.argmax(counts[1:])] = True
    if spec.get('removeBoundaryComponents'):
        boundary = np.unique(np.concatenate((labels[0], labels[-1], labels[:,0], labels[:,-1])))
        keep[boundary] = False
    crop = keep[labels]
    # Close one-pixel pinholes from the bilevel scan without thickening strokes.
    crop = np.pad(crop, 6)
    crop = ndimage.binary_closing(crop, structure=ndimage.generate_binary_structure(2, 1),
                                  iterations=2 if grayscale else 1)
    if grayscale:
        crop = ndimage.gaussian_filter(crop.astype(float), sigma=1) >= .45
    if spec.get('postSmooth'):
        smooth = spec['postSmooth']
        crop = ndimage.gaussian_filter(crop.astype(float), sigma=smooth['sigma'],
                                      mode='constant') >= smooth['threshold']
        if spec.get('fillVerifiedPinholes'):
            holes = ndimage.binary_fill_holes(crop) & ~crop
            labels, _ = ndimage.label(holes)
            small = np.bincount(labels.ravel()) <= 1
            small[0] = False
            crop |= small[labels]
    assert crop.any(), spec
    ys, xs = np.where(crop)
    crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    padding = max(24, round(min(crop.shape) * .075))
    return np.pad(crop, padding), {'originalPixels': [w, h], 'cropPixels': [x0, y0, x1, y1],
                                  'inkPixels': int(crop.sum()), 'padding': padding}


def trace(source, spec, target):
    if spec.get('vectorOverride'):
        original = ROOT / 'tools/source-tracings' / spec['vectorOverride']
        tree = ET.parse(original)
        root = tree.getroot()
        width, height = (round(float(root.get(key))) for key in ('width', 'height'))
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(original.read_bytes())
        return width, height, {'reconstruction': spec.get('reproduction', 'Source-traced study'),
                              'vectorSource': str(original.relative_to(ROOT)),
                              'svgBytes': target.stat().st_size,
                              'svgSha256': hashlib.sha256(target.read_bytes()).hexdigest()}
    ink, audit = extract_ink(source, spec)
    h, w = ink.shape
    with tempfile.TemporaryDirectory() as tmp:
        pbm, svg = Path(tmp) / 'ink.pbm', Path(tmp) / 'ink.svg'
        Image.fromarray(np.where(ink, 0, 255).astype('uint8')).convert('1').save(pbm)
        subprocess.run(['potrace', str(pbm), '--svg', '--output', str(svg),
                        '--turdsize', '0', '--alphamax', '1', '--opttolerance',
                        str(spec.get('traceTolerance', .2))], check=True)
        tree = ET.parse(svg)
        root = tree.getroot()
        ns = '{http://www.w3.org/2000/svg}'
        root.set('width', str(w)); root.set('height', str(h))
        root.set('viewBox', f'0 0 {w} {h}')
        for el in list(root):
            if el.tag.endswith('metadata'):
                root.remove(el)
        title = ET.Element(ns + 'title'); title.text = spec['title']; root.insert(0, title)
        white = ET.Element(ns + 'rect', {'width': str(w), 'height': str(h), 'fill': '#fff'})
        root.insert(1, white)
        for group in root.iter(ns + 'g'):
            if 'fill' in group.attrib:
                group.set('fill', '#20362d')
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        target.parent.mkdir(parents=True, exist_ok=True)
        tree.write(target, encoding='utf-8', xml_declaration=True)
    audit['svgBytes'] = target.stat().st_size
    audit['svgSha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
    return w, h, audit


def trace_montage(source, spec, target):
    ns = '{http://www.w3.org/2000/svg}'
    parts = spec['parts']
    cols = min(2, len(parts))
    cell_w, cell_h = 420, 320
    width, height = cols * cell_w, math.ceil(len(parts) / cols) * cell_h
    root = ET.Element(ns+'svg', {'width': str(width), 'height': str(height),
                                'viewBox': f'0 0 {width} {height}'})
    ET.SubElement(root, ns+'title').text = spec['title']
    ET.SubElement(root, ns+'rect', {'width':'100%', 'height':'100%', 'fill':'#fff'})
    audits, panels = [], []
    for i, part in enumerate(parts):
        child_path = target.with_name(target.stem + f'-part{i+1}.svg')
        w, h, audit = trace(source, part, child_path)
        x, y = (i % cols) * cell_w, (i // cols) * cell_h
        group = ET.SubElement(root, ns+'g', {'transform': f'translate({x},{y})'})
        child = ET.parse(child_path).getroot()
        child.set('x', '16'); child.set('y', '50')
        child.set('width', str(cell_w-32)); child.set('height', str(cell_h-66))
        group.append(copy.deepcopy(child))
        label = ET.SubElement(group, ns+'text', {'x':str(cell_w/2), 'y':'35',
                             'text-anchor':'middle', 'font-family':'sans-serif',
                             'font-size':'23', 'fill':'#20362d'})
        label.text = part['title']
        audits.append(audit)
        panels.append({'file':str(child_path.relative_to(ASSETS)), 'title':part['title'],
                       'width':w, 'height':h})
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    ET.ElementTree(root).write(target, encoding='utf-8', xml_declaration=True)
    return width, height, {'parts':audits, 'svgBytes':target.stat().st_size}, panels


def slant_diagram(target):
    angle = math.radians(52)
    dx, dy = 480 * math.cos(angle), 480 * math.sin(angle)
    arc_x, arc_y = 160 + 100 * math.cos(angle), 440 - 100 * math.sin(angle)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" width="900" height="560">
<title>The 52 degree Spencerian main slant, measured from the baseline</title>
<rect width="900" height="560" fill="#fff"/>
<g stroke-linecap="round" fill="none">
<path d="M 90 440 H 810" stroke="#68776d" stroke-width="2.5"/>
<path d="M 160 440 V 62" stroke="#a9b4ab" stroke-width="2" stroke-dasharray="9 10"/>
<path d="M 160 440 L {160+dx:.6f} {440-dy:.6f} M 370 440 L {370+dx:.6f} {440-dy:.6f}" stroke="#20362d" stroke-width="4"/>
<path d="M 260 440 A 100 100 0 0 0 {arc_x:.6f} {arc_y:.6f}" stroke="#876733" stroke-width="3"/>
</g><g font-family="sans-serif" fill="#20362d">
<text x="276" y="398" font-size="40">52°</text>
<text x="605" y="482" font-size="27">Baseline · 0°</text>
<text x="138" y="42" font-size="25">90°</text>
<text x="450" y="535" text-anchor="middle" font-size="28">52° from the baseline</text>
</g></svg>'''
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(svg)
    return 900, 560, {'reconstruction':'Exact 52 degree geometry based on the cited source diagram',
                       'angleDegrees':52, 'svgBytes':target.stat().st_size}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf-dir', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, default=ROOT / 'tools/lesson-examples.json')
    parser.add_argument('--only', help='Render one lesson ID for inspection')
    parser.add_argument('--original-compendium', type=Path, help='Verified earlier PDF with the same 175 page images')
    args = parser.parse_args()
    source = InkSource(args.pdf_dir, args.original_compendium)
    rows = json.loads(args.manifest.read_text())
    examples, mapping, audits = [], {}, []
    for row in rows:
        if args.only and row['lessonId'] != args.only:
            continue
        lesson = row['lessonId']
        num = len(mapping.setdefault(lesson, [])) + 1
        eid = f'{lesson}-{num}'
        filename = f'examples/{eid}.svg'
        panels = []
        if row.get('diagram') == 'slant-52':
            width, height, audit = slant_diagram(ASSETS / filename)
        elif row.get('parts'):
            width, height, audit, panels = trace_montage(source, row, ASSETS / filename)
        else:
            width, height, audit = trace(source, row, ASSETS / filename)
        examples.append(dict(id=eid, title=row['title'], transcription=row.get('transcription', ''),
                             focus=row['focus'], sourceFile=row['sourceFile'],
                             source=('Redrawn from ' if row.get('vectorOverride') else '') + SOURCES[row['sourceFile']], physicalPage=row['page'],
                             printedPage=row.get('printedPage', ''), file=filename,
                             sourcePages=row.get('sourcePages', [row['page']]),
                             width=width, height=height,
                             **({'panels':panels} if panels else {})))
        mapping[lesson].append(eid)
        audits.append(dict(id=eid, **audit))
        print(eid, width, height, flush=True)
    if not args.only:
        atlas_path = ASSETS / 'atlas.json'
        atlas = json.loads(atlas_path.read_text())
        atlas['version'] = 2
        atlas['examples'] = examples
        atlas['lessonExamples'] = mapping
        lookup = {p['id']:p for p in examples}
        collections = json.loads((ROOT/'tools/atlas-collections.json').read_text())
        atlas['plates'] = []
        for group in collections:
            ids = list(dict.fromkeys(eid for lid in group['lessonIds'] for eid in mapping[lid]))
            first = lookup[ids[0]]
            atlas['plates'].append(dict(id=group['id'], title=group['title'],
                 description=group['description'], category=group['category'],
                 exampleIds=ids, file=first['file'], width=first['width'], height=first['height'],
                 source='Selected models from the supplied Spencerian books',
                 sourceFile=first['sourceFile'], physicalPage=first['physicalPage'], glyphs=[]))
        atlas_path.write_text(json.dumps(atlas, indent=2, ensure_ascii=False) + '\n')
        (ROOT / 'docs/example-artwork-audit.json').write_text(json.dumps(audits, indent=2) + '\n')
        if (ROOT/'tools/reference-style.json').exists():
            from register_reference_style import register
            register()
        if (ROOT/'tools/ornamental-style.json').exists():
            from apply_ornamental_style import apply
            apply()


if __name__ == '__main__':
    main()
