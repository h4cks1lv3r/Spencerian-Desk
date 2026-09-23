"""Register the reviewed ornamental model set and source-lettering pack.
Run after build_examples.py. Reviewed SVGs are the authoritative inputs.
"""
from pathlib import Path
import json,shutil,string
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'app/src/main/assets'
def write_glyph_pack():
 """Regenerate the browser pack from the reviewed portable JSON input."""
 pack_path=ROOT/'tools/ornamental-glyphs.json'
 pack=json.loads(pack_path.read_text())
 expected=set(string.ascii_lowercase+string.ascii_uppercase)
 if set(pack.get('glyphs',{}))!=expected:
  raise ValueError('The reviewed ornamental pack must contain all 52 Latin letters.')
 if not isinstance(pack.get('sourceSlant'),(int,float)):
  raise ValueError('The glyph pack must declare its source slant.')
 payload=json.dumps(pack,ensure_ascii=False,separators=(',',':'))
 (ASSETS/'zaner-glyphs.js').write_text('/* Generated from tools/ornamental-glyphs.json; reviewed source letter shapes. */\nwindow.ZanerGlyphs='+payload+';\n')
 return len(expected)

def apply():
 config=json.loads((ROOT/'tools/ornamental-style.json').read_text())
 p=ASSETS/'atlas.json';atlas=json.loads(p.read_text());models={m['id']:m for m in config['models']}
 for m in models.values():shutil.copy2(ROOT/'tools/style-specimens'/Path(m['file']).name,ASSETS/m['file'])
 atlas['examples']=[models.get(e['id'],e) for e in atlas['examples']]
 lookup={e['id']:e for e in atlas['examples']}
 for plate in atlas['plates']:
  first=lookup[plate['exampleIds'][0]]
  for key in ['file','width','height','source','sourceFile','physicalPage','sourceKind']:
   if key in first:plate[key]=first[key]
   else:plate.pop(key,None)
 atlas['specimenStyle']={k:v for k,v in config.items() if k!='models'}
 atlas['version']=4
 p.write_text(json.dumps(atlas,indent=2,ensure_ascii=False)+'\n')
 glyph_count=write_glyph_pack()
 print(f'Registered {len(models)} ornamental-style specimens and {glyph_count} source glyphs.')
if __name__=='__main__':apply()
