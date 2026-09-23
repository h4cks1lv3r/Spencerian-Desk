"""Add reviewed clean models from the user's chosen photo to the existing atlas.

Run after build_examples.py. Reference SVG inputs are already reviewed paths;
this command copies them unchanged and adds lesson associations and a style brief.
"""
from pathlib import Path
import json,shutil,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'app/src/main/assets'
MANIFEST=ROOT/'tools/reference-style.json'

def register():
    config=json.loads(MANIFEST.read_text())
    path=ASSETS/'atlas.json';atlas=json.loads(path.read_text())
    models=[]
    for item in config['examples']:
        source=ROOT/'tools/source-tracings'/item['vectorFile']
        svg=ET.parse(source).getroot()
        width,height=(round(float(svg.get(key))) for key in ('width','height'))
        file='examples/'+item['id']+'.svg'
        shutil.copy2(source,ASSETS/file)
        models.append({k:v for k,v in item.items() if k not in ['vectorFile','crop','method']}|{'file':file,'width':width,'height':height,'sourceKind':'image','sourceFile':'Screenshot_20260816_230008_Firefox.jpg','source':'User-selected handwriting reference','sourceDetail':'Capital study reconstructed from the supplied photograph'})
    ids={x['id'] for x in models}
    atlas['examples']=[x for x in atlas['examples'] if x['id'] not in ids]+models
    for lid,mapping in config['lessonModels'].items():
        old=[x for x in atlas['lessonExamples'][lid] if x not in ids]
        atlas['lessonExamples'][lid]=(mapping+old if lid!='r01' else old+mapping)
    first=models[0];collection={'id':config['style']['collectionId'],'title':'Capitals from your chosen reference','description':'Four focused studies preserve the open capital ovals, tapered shades, and long return curves in your chosen photograph. Pair them with the course’s lowercase and word models, then apply the same balance to your own writing.','category':'flourishes','exampleIds':[x['id'] for x in models],'file':first['file'],'width':first['width'],'height':first['height'],'sourceKind':'image','source':first['source'],'sourceFile':first['sourceFile'],'glyphs':[]}
    atlas['plates']=[x for x in atlas['plates'] if x['id']!=collection['id']]+[collection]
    atlas['styleReference']=config['style']
    atlas['version']=3
    path.write_text(json.dumps(atlas,indent=2,ensure_ascii=False)+'\n')
    print(f"Registered {len(models)} chosen-reference models; {len(atlas['examples'])} models total.")

if __name__=='__main__':register()
